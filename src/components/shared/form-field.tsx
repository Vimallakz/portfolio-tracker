import type { ReactElement } from "react";
import { cloneElement } from "react";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  /** The control. It receives id, aria-invalid and aria-describedby. */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
};

/** Label, control, help text and error, wired together for screen readers. */
export function FormField({ id, label, description, error, required, children }: FormFieldProps) {
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-muted-foreground" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {description ? (
        <p id={`${id}-description`} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
