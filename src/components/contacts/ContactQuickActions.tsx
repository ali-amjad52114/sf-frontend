"use client";

import { useId, useState } from "react";
import { Check, Copy, Mail, Phone } from "lucide-react";
import Button, { buttonClasses } from "@/components/ui/Button";

type CopyStatus = "idle" | "copied" | "failed";

/**
 * High-frequency actions kept separate from the contact fields so they are
 * immediately useful in the detail header on both desktop and mobile.
 */
export default function ContactQuickActions({
  email,
  phone,
}: {
  email: string;
  phone: string | null;
}) {
  const statusId = useId();
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const callablePhone = phone?.trim() || null;

  async function copyEmail() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(email);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const feedback =
    copyStatus === "copied"
      ? "Email copied to clipboard."
      : copyStatus === "failed"
        ? "Could not copy email. Select and copy it manually."
        : null;

  return (
    <section aria-label="Quick actions" className="flex flex-wrap items-center gap-2">
      <a href={`mailto:${email}`} className={buttonClasses("secondary", "sm")}>
        <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Email
      </a>
      {callablePhone ? (
        <a href={`tel:${callablePhone}`} className={buttonClasses("secondary", "sm")}>
          <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          Call
        </a>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        onClick={copyEmail}
        aria-describedby={feedback ? statusId : undefined}
      >
        {copyStatus === "copied" ? (
          <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        )}
        Copy email
      </Button>
      {feedback ? (
        <p
          id={statusId}
          role={copyStatus === "failed" ? "alert" : "status"}
          className={
            copyStatus === "failed"
              ? "text-[13px] text-destructive"
              : "text-[13px] text-muted-foreground"
          }
        >
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
