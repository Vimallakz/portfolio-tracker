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
import { login } from "@/lib/auth/actions";
import { loginFormSchema, type LoginFormValues } from "@/lib/auth/schema";

export function LoginForm({ next }: { next?: string }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginFormValues) {
    setError(null);
    const result = await login(values, next);

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
      <FormField id={`${id}-email`} label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" autoFocus {...register("email")} />
      </FormField>
      <FormField id={`${id}-password`} label="Password" error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
