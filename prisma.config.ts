import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // This URL is only used by the Prisma CLI (migrations); the app connects via
    // the adapter in src/lib/db/prisma.ts. Pooled hosts (Neon, Supabase) cannot
    // run migrations, so prefer DIRECT_URL. Unset on a local Postgres.
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});
