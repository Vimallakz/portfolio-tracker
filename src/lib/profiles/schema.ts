import { z } from "zod";

import { isValidPan } from "@/lib/profiles/pan";

const blankOr = (
  check: (value: string) => boolean,
  message: string,
  max: number,
) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .refine((value) => value === "" || check(value), { message });

/**
 * Validation shape, in the form's own terms: every field is a string, because
 * that is what an input produces. Shared by the client form and the server
 * action so both agree on what is valid. The server always re-validates;
 * client validation is a convenience, never the enforcement point.
 */
export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or fewer"),
  email: blankOr(
    (value) => z.string().email().safeParse(value).success,
    "Enter a valid email address",
    254,
  ),
  phone: blankOr(() => true, "", 32),
  notes: blankOr(() => true, "", 2000),
  panNumber: blankOr(isValidPan, "PAN must look like ABCDE1234F", 10),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const emptyProfileFormValues: ProfileFormValues = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  panNumber: "",
};

/**
 * Storage shape. Blank optional fields become NULL rather than empty strings,
 * so "not provided" has exactly one representation in the database.
 */
export const profileInputSchema = profileFormSchema.transform((values) => ({
  name: values.name,
  email: values.email || null,
  phone: values.phone || null,
  notes: values.notes || null,
  panNumber: values.panNumber ? values.panNumber.toUpperCase() : null,
}));

export type ProfileInput = z.output<typeof profileInputSchema>;

/** Turns a stored profile back into form values for the edit form. */
export function toProfileFormValues(profile: {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  panNumber: string | null;
}): ProfileFormValues {
  return {
    name: profile.name,
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    notes: profile.notes ?? "",
    panNumber: profile.panNumber ?? "",
  };
}
