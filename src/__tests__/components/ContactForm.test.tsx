import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/components/contacts/ContactForm";
import { makeContact } from "../mocks/handlers";
import type { FormState } from "@/lib/contacts/types";

function renderForm(action: jest.Mock, contact?: ReturnType<typeof makeContact>) {
  return render(
    <ContactForm
      action={action as never}
      contact={contact}
      submitLabel="Create contact"
      cancelHref="/contacts"
    />,
  );
}

class DeferredFileReader {
  static instances: DeferredFileReader[] = [];

  result: string | ArrayBuffer | null = null;
  private readonly listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  readAsDataURL() {
    DeferredFileReader.instances.push(this);
  }

  abort() {
    this.listeners.get("abort")?.forEach((listener) => listener());
  }

  finish(result: string) {
    this.result = result;
    this.listeners.get("load")?.forEach((listener) => listener());
  }
}

describe("ContactForm", () => {
  it("renders every editable field", () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
    expect(screen.getByLabelText(/notes/i).tagName).toBe("TEXTAREA");
  });

  it("prefills from an existing contact", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("ada@example.com");
    // Nulls become empty inputs rather than the string "null".
    expect(screen.getByLabelText(/street address/i)).toHaveValue("");
  });

  it("previews and submits an existing photo without requiring a replacement", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    const photo = "data:image/png;base64,YWRh";
    renderForm(action, makeContact({ photo }));

    expect(screen.getByRole("img", { name: /selected contact photo/i })).toHaveAttribute(
      "src",
      photo,
    );

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get("photo")).toBe(photo);
  });

  it("reads an uploaded image into the form payload and preview", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);
    const input = screen.getByLabelText(/upload photo/i);
    const photo = new File(["avatar"], "avatar.png", { type: "image/png" });

    await userEvent.upload(input, photo);

    const preview = await screen.findByRole("img", {
      name: /selected contact photo/i,
    });
    expect(preview.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
    expect(
      screen.getByDisplayValue(preview.getAttribute("src") ?? ""),
    ).toHaveAttribute("name", "photo");

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get("photo")).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("waits for the latest photo read before submitting", async () => {
    const nativeFileReader = globalThis.FileReader;
    DeferredFileReader.instances = [];
    globalThis.FileReader = DeferredFileReader as unknown as typeof FileReader;

    try {
      renderForm(jest.fn());
      const input = screen.getByLabelText(/upload photo/i);
      const submit = screen.getByRole("button", { name: /create contact/i });

      await userEvent.upload(
        input,
        new File(["first"], "first.png", { type: "image/png" }),
      );
      const firstReader = DeferredFileReader.instances[0];
      expect(submit).toBeDisabled();
      expect(submit).toHaveTextContent("Processing photo…");

      await userEvent.upload(
        input,
        new File(["second"], "second.png", { type: "image/png" }),
      );
      const secondReader = DeferredFileReader.instances[1];

      act(() => firstReader.finish("data:image/png;base64,Zmlyc3Q="));
      act(() => secondReader.finish("data:image/png;base64,c2Vjb25k"));

      await waitFor(() => expect(submit).toBeEnabled());
      expect(screen.getByRole("img", { name: /selected contact photo/i })).toHaveAttribute(
        "src",
        "data:image/png;base64,c2Vjb25k",
      );
    } finally {
      globalThis.FileReader = nativeFileReader;
    }
  });

  it("cancels a pending replacement when the user removes the current photo", async () => {
    const nativeFileReader = globalThis.FileReader;
    DeferredFileReader.instances = [];
    globalThis.FileReader = DeferredFileReader as unknown as typeof FileReader;

    try {
      renderForm(jest.fn(), makeContact({ photo: "data:image/png;base64,YWRh" }));
      const input = screen.getByLabelText(/replace photo/i);

      await userEvent.upload(
        input,
        new File(["replacement"], "replacement.png", { type: "image/png" }),
      );
      const reader = DeferredFileReader.instances[0];
      await userEvent.click(screen.getByRole("button", { name: /remove photo/i }));
      act(() => reader.finish("data:image/png;base64,cmVwbGFjZW1lbnQ="));

      expect(screen.queryByRole("img", { name: /selected contact photo/i })).toBeNull();
      expect(input).toHaveValue("");
    } finally {
      globalThis.FileReader = nativeFileReader;
    }
  });

  it("submits the entered values to the action", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.type(screen.getByLabelText(/first name/i), "Grace");
    await userEvent.type(screen.getByLabelText(/last name/i), "Hopper");
    await userEvent.type(screen.getByLabelText(/^email/i), "grace@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.get("first_name")).toBe("Grace");
    expect(formData.get("email")).toBe("grace@example.com");
  });

  it("shows the summary and the per-field errors the action returns", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "That email address is already taken.",
        fieldErrors: { email: "This email is already in use." },
        values: { first_name: "Grace" },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        "That email address is already taken.",
        "This email is already in use.",
      ]),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("links back out without submitting", () => {
    renderForm(jest.fn());
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
  });
});
