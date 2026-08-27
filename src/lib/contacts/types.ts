/**
 * Types mirroring the Contacts API OpenAPI 3.1 document (`GET /openapi.json`).
 * Field names stay snake_case so payloads map 1:1 onto the wire format.
 */

/** `ContactRead` — a stored contact, as returned by every contact endpoint. */
/** Backend wire values; display labels intentionally use these same friendly names. */
export const ADDRESS_TYPES = ["Home", "Work", "Other"] as const;

/** Values accepted by an address's `type` field on the API. */
export type AddressType = (typeof ADDRESS_TYPES)[number];

/** One member of the API's `Contact.addresses` array. */
export interface ContactAddress {
  type: AddressType;
  /** Street address; this intentionally matches the legacy flat `address` field. */
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

/**
 * Unvalidated address values echoed back to the browser after a failed form
 * submission. `type` remains a string here so an invalid submitted option can
 * be rendered again and receive a field-level error.
 */
export interface ContactAddressFormValues {
  type?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export type AddressFieldErrors = Partial<
  Record<keyof ContactAddress, string>
>;
export type AddressErrors = Partial<Record<number, AddressFieldErrors>>;

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  /**
   * Optional while clients transition from the legacy flat address fields.
   * The planned API returns an array (possibly empty); older API deployments
   * omit this key altogether.
   */
  addresses?: ContactAddress[];
  /** A persisted base64 image data URI created by the form's local file picker. */
  photo: string | null;
  created_at: string;
  updated_at: string;
  full_name: string;
}

/** Every editable field, i.e. `ContactCreate` / `ContactReplace`. */
export interface ContactInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  /** Legacy flat address fields, retained for existing contacts/API versions. */
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  /** The planned multi-address API field. */
  addresses: ContactAddress[];
  /** A persisted base64 image data URI created by the form's local file picker. */
  photo: string | null;
}

/** `ContactPage` — one page of contacts plus the totals needed to paginate. */
export interface ContactPage {
  items: Contact[];
  total: number;
  limit: number;
  offset: number;
}

/** `HealthResponse` — result of the liveness probe. */
export interface HealthResponse {
  status: string;
  database: string;
  contacts: number;
}

/** Sort fields the API's allow-list accepts. */
export const SORT_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "company",
  "created_at",
  "updated_at",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

/** Bounds the API enforces on `limit`. */
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 200;
export const DEFAULT_PER_PAGE = 25;
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Result of a server action, consumed by `useActionState` in the forms.
 * Lives here (not in the `"use server"` module) so client components can import
 * the type without pulling server code into the browser bundle.
 */
export type FormState = {
  status: "idle" | "error";
  /** Message shown above the form; used for API-level failures. */
  message?: string;
  /** Per-field messages keyed by input name. */
  fieldErrors?: Partial<Record<keyof ContactInput, string>>;
  /** Per-address messages, keyed by submitted row index then field name. */
  addressErrors?: AddressErrors;
  /** Echo of the submitted values so the form survives a failed round trip. */
  values?: ContactFormValues;
};

/** Raw form fields, before `contactInputSchema` trims/nulls/coerces them. */
export type ContactFormValues = Partial<
  Record<Exclude<keyof ContactInput, "addresses">, string>
> & {
  addresses?: ContactAddressFormValues[];
};

export const EMPTY_FORM_STATE: FormState = { status: "idle" };
