"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/auth/actions";
import { changePasswordFormSchema, PASSWORD_MIN_LENGTH, type ChangePasswordFormValues } from "@/lib/auth/schema";

const emptyValues = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordForm() {
  const id = useId();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: emptyValues,
  });

  async function submit(values: ChangePasswordFormValues) {
    const result = await changePassword(values);

    if (!result.ok) {
      setError("currentPassword", { message: result.error });
      return;
    }

    toast.success("Password changed. Other browsers have been signed out.");
    reset(emptyValues);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="grid max-w-sm gap-4" noValidate>
      <FormField id={`${id}-current`} label="Current password" error={errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" {...register("currentPassword")} />
      </FormField>
      <FormField
        id={`${id}-new`}
        label="New password"
        description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={errors.newPassword?.message}
      >
        <PasswordInput autoComplete="new-password" {...register("newPassword")} />
      </FormField>
      <FormField id={`${id}-confirm`} label="Confirm new password" error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>
      <div>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
