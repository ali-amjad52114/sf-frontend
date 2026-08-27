"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import { ADDRESS_FIELDS, CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import { addressFormValues, contactAddresses } from "@/lib/contacts/format";
import {
  ADDRESS_TYPES,
  EMPTY_FORM_STATE,
  type Contact,
  type ContactAddressFormValues,
  type ContactInput,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

type AddressRow = {
  id: number;
  values: ContactAddressFormValues;
};

const EMPTY_ADDRESS: ContactAddressFormValues = {
  type: "Home",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

function addressRowsFor(values: ContactAddressFormValues[]): AddressRow[] {
  return values.map((values, index) => ({
    id: index,
    values,
  }));
}

function AddressError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-destructive">
      {message}
    </p>
  ) : null;
}

function AddressFields({
  initialValues,
  addressErrors,
}: {
  initialValues: ContactAddressFormValues[];
  addressErrors: FormState["addressErrors"];
}) {
  const [addresses, setAddresses] = useState<AddressRow[]>(() =>
    addressRowsFor(initialValues),
  );
  const nextAddressId = useRef(addresses.length);

  function addAddress() {
    setAddresses((rows) => [
      ...rows,
      { id: nextAddressId.current++, values: EMPTY_ADDRESS },
    ]);
  }

  function removeAddress(id: number) {
    setAddresses((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Addresses</legend>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            Addresses
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Add as many postal addresses as needed.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addAddress}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add address
        </Button>
      </div>

      {addresses.length ? (
        <div className="space-y-4">
          {addresses.map((row, index) => {
            // Failed submissions key errors by the original row index. That
            // index is captured in the stable row id so deleting a preceding
            // row cannot move an existing error to a different address.
            const errors = addressErrors?.[row.id];
            const fieldId = (name: string) => `address-${row.id}-${name}`;
            const fieldName = (name: string) => `addresses[${index}][${name}]`;

            return (
              <fieldset
                key={row.id}
                className="rounded-lg border border-border bg-card/50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <legend className="font-display text-sm font-medium text-foreground">
                    Address {index + 1}
                  </legend>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAddress(row.id)}
                    aria-label={`Remove address ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={fieldId("type")}
                      className="mb-1.5 block text-[13px] font-medium text-foreground"
                    >
                      Address type
                    </label>
                    <select
                      id={fieldId("type")}
                      name={fieldName("type")}
                      defaultValue={row.values.type ?? "Home"}
                      aria-invalid={errors?.type ? true : undefined}
                      aria-describedby={errors?.type ? `${fieldId("type")}-error` : undefined}
                      className={`w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground transition-colors focus:bg-input ${
                        errors?.type
                          ? "border-destructive focus:border-destructive"
                          : "border-border focus:border-primary"
                      }`}
                    >
                      {ADDRESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors?.type ? (
                      <AddressError
                        id={`${fieldId("type")}-error`}
                        message={errors.type}
                      />
                    ) : null}
                  </div>

                  {ADDRESS_FIELDS.map((field) => {
                    const error = errors?.[field.name];
                    const id = fieldId(field.name);
                    return (
                      <div
                        key={field.name}
                        className={field.wide ? "sm:col-span-2" : undefined}
                      >
                        <label
                          htmlFor={id}
                          className="mb-1.5 block text-[13px] font-medium text-foreground"
                        >
                          {field.label}
                          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                            optional
                          </span>
                        </label>
                        <input
                          id={id}
                          name={fieldName(field.name)}
                          type="text"
                          defaultValue={row.values[field.name] ?? ""}
                          maxLength={field.maxLength}
                          placeholder={field.placeholder}
                          autoComplete={field.autoComplete}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? `${id}-error` : undefined}
                          className={`w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:bg-input ${
                            error
                              ? "border-destructive focus:border-destructive"
                              : "border-border focus:border-primary"
                          }`}
                        />
                        {error ? (
                          <AddressError id={`${id}-error`} message={error} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No addresses added.</p>
      )}
    </fieldset>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const initialAddressValues =
    state.values?.addresses ??
    (contact ? contactAddresses(contact).map(addressFormValues) : []);
  const addressFieldsKey = state.values?.addresses
    ? `submitted-${JSON.stringify(state.values.addresses)}`
    : `contact-${contact?.id ?? "new"}`;

  function valueFor(name: keyof ContactInput): string {
    if (name === "addresses") return "";
    const stateValue = state.values?.[name];
    const contactValue = contact?.[name];
    return typeof stateValue === "string"
      ? stateValue
      : typeof contactValue === "string"
        ? contactValue
        : "";
  }

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                defaultValue={valueFor(field.name)}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <AddressFields
        key={addressFieldsKey}
        initialValues={initialAddressValues}
        addressErrors={state.addressErrors}
      />

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
