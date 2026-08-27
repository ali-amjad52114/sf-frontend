import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("adds, labels, and removes dynamic address rows", async () => {
    const user = userEvent.setup();
    renderForm(jest.fn());

    await user.click(screen.getByRole("button", { name: /add address/i }));

    const types = screen.getAllByLabelText("Address type");
    expect(types).toHaveLength(1);
    expect(types[0]).toHaveValue("Home");
    await user.selectOptions(types[0], "Work");
    expect(types[0]).toHaveValue("Work");

    await user.click(screen.getByRole("button", { name: /add address/i }));
    expect(screen.getAllByLabelText("Address type")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remove address 1" }));
    expect(screen.getAllByLabelText("Address type")).toHaveLength(1);
  });

  it("submits addresses as indexed array fields", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    const user = userEvent.setup();
    renderForm(action);

    await user.click(screen.getByRole("button", { name: /add address/i }));
    await user.selectOptions(screen.getByLabelText("Address type"), "Other");
    await user.type(screen.getByLabelText(/street address/i), "PO Box 9");
    await user.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const formData = action.mock.calls[0][1];
    expect(formData.get("addresses[0][type]")).toBe("Other");
    expect(formData.get("addresses[0][address]")).toBe("PO Box 9");
  });

  it("restores address rows and their field errors after a failed submission", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Please fix the highlighted fields.",
        values: {
          addresses: [
            {
              type: "Work",
              address: "",
              city: "London",
              state: "",
              postal_code: "",
              country: "UK",
            },
          ],
        },
        addressErrors: { 0: { address: "Street address is too short." } },
      }),
    );
    const user = userEvent.setup();
    renderForm(action);

    await user.click(screen.getByRole("button", { name: /create contact/i }));

    expect(await screen.findByLabelText("Address type")).toHaveValue("Work");
    expect(screen.getByLabelText(/street address/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Street address is too short.")).toBeVisible();
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
