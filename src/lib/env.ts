import { z } from "zod";

/**
 * Server-only environment. Importing this from a Client Component is a build
 * error, which is the point: none of these values may reach the browser.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  /** Live quotes, company news and analyst ratings. Without it, snapshot prices are used and the rest is hidden. */
  FINNHUB_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Report the offending keys without echoing their values.
  const keys = Object.keys(z.flattenError(parsed.error).fieldErrors).join(", ");
  throw new Error(
    `Invalid environment configuration. Check these variables in .env: ${keys}`,
  );
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
