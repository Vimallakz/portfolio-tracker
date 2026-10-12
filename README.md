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

Phases 1–4 are complete: application shell, multi-profile support, the full
portfolio data model, Tickertape CSV import with preview and confirmation, and
the portfolio dashboard.

| Phase | Scope | State |
| ----- | ----- | ----- |
| 1 | Next.js, Tailwind, shadcn/ui, Prisma, layout, profile selector, theme | Done |
| 2 | Security, Tag, Snapshot, Holding and Research models | Done |
| 3 | CSV upload, parsing, column mapping, security resolution, import preview | Done |
| 4 | Dashboard summary, allocation, performers, value chart | Done |
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
- **Recharts** for the portfolio history chart, **decimal.js** for exact money arithmetic

TanStack Table arrives with the securities list.

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

# 5. Start the application
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) and redirects to
`/dashboard`. The database starts empty: create a profile under
**Settings → Profile**, then import a Tickertape CSV.

## Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | Yes | Connection used by the application at runtime. On a pooled host such as Neon or Supabase, use the **pooled** connection string. |
| `DIRECT_URL` | No | Direct, unpooled connection used only for migrations. Required on Neon and Supabase, because their pooler cannot run DDL. Omit for a local Postgres. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | No | Key pair for push notifications. Generate with `npx web-push generate-vapid-keys`. Without them the Notifications card says push is not set up. |
| `VAPID_SUBJECT` | No | Contact for the push services, as `mailto:you@example.com`. |
| `CRON_SECRET` | No | At least 16 characters. The daily notification job must send it as a bearer token. |

Both are server-only and are validated at startup in `src/lib/env.ts`. Never commit
`.env`; `.env.example` is the committed template.

## Database

The schema lives in `prisma/schema.prisma`, and connection and migration settings
live in `prisma.config.ts` (Prisma 7 no longer reads the URL from the schema).

```bash
npm run db:migrate    # create and apply a migration in development
npm run db:deploy     # apply existing migrations (CI/production)
npm run db:generate   # regenerate the Prisma client
npm run db:studio     # browse the data
```

The generated Prisma client is written to `src/generated/prisma` and is not
committed; `npm install` regenerates it via the `postinstall` script.

### Deploying (Hostinger or any host that runs `npm run build`)

`npm run build` runs `prisma generate`, then `prisma migrate deploy`, then
`next build`, so every deploy brings the database schema up to date first.
`migrate deploy` only applies migrations that have not run yet and never resets
or drops data, so it is safe to run on every deploy; with nothing new it prints
"No pending migrations to apply". If a migration fails, the build fails and the
previous version keeps running.

Set these in the host's environment variables (available at build time):

- `DATABASE_URL`: the pooled connection the app uses at runtime.
- `DIRECT_URL`: the unpooled connection used for migrations. Required on Neon,
  whose pooler cannot run migrations.
- `FINNHUB_API_KEY`: optional, for live prices, news and analyst ratings.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and
  `CRON_SECRET`: optional, for push notifications (see
  [Phone app](#phone-app-pwa)). The public key is baked into the build, so set
  it before building.

Note that a local `npm run build` also migrates the database in `.env`; use
`npm run build:app` to build without it.

Historical portfolio data is immutable by design: a new CSV import always creates
a new `PortfolioSnapshot` and never updates an existing one or its holdings.

Securities and their CSV name aliases are a shared master holding objective facts
only (ticker, type, sector). Everything personal — snapshots, research, tags and
import sessions — is scoped to a profile. Because tags are profile-scoped, any
query through `Security.tags` must also filter on the tag's `profileId`.

The Tickertape link is not stored. `getTickertapeUrl()` in
`src/lib/portfolio/securities/ticker.ts` builds it from a validated ticker.

## CSV import

`/import` takes a Tickertape CSV export and a snapshot date (the export does not
contain one), and runs in two steps:

1. **Preview.** The file is validated and parsed, columns are matched by
   normalised header name (so order and spelling variants do not matter), and the
   result is compared with the previous snapshot. The parsed holdings are parked
   in an `ImportSession`; nothing else is written.
2. **Confirm.** In one transaction, securities seen for the first time are
   created and remembered by name, and a new immutable snapshot is written. If
   anything fails, nothing is saved.

Required columns are Stock Name, Quantity, Average Buy Price and LTP (current
price). Invested amount, current value, weight, P&L and P&L % are taken from the
file when present and calculated otherwise. Uploading identical content, or a
second file for the same date, shows a duplicate warning before importing.

Tickertape exports carry names, not tickers, so a new security is created with
an empty ticker and a stock/ETF type guessed from its name. Tickers can be added
later; until then the security simply has no Tickertape link.

`fixtures/tickertape-sample.csv` is the reference export used by the importer
tests.

## Dashboard

`/dashboard` reads the active profile's snapshots and shows the latest one:
total invested, current value, portfolio return (P&L and P&L % on invested),
stock vs ETF allocation, top and worst performers, largest holdings by weight, a
history chart with one point per snapshot (current value, invested and P&L as
selectable series), and what changed since the previous snapshot.

The All / Stocks / ETFs filter (`?type=stock|etf`) narrows every figure except
allocation, which always describes the whole portfolio. Top performers only
list holdings in profit and worst performers only holdings at a loss. Because
snapshots are monthly, changes are labelled "since previous snapshot", and the
value change includes money added or withdrawn rather than claiming a market
return. All figures come from `buildDashboard()` in
`src/lib/portfolio/analytics/dashboard.ts`, which is pure and unit-tested.

### You vs the market (benchmarks)

Every period (a month, a report range, or since your first snapshot) uses one
calculation on the dashboard, planner and reports:

- **Your return:** market gain over the money at work, which is the starting
  value plus all the money added, as if it went in at the start.
- **Index return:** SPY (S&P 500) and QQQ (Nasdaq 100) bought once at the last
  close of the month before the period and held to the last close of its final
  month (the 28th, 30th or 31st, whatever your snapshot date).
- **Gap in dollars:** the index's change applied to your money at work.
- **First month:** the first snapshot's money counts as invested at the start
  of its month, so a June 30 first snapshot is compared from May's last close,
  and since-start figures begin there too.

Daily dividend-adjusted closes come from Yahoo Finance's public chart
endpoint (no key) and are stored in `benchmark_prices`, refreshed at most twice
a day. If Yahoo is unreachable, the comparison shows your own return only.
Logic: `src/lib/portfolio/benchmark/`.

### Yearly return (XIRR)

The total return says how much you made, not how fast: +25% over 3 years and
over 10 years are very different paces. XIRR turns your history into one yearly
rate, shown on the dashboard, planner and reports. It uses the same rules as
above: the first snapshot's invested amount goes in on the 1st of its month,
each later change in invested amount goes in at the previous snapshot, and the
latest value comes back at the end. Under a year of history it is labelled an
early estimate, because annualizing a few months magnifies them.
Logic: `src/lib/portfolio/analytics/xirr.ts`.

### Investment goal

Each profile can have one goal: a name, a target amount and a target month,
set on the planner (`investment_goals` table). The planner and the dashboard
judge it with the same pace as the plan hero: your 6-month average investment
(else 12-month) and your 1-year average return (else all-time).

- **Inflation (optional):** when on, the target grows by the rate each year,
  `target × (1 + rate)^(months / 12)`, so $10,000 in 3 years at 3% means
  about $10,927 then.
- **Needed each month:** the steady monthly amount that turns today's value
  into the target by that month at your return,
  `(target − value × (1 + r)^n) × r / ((1 + r)^n − 1)`, never below zero.
- **Status:** your projected value at the target month against the target.
  Within 2% is on track, above is ahead, below is behind; reached and missed
  cover the current value already being there or the date having passed.
- **Reach month:** the first month your pace gets there, looking up to 50
  years ahead.

The planner chart draws the goal as a dashed line with a dot at the target
month. Logic: `src/lib/portfolio/planner/goal.ts`.

## Phone app (PWA)

The app installs on a phone like a native one, opens full screen from the home
screen, and below the `lg` breakpoint swaps the sidebar for a bottom tab bar
(Dashboard, Planner, Focus, History, and More for everything else).

### Install on your phone

- **Android (Chrome, Edge):** open the site and use **Install app** from the
  Settings page card or the browser menu.
- **iPhone and iPad (Safari):** Share, then **Add to Home Screen**. The
  Settings page shows the same tip.

The manifest is `src/app/manifest.ts`. Icons in `public/icons/` are rendered
from `src/app/icon.svg`; after changing the logo, run
`npx tsx scripts/generate-pwa-icons.mts`.

### Offline

`public/sw.js` keeps a copy of every page you open (network first, so online
you always see fresh figures) and the static files they need. Offline, pages
you have opened before load from that copy under a banner saying the figures
are from your last visit; other pages show `/offline`, which lists the saved
ones. Login, signup and `/api/` are never cached, and the saved pages are
cleared on logout and when switching profile. Caching is off under
`next dev` so it never fights hot reload; test it with `npm run build:app`
and `npm start`. Bump `VERSION` in `sw.js` when its precache list changes.

### Notifications

Once VAPID keys are set, **Settings → Notifications → Turn on** subscribes the
device (stored in `push_subscriptions`), and **Send a test** checks delivery.
A daily job sends, per profile:

- **Upload reminder:** when the month-end CSV is due or overdue, linking to
  the import page with the date filled in.
- **Take action:** when a stop is hit or a price reaches your target, listing
  up to three holdings.

Each is sent at most once a day (`notification_logs`). The job is
`GET /api/cron/notify` with the secret as a bearer token; schedule it once a
day with Hostinger's cron jobs or a service such as cron-job.org:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/notify
```

It answers 401 without the right secret, 503 when push is not configured, and
otherwise `{ today, users, sent, skipped }`. On iPhone, notifications need
iOS 16.4 or later and the app added to the Home Screen. Logic:
`src/lib/notifications/`.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `master` and every pull
request: `npm ci`, typecheck, lint, unit tests and `npm run build:app`. It uses
a placeholder `DATABASE_URL` and never touches a database; migrations run only
in the deploy build.

## Scripts

```bash
npm run dev           # development server
npm run build         # generate client, apply pending migrations, production build
npm run build:app     # production build only, without touching the database
npm start             # serve the production build
npm run lint          # ESLint
npm run typecheck     # generate route types, then tsc --noEmit
npm test              # run unit tests once
npm run test:watch    # run unit tests in watch mode
```

## Testing

Unit tests live beside the code they cover as `*.test.ts` and run on Node via
Vitest. They cover PAN handling, formatting, navigation, ticker validation and
Tickertape URLs, P&L and weight calculations, CSV parsing, column mapping, row
validation (including the sample Tickertape export), snapshot comparison
(new, removed, increased and reduced holdings), duplicate-content hashing and
security type detection.

```bash
npm test
```

Playwright end-to-end tests arrive in Phase 8.

## Multi-profile model

Every piece of portfolio data belongs to a profile, and profiles never share data.
The active profile is held in an httpOnly cookie, validated against the current
user's own profiles on every request, and resolved once per request in
`src/lib/profiles/profile-context.ts`. Pages take the profile id from that context
rather than from the URL, so a crafted link cannot widen the data scope.

Version 1 has no login. `src/lib/auth/current-user.ts` resolves the single local
account (created on first use) and is the one place to change when authentication is added.

PAN is treated as sensitive: it is excluded from the default profile queries,
never logged, and rendered masked as `ABCDE****F`.

## Project structure

```text
prisma/                 schema, migrations
src/
  app/
    (app)/              shell layout, routes, error and loading boundaries
    layout.tsx          root layout, fonts, theme and toast providers
  components/
    dashboard/          summary, value chart, allocation, performers, holdings
    import/             CSV uploader, import preview and flow
    layout/             sidebar, header, profile selector, theme toggle
    profiles/           profile form and settings
    shared/             page header, empty state
    ui/                 shadcn/ui primitives
  lib/
    auth/               current user resolution
    config/             navigation definition
    db/                 Prisma client singleton
    format/             money, percentage and quantity formatting
    portfolio/
      analytics/        shared P&L, weight and change calculations; dashboard figures
      comparison/       snapshot-to-snapshot comparison
      importer/         CSV parsing, column mapping, validation, import service and actions
      securities/       ticker validation, Tickertape URL, name normalisation, type guess
      snapshots/        profile-scoped snapshot queries
    profiles/           profile queries, actions, schema, PAN helpers
    env.ts              validated server environment
  generated/prisma/     generated Prisma client (not committed)
```

Business logic lives under `src/lib` rather than inside components. See
`PORTFOLIO_TRACKER_SPEC.md` for the full product specification.
