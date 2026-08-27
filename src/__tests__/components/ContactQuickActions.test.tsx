import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactQuickActions from "@/components/contacts/ContactQuickActions";

const writeText = jest.fn<Promise<void>, [string]>();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

function renderActions(phone: string | null = "+1-415-555-0101") {
  return render(
    <ContactQuickActions email="ada@example.com" phone={phone} />,
  );
}

describe("ContactQuickActions", () => {
  it("offers email and call actions with their contact links", () => {
    renderActions();

    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:ada@example.com",
    );
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute(
      "href",
      "tel:+1-415-555-0101",
    );
  });

  it("does not offer Call when the contact has no phone number", () => {
    renderActions("   ");

    expect(screen.queryByRole("link", { name: "Call" })).not.toBeInTheDocument();
  });

  it("copies the email and announces success", async () => {
    renderActions();

    await userEvent.click(screen.getByRole("button", { name: "Copy email" }));

    expect(writeText).toHaveBeenCalledWith("ada@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Email copied to clipboard.",
    );
  });

  it("announces a copy failure accessibly", async () => {
    writeText.mockRejectedValue(new Error("permission denied"));
    renderActions();

    await userEvent.click(screen.getByRole("button", { name: "Copy email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not copy email. Select and copy it manually.",
    );
  });
});
