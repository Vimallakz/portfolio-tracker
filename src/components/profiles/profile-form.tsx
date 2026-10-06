"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/profiles/actions";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/lib/profiles/schema";

type ProfileFormProps = {
  defaultValues: ProfileFormValues;
  submitLabel: string;
  /** Resolved on the server; returns a message instead of throwing. */
  onSubmitAction: (values: ProfileFormValues) => Promise<ActionResult>;
  /** Clear the fields after a successful submit, for the create form. */
  resetOnSuccess?: boolean;
};

export function ProfileForm({
  defaultValues,
  submitLabel,
  onSubmitAction,
  resetOnSuccess = false,
}: ProfileFormProps) {
  // The settings page renders one of these per profile, so field ids must be
  // unique per instance or every label would point at the first form.
  const formId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });

  async function onSubmit(values: ProfileFormValues) {
    const result = await onSubmitAction(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Saved successfully");

    if (resetOnSuccess) {
      reset(defaultValues);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field
        id={`${formId}-name`}
        label="Name"
        error={errors.name?.message}
        required
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${formId}-email`}
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Field
          id={`${formId}-phone`}
          label="Phone"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>
      <Field
        id={`${formId}-pan`}
        label="PAN"
        description="Stored for your records only, and always shown masked."
        placeholder="ABCDE1234F"
        error={errors.panNumber?.message}
        autoComplete="off"
        {...register("panNumber")}
      />
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-notes`}>Notes</Label>
        <Textarea id={`${formId}-notes`} rows={3} {...register("notes")} />
        {errors.notes?.message ? (
          <FieldError message={errors.notes.message} />
        ) : null}
      </div>
      <div>
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

type FieldProps = React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  description?: string;
  error?: string;
};

function Field({ id, label, description, error, ...props }: FieldProps) {
  const describedBy = [
    description ? `${id}-description` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {props.required ? (
          <span className="text-muted-foreground" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {description ? (
        <p id={`${id}-description`} className="text-muted-foreground text-xs">
          {description}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
}
