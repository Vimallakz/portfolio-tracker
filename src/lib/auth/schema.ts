import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(128, "Keep the password under 128 characters.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email.")
  .pipe(z.email("Enter a valid email address."));

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const signupFormSchema = z
  .object({
    name: z.string().trim().max(80, "Keep the name under 80 characters."),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password different from your current one.",
    path: ["newPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

/** Only same-site paths, so a crafted ?next= cannot send users to another origin. */
export function safeRedirectPath(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/dashboard";
}
