import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Pooled hosts (Neon, Supabase) cannot run migrations; DIRECT_URL bypasses
    // the pooler. Unset on a local Postgres, where DATABASE_URL is already direct.
    ...(process.env.DIRECT_URL ? { directUrl: env("DIRECT_URL") } : {}),
  },
});
