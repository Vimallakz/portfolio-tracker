# Portfolio Intelligence Tracker

A personal web application for tracking and analysing investment portfolios across
multiple profiles. It is not a trading platform and does not sync with a broker.

The workflow is deliberately manual: you export a CSV from Tickertape, upload it,
review a preview of what changed since last time, and confirm. Each confirmed
import is stored as an immutable snapshot, and the application derives analytics
from the history of those snapshots.

The application keeps three kinds of information strictly separate:

- **Portfolio facts** imported from CSV (quantity, average buy price, value, P&L).
- **Analytics** derived from the stored snapshots (history, allocation, changes).
- **User intelligence** you enter yourself (thesis, targets, conviction, notes).

## Status

Phase 1 (foundation) is complete: application shell, navigation, theming,
multi-profile support, and the database foundation.

| Phase | Scope | State |
| ----- | ----- | ----- |
| 1 | Next.js, Tailwind, shadcn/ui, Prisma, layout, profile selector, theme | Done |
| 2 | Security, Tag, Snapshot, Holding and Research models | Not started |
| 3 | CSV upload, parsing, column mapping, security resolution, import preview | Not started |
| 4 | Dashboard summary, allocation, performers, value chart | Not started |
| 5 | Security detail page and research editing | Not started |
| 6 | Snapshot history and comparison | Not started |
| 7 | Focus dashboard | Not started |
| 8 | Testing and polish | Not started |

Routes that belong to later phases are reachable and render an empty state
explaining what is coming, rather than placeholder data.

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions) with Turbopack
- **React 19** and **TypeScript** in strict mode
- **Tailwind CSS v4** with **shadcn/ui** (Radix primitives, Lucide icons)
- **PostgreSQL** with **Prisma 7** via the `@prisma/adapter-pg` driver adapter
- **Zod** for validation, **React Hook Form** for forms
- **Vitest** for unit tests
- **next-themes** for dark/light mode

Charts (Recharts) and tables (TanStack Table) arrive with the phases that need them.

## Local setup

Requires Node.js 20.9 or later and a PostgreSQL 16+ server.

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#    then edit DATABASE_URL to point at your database

# 3. Create the database (local Postgres example)
createdb portfolio_tracker

# 4. Apply migrations and generate the Prisma client
npm run db:migrate

# 5. Create the local account and development profiles
npm run db:seed

# 6. Start the application
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) and redirects to
`/dashboard`.

## Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | Yes | Connection used by the application at runtime. On a pooled host such as Neon or Supabase, use the **pooled** connection string. |
| `DIRECT_URL` | No | Direct, unpooled connection used only for migrations. Required on Neon and Supabase, because their pooler cannot run DDL. Omit for a local Postgres. |

Both are server-only and are validated at startup in `src/lib/env.ts`. Never commit
`.env`; `.env.example` is the committed template.

## Database

The schema lives in `prisma/schema.prisma`, and connection and migration settings
live in `prisma.config.ts` (Prisma 7 no longer reads the URL from the schema).

```bash
npm run db:migrate    # create and apply a migration in development
npm run db:deploy     # apply existing migrations (CI/production)
npm run db:generate   # regenerate the Prisma client
npm run db:seed       # insert development profiles (idempotent)
npm run db:studio     # browse the data
```

The generated Prisma client is written to `src/generated/prisma` and is not
committed; `npm install` regenerates it via the `postinstall` script.

Historical portfolio data is immutable by design. Once Phase 3 lands, a new CSV
import never updates an existing snapshot.

## Scripts

```bash
npm run dev           # development server
npm run build         # production build
npm start             # serve the production build
npm run lint          # ESLint
npm run typecheck     # generate route types, then tsc --noEmit
npm test              # run unit tests once
npm run test:watch    # run unit tests in watch mode
```

## Testing

Unit tests live beside the code they cover as `*.test.ts` and run on Node via
Vitest. Phase 1 covers the pure logic that exists so far: PAN masking and
validation, display formatting, and navigation matching.

```bash
npm test
```

Business-logic tests for CSV parsing, column mapping, P&L calculation and snapshot
comparison arrive with Phases 3 and 4. Playwright end-to-end tests arrive in Phase 8.

## Multi-profile model

Every piece of portfolio data belongs to a profile, and profiles never share data.
The active profile is held in an httpOnly cookie, validated against the current
user's own profiles on every request, and resolved once per request in
`src/lib/profiles/profile-context.ts`. Pages take the profile id from that context
rather than from the URL, so a crafted link cannot widen the data scope.

Version 1 has no login. `src/lib/auth/current-user.ts` resolves the single seeded
local account and is the one place to change when authentication is added.

PAN is treated as sensitive: it is excluded from the default profile queries,
never logged, and rendered masked as `ABCDE****F`.

## Project structure

```text
prisma/                 schema, migrations, seed
src/
  app/
    (app)/              shell layout, routes, error and loading boundaries
    layout.tsx          root layout, fonts, theme and toast providers
  components/
    layout/             sidebar, header, profile selector, theme toggle
    profiles/           profile form and settings
    shared/             page header, empty state
    ui/                 shadcn/ui primitives
  lib/
    auth/               current user resolution
    config/             navigation definition
    db/                 Prisma client singleton
    format/             money, percentage and quantity formatting
    profiles/           profile queries, actions, schema, PAN helpers
    env.ts              validated server environment
  generated/prisma/     generated Prisma client (not committed)
```

Business logic lives under `src/lib` rather than inside components. See
`PORTFOLIO_TRACKER_SPEC.md` for the full product specification.
