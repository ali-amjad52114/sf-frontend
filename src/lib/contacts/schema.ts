import { z } from "zod";
import {
  ADDRESS_TYPES,
  type AddressErrors,
  type ContactAddress,
  type ContactFormValues,
  type ContactInput,
} from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

const contactAddressSchema = z.object({
  type: z.enum(ADDRESS_TYPES, {
    error: "Choose Home, Work, or Other",
  }),
  address: optionalText(300, "Street address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State / region"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
}) satisfies z.ZodType<ContactAddress, unknown>;

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  address: optionalText(300, "Address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
  addresses: z.array(contactAddressSchema).default([]),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactInput, string>> {
  const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      key !== "addresses" &&
      !(key in fieldErrors)
    ) {
      fieldErrors[key as keyof ContactInput] = issue.message;
    }
  }
  return fieldErrors;
}

/**
 * Like `zodFieldErrors`, but retains the array index necessary to annotate an
 * individual address row.
 */
export function zodAddressFieldErrors(error: z.ZodError): AddressErrors {
  const addressErrors: AddressErrors = {};
  for (const issue of error.issues) {
    const [root, index, field] = issue.path;
    if (
      root === "addresses" &&
      typeof index === "number" &&
      typeof field === "string"
    ) {
      const row = (addressErrors[index] ??= {});
      if (!(field in row)) {
        row[field as keyof ContactAddress] = issue.message;
      }
    }
  }
  return addressErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: Exclude<keyof ContactInput, "addresses">;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface AddressFieldSpec extends Omit<ContactFieldSpec, "name"> {
  name: Exclude<keyof ContactAddress, "type">;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** Legacy address inputs are still included in every mutation for compatibility. */
export const LEGACY_ADDRESS_FIELDS: AddressFieldSpec[] = [
  {
    name: "address",
    label: "Street address",
    maxLength: 300,
    placeholder: "1 Market St, Suite 400",
    autoComplete: "street-address",
    wide: true,
  },
  {
    name: "city",
    label: "City",
    maxLength: 120,
    placeholder: "San Francisco",
    autoComplete: "address-level2",
  },
  {
    name: "state",
    label: "State / region",
    maxLength: 120,
    placeholder: "CA",
    autoComplete: "address-level1",
  },
  {
    name: "postal_code",
    label: "Postal code",
    maxLength: 20,
    placeholder: "94105",
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country",
    maxLength: 120,
    placeholder: "USA",
    autoComplete: "country-name",
  },
];

/** Address fields rendered inside each dynamic `addresses[]` row. */
export const ADDRESS_FIELDS = LEGACY_ADDRESS_FIELDS;

const MUTATION_FIELDS = [...CONTACT_FIELDS, ...LEGACY_ADDRESS_FIELDS];

const ADDRESS_FORM_NAME = /^addresses\[(\d+)\]\[(type|address|city|state|postal_code|country)\]$/;

function addressValuesFromFormData(formData: FormData) {
  const rows = new Map<number, NonNullable<ContactFormValues["addresses"]>[number]>();

  for (const [name, value] of formData.entries()) {
    const match = ADDRESS_FORM_NAME.exec(name);
    if (!match) continue;

    const index = Number(match[1]);
    const field = match[2] as keyof NonNullable<ContactFormValues["addresses"]>[number];
    const row = rows.get(index) ?? {};
    row[field] = String(value);
    rows.set(index, row);
  }

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, row]) => row)
    // An unused row should not create a meaningless `{ type: "Home" }`
    // address. A row with any location component is preserved, including a
    // city-only legacy address that was valid before this UI existed.
    .filter((row) =>
      [row.address, row.city, row.state, row.postal_code, row.country].some(
        (value) => Boolean(value?.trim()),
      ),
    );
}

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(formData: FormData): ContactFormValues {
  const values = Object.fromEntries(
    MUTATION_FIELDS.map((field) => [
      field.name,
      String(formData.get(field.name) ?? ""),
    ]),
  ) as ContactFormValues;
  const addresses = addressValuesFromFormData(formData);

  // New API clients receive the full array. The first address is also mirrored
  // onto the former flat fields, so existing contacts/API deployments retain a
  // useful primary address during the transition.
  const primary = addresses[0];
  if (primary) {
    values.address = primary.address ?? "";
    values.city = primary.city ?? "";
    values.state = primary.state ?? "";
    values.postal_code = primary.postal_code ?? "";
    values.country = primary.country ?? "";
  }

  return { ...values, addresses };
}
