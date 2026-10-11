import { z } from "zod";

/** What the goal form sends: the amount already converted to USD, the month as "YYYY-MM". */
export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Give the goal a name.").max(80),
  targetAmount: z.number().finite().positive("The target must be more than zero.").max(1e11),
  targetMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a target month."),
  inflationRate: z.number().finite().min(0).max(50).nullable(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
