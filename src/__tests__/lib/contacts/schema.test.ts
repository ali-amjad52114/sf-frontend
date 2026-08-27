import {
  CONTACT_FIELDS,
  LEGACY_ADDRESS_FIELDS,
  contactInputSchema,
  formDataToValues,
  zodAddressFieldErrors,
  zodFieldErrors,
} from "@/lib/contacts/schema";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    notes: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101), postal_code: "9".repeat(21) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      postal_code: "Postal code must be 20 characters or fewer",
    });
  });

  it("normalizes every address in the planned addresses array", () => {
    const parsed = contactInputSchema.parse({
      ...values(),
      addresses: [
        {
          type: "Work",
          address: "  1 Market St  ",
          city: " San Francisco ",
          state: "CA",
          postal_code: "94105",
          country: " ",
        },
      ],
    });

    expect(parsed.addresses).toEqual([
      {
        type: "Work",
        address: "1 Market St",
        city: "San Francisco",
        state: "CA",
        postal_code: "94105",
        country: null,
      },
    ]);
  });

  it("reports address validation against the row and field", () => {
    const result = contactInputSchema.safeParse({
      ...values(),
      addresses: [
        {
          type: "Home",
          address: "a".repeat(301),
          city: "",
          state: "",
          postal_code: "",
          country: "",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(zodAddressFieldErrors(result.error!)).toEqual({
      0: { address: "Street address must be 300 characters or fewer" },
    });
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("addresses[0][type]", "Work");
    formData.set("addresses[0][address]", "1 Main St");
    formData.set("addresses[0][city]", "London");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(extracted.addresses).toEqual([
      { type: "Work", address: "1 Main St", city: "London" },
    ]);
    // The first dynamic address keeps legacy API consumers working as well.
    expect(extracted.address).toBe("1 Main St");
    expect(Object.keys(extracted).sort()).toEqual(
      [
        ...CONTACT_FIELDS.map((field) => field.name),
        ...LEGACY_ADDRESS_FIELDS.map((field) => field.name),
        "addresses",
      ].sort(),
    );
  });
});
