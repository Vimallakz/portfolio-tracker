import { z } from "zod";

const RATE_PATTERN = /^\d{1,6}(\.\d{1,4})?$/;

/** Blank means "use the market rate". */
export const rateOverrideFormSchema = z.object({
  rate: z
    .string()
    .trim()
    .refine((value) => value === "" || RATE_PATTERN.test(value), "Enter a number with up to 4 decimals, like 88.25.")
    .refine((value) => value === "" || Number(value) > 0, "The rate must be greater than zero."),
});

export type RateOverrideFormValues = z.infer<typeof rateOverrideFormSchema>;

export const rateOverrideInputSchema = rateOverrideFormSchema.transform(({ rate }) => ({
  rate: rate === "" ? null : rate,
}));
