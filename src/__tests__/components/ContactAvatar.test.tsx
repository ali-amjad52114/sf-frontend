import { fireEvent, render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";

describe("ContactAvatar", () => {
  const contact = {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    photo: "data:image/png;base64,YWRh",
  };

  it("shows the persisted photo in a circular crop", () => {
    const { container } = render(<ContactAvatar contact={contact} />);
    const image = container.querySelector("img");

    expect(image).toHaveAttribute("src", contact.photo);
    expect(image).toHaveClass("rounded-full", "object-cover");
  });

  it("falls back to initials when the photo cannot load", () => {
    const { container } = render(<ContactAvatar contact={contact} />);

    fireEvent.error(container.querySelector("img")!);

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("uses initials when a contact has no photo", () => {
    render(<ContactAvatar contact={{ ...contact, photo: null }} />);

    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
