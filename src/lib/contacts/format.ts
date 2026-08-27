import type { Contact, ContactAddress, ContactAddressFormValues } from "./types";

/** Presentation helpers shared by the list, the detail page, and the cards. */

/** Up to two letters for the avatar bubble. */
export function initials(contact: Pick<Contact, "first_name" | "last_name">) {
  return `${contact.first_name.at(0) ?? ""}${contact.last_name.at(0) ?? ""}`
    .toUpperCase()
    .trim();
}

/**
 * Stable hue per contact so the same person keeps the same avatar colour
 * across renders and machines (no randomness, no hydration mismatch).
 */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

// Rendered on the server and hydrated on the client, so pin the locale and zone
// rather than letting each side pick its own and mismatch.
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${TIMESTAMP_FORMAT.format(date)} UTC`;
}

/** "Ada Lovelace · Mathematician at Analytical Engines"-style subtitle. */
export function jobLine(contact: Contact): string | null {
  if (contact.job_title && contact.company) {
    return `${contact.job_title} at ${contact.company}`;
  }
  return contact.job_title ?? contact.company ?? null;
}

/** Single-line postal address, skipping the parts that are not filled in. */
export function addressLine(contact: Contact): string | null {
  const parts = [
    contact.address,
    contact.city,
    [contact.state, contact.postal_code].filter(Boolean).join(" "),
    contact.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.length ? parts.join(", ") : null;
}

/** Format one member of `addresses[]`, omitting empty optional components. */
export function addressLineFor(address: ContactAddress): string | null {
  const parts = [
    address.address,
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(" "),
    address.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.length ? parts.join(", ") : null;
}

/**
 * Prefer the multi-address API field. Contacts returned by the pre-migration
 * API have no `addresses` key, so expose their flat values as a single Home
 * row to keep them editable in the new UI.
 */
export function contactAddresses(contact: Contact): ContactAddress[] {
  // An empty array is authoritative: the contact has no addresses. Only an
  // omitted field belongs to a pre-migration response and may use the legacy
  // flat-address fallback.
  if (contact.addresses !== undefined) return contact.addresses;
  if (!addressLine(contact)) return [];

  return [
    {
      type: "Home",
      address: contact.address,
      city: contact.city,
      state: contact.state,
      postal_code: contact.postal_code,
      country: contact.country,
    },
  ];
}

/** Shape an address for uncontrolled form inputs, converting null to blanks. */
export function addressFormValues(
  address: ContactAddress,
): Required<ContactAddressFormValues> {
  return {
    type: address.type,
    address: address.address ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    postal_code: address.postal_code ?? "",
    country: address.country ?? "",
  };
}
