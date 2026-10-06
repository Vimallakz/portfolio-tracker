"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signup } from "@/lib/auth/actions";
import { PASSWORD_MIN_LENGTH, signupFormSchema, type SignupFormValues } from "@/lib/auth/schema";

export function SignupForm() {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function submit(values: SignupFormValues) {
    setError(null);
    const result = await signup(values);

    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormField id={`${id}-name`} label="Name" error={errors.name?.message}>
        <Input autoComplete="name" autoFocus {...register("name")} />
      </FormField>
      <FormField id={`${id}-email`} label="Email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register("email")} />
      </FormField>
      <FormField
        id={`${id}-password`}
        label="Password"
        required
        description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={errors.password?.message}
      >
        <PasswordInput autoComplete="new-password" {...register("password")} />
      </FormField>
      <FormField id={`${id}-confirm`} label="Confirm password" required error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
