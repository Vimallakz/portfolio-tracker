import { z } from "zod";

export type TagSummary = { id: string; name: string };

export const tagNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1, "Tag name is required").max(40, "Tag name must be 40 characters or fewer"));

export const tagFormSchema = z.object({ name: tagNameSchema });

export type TagFormValues = z.infer<typeof tagFormSchema>;
