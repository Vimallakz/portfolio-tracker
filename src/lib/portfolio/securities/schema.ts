import { z } from "zod";

import { isValidTicker, normalizeTicker } from "@/lib/portfolio/securities/ticker";

const optionalTicker = z
  .string()
  .trim()
  .max(13, "Must be 13 characters or fewer")
  .refine((value) => value === "" || isValidTicker(value), {
    message: "Use letters and digits only, like GRAB or BRK.B",
  });

const optionalText = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);

/**
 * The objective facts a user can correct on a security: its ticker (which the
 * Tickertape CSV never carries), its type (guessed from the name on first
 * import), and descriptive fields. Shared by the form and the server action.
 */
export const securityDetailsFormSchema = z.object({
  ticker: optionalTicker,
  type: z.enum(["STOCK", "ETF"]),
  tickertapeTicker: optionalTicker,
  sector: optionalText(80),
  industry: optionalText(80),
});

export type SecurityDetailsFormValues = z.infer<typeof securityDetailsFormSchema>;

/** Blank fields become NULL and tickers are stored uppercase. */
export const securityDetailsInputSchema = securityDetailsFormSchema.transform((values) => ({
  ticker: values.ticker ? normalizeTicker(values.ticker) : null,
  type: values.type,
  tickertapeTicker: values.tickertapeTicker ? normalizeTicker(values.tickertapeTicker) : null,
  sector: values.sector || null,
  industry: values.industry || null,
}));

export type SecurityDetailsInput = z.output<typeof securityDetailsInputSchema>;

export function toSecurityDetailsFormValues(security: {
  ticker: string | null;
  type: SecurityDetailsFormValues["type"];
  tickertapeTicker: string | null;
  sector: string | null;
  industry: string | null;
}): SecurityDetailsFormValues {
  return {
    ticker: security.ticker ?? "",
    type: security.type,
    tickertapeTicker: security.tickertapeTicker ?? "",
    sector: security.sector ?? "",
    industry: security.industry ?? "",
  };
}
