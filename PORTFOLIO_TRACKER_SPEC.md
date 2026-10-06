# Personal Portfolio Intelligence Tracker

## 1. Project Overview

Build a personal web application for tracking and analyzing investment portfolios for multiple people/profiles.

The application is NOT a trading platform and does NOT need daily portfolio synchronization.

The primary workflow is:

1. User selects a profile.
2. User uploads the latest portfolio CSV exported from Tickertape.
3. Application compares the new CSV against historical snapshots.
4. Application identifies:
   - Existing holdings
   - New holdings
   - Removed holdings
   - Quantity changes
   - Investment/value changes
   - Profit/loss changes
5. Application stores the uploaded portfolio as a historical snapshot.
6. Application generates portfolio analytics.
7. User can open any stock/ETF to view:
   - Historical portfolio performance
   - Investment performance
   - Personal investment thesis
   - Target price
   - Buy/accumulation zone
   - Stop/exit point
   - Conviction
   - Business information
   - Personal notes
   - Tickertape link
8. The user should be able to understand their entire portfolio without needing to remember individual companies.

The application should feel like a **personal investment intelligence dashboard**, not a broker.

---

# 2. Core Product Philosophy

Separate the application into three concepts:

## A. Portfolio Facts

Facts imported from CSV:

- Quantity
- Average buy price
- Invested amount
- Current value
- Current P&L
- P&L percentage
- Portfolio weight
- Monthly snapshot

These should never be mixed with subjective user information.

## B. Market/Portfolio Analytics

Derived from uploaded snapshots:

- Historical portfolio value
- Historical invested amount
- Historical P&L
- Monthly changes
- Holding performance
- Portfolio allocation
- Stock vs ETF allocation
- Top performers
- Worst performers
- New holdings
- Removed holdings
- Quantity changes

## C. User Intelligence

Information manually entered by the user:

- Investment thesis
- Why I bought this
- Bull case
- Bear case
- Target price
- Accumulation zone
- Stop/exit point
- Conviction
- Expected holding period
- Business description
- Risks
- Personal notes
- Tags
- Investment status

This separation is extremely important.

---

# 3. Technology Stack

Use:

- Next.js
- TypeScript
- App Router
- React
- Tailwind CSS
- shadcn/ui or another clean accessible component system
- PostgreSQL
- Prisma ORM
- Recharts for charts
- Zod for validation
- React Hook Form for forms
- TanStack Table where useful
- Lucide icons

Use the latest stable versions available when implementing.

Do NOT introduce unnecessary complexity.

Avoid:

- Microservices
- Kubernetes
- Redis
- Kafka
- Event-driven architecture
- Complex state management unless genuinely required

This is a personal application with potentially dozens of holdings, not millions.

---

# 4. Deployment Architecture

Preferred initial architecture:

```text
Next.js
   |
   +-- App Router
   |
   +-- Server Components
   |
   +-- Server Actions / Route Handlers
   |
   +-- Prisma
          |
          PostgreSQL
```

The application should be deployable to Vercel with a managed PostgreSQL database such as Neon or Supabase.

Keep infrastructure provider-independent where practical.

---

# 5. Multi-Profile Architecture

The application must support multiple investment profiles.

Example:

```text
Profiles

Vimal
Wife
```

The header should contain a profile selector:

```text
┌─────────────────────────────────────────────┐
│ Portfolio Intelligence     [Vimal ▼]  ⚙    │
└─────────────────────────────────────────────┘
```

Selecting a profile changes the entire dashboard context.

Each profile has its own:

- Portfolio
- Holdings
- CSV snapshots
- Security mappings
- Investment thesis
- Notes
- Targets
- Tags
- Analytics

Do NOT mix profiles.

---

# 6. Profile Information

Each profile should have:

```text
Profile
-------
id
name
panNumber
email
phone
notes
createdAt
updatedAt
```

PAN should be treated as sensitive information.

Do not expose PAN unnecessarily in the UI.

Display it masked where appropriate:

```text
ABCDE****F
```

Allow editing profile information from Settings.

Do not store unnecessary personal information.

---

# 7. Authentication

Version 1 can use simple authentication suitable for a personal application.

However, structure the application so authentication can be added cleanly.

All portfolio data must belong to a profile/user boundary.

Never query another profile's data accidentally.

Every server-side query must enforce ownership/profile scope.

---

# 8. Security Rules

Important:

- Never expose database credentials to the browser.
- Never expose sensitive environment variables.
- Validate all uploaded files.
- Validate CSV structure.
- Validate all form inputs.
- Use Zod.
- Use parameterized database queries through Prisma.
- Protect server actions.
- Sanitize user-entered rich text if rich text editing is introduced.
- PAN should never be included in logs.
- Do not log entire CSV contents in production.

---

# 9. Portfolio Import

The main workflow is CSV import.

User exports a CSV from Tickertape.

Example expected fields include:

```text
Stock Name
Quantity
Average Buy Price
Invested Amount
Current Price
Current Value
Weight
P&L
P&L %
```

Do not hardcode the exact CSV column order.

The importer should identify columns by normalized names.

For example:

```text
"Stock Name"
"stock name"
"StockName"
```

should be normalized appropriately.

---

# 10. CSV Import Flow

Create:

```text
/portfolio/import
```

UI:

```text
Upload Portfolio

┌───────────────────────────────────────────────┐
│                                               │
│      Drag & Drop CSV                          │
│                                               │
│      or                                      │
│                                               │
│      [Choose CSV]                             │
│                                               │
└───────────────────────────────────────────────┘
```

After upload:

```text
Step 1
Validate CSV

Step 2
Parse holdings

Step 3
Resolve securities

Step 4
Preview changes

Step 5
Confirm import

Step 6
Create snapshot
```

Never immediately insert the CSV without preview/confirmation.

---

# 11. Security Mapping

Tickertape CSV may not always contain a clean ticker symbol.

Example:

```text
Sphere 3D Corp
Grab Holdings
Vanguard S&P 500 ETF
```

The application should maintain a security master.

```text
Security
--------
id
name
ticker
type
exchange
country
tickertapeTicker
tickertapeUrl
sector
industry
description
createdAt
updatedAt
```

Types:

```text
STOCK
ETF
```

---

# 12. Unmapped Security Workflow

If the importer cannot identify a ticker:

```text
⚠ 2 securities need mapping
```

Example:

```text
Sphere 3D Corp

Ticker:
[________]

Type:
[Stock ▼]

Tickertape ticker:
[________]

[Save Mapping]
```

The mapping should be remembered for future CSV imports.

Once mapped:

```text
Sphere 3D Corp
       ↓
ANY
       ↓
https://www.tickertape.in/us-stocks/ANY
```

Do not require the user to map it again.

---

# 13. Tickertape URL Generation

For US securities:

```text
https://www.tickertape.in/us-stocks/{TICKER}
```

Example:

```text
GRAB
↓
https://www.tickertape.in/us-stocks/GRAB
```

Create a helper:

```typescript
getTickertapeUrl(ticker: string): string
```

Do not allow arbitrary URL injection.

Only generate URLs from validated ticker values.

Provide:

```text
[Open Tickertape ↗]
```

If iframe embedding is technically allowed by Tickertape, support an embedded view.

However:

**Iframe must NOT be a hard dependency.**

If Tickertape blocks iframe embedding through CSP/X-Frame-Options, gracefully show:

```text
Tickertape cannot be embedded.

[Open in Tickertape ↗]
```

---

# 14. Snapshot Model

Every confirmed CSV upload creates a portfolio snapshot.

Example:

```text
2026-08-22
2026-09-30
2026-10-31
```

Never overwrite previous snapshots.

A snapshot represents:

> What the portfolio looked like when the CSV was uploaded.

Database:

```text
PortfolioSnapshot
-----------------
id
profileId
snapshotDate
source
fileName
createdAt
```

Source:

```text
TICKERTAPE_CSV
```

---

# 15. Snapshot Holdings

Each snapshot contains holdings.

```text
SnapshotHolding
---------------
id
snapshotId
securityId

quantity
averageBuyPrice
investedAmount

currentPrice
currentValue

weight
pnlAmount
pnlPercentage

createdAt
```

Important:

Do not update historical snapshot rows when a new CSV arrives.

Historical snapshots are immutable.

---

# 16. Import Comparison

When a new CSV is uploaded:

Compare:

```text
Previous Snapshot
        VS
New Snapshot
```

For each security calculate:

### Existing holding

```text
Previous:
Quantity = 100

New:
Quantity = 120

Change:
+20 shares
```

### New holding

Previous:

```text
Not present
```

New:

```text
GRAB
```

Result:

```text
NEW HOLDING
```

### Removed holding

Previous:

```text
XYZ
```

New:

```text
Not present
```

Result:

```text
REMOVED HOLDING
```

---

# 17. Change Detection

Calculate:

```text
quantityChange
investedAmountChange
currentValueChange
pnlChange
pnlPercentageChange
weightChange
averageBuyPriceChange
```

Example:

```text
GRAB

Quantity
100 → 120
+20

Invested
$500 → $650
+$150

Value
$700 → $840
+$140

P&L
+$200 → +$190
-$10
```

---

# 18. Important P&L Distinction

The application must show BOTH:

## Portfolio Return

Based on the user's investment.

```text
Invested:
$1,000

Current Value:
$1,250

P&L:
+$250

P&L:
+25%
```

## Security Performance

Performance based on the security's tracked price/value history.

Example:

```text
GRAB

First tracked price:
$4.00

Current:
$6.00

Security performance:
+50%
```

Label these clearly.

Never imply that portfolio return and market/security return are the same.

---

# 19. Dashboard

Main route:

```text
/dashboard
```

Dashboard should respect selected profile.

Example:

```text
┌──────────────────────────────────────────────────┐
│ Vimal Portfolio                    Oct 2026      │
├──────────────────────────────────────────────────┤
│                                                  │
│ Invested        Current Value       P&L          │
│ $XX,XXX         $XX,XXX             +$X,XXX      │
│                                      +XX.X%      │
│                                                  │
├──────────────────────────────────────────────────┤
│ Portfolio Value History                          │
│                                                  │
│             📈                                   │
│                                                  │
├──────────────────────────────────────────────────┤
│ Allocation                                       │
│                                                  │
│ Stocks  █████████████████ 80%                   │
│ ETFs    █████               20%                 │
│                                                  │
├──────────────────────────────────────────────────┤
│ Top Performers                                   │
│                                                  │
│ GRAB      +42%                                   │
│ NVDA      +31%                                   │
│                                                  │
├──────────────────────────────────────────────────┤
│ Worst Performers                                 │
│                                                  │
│ XYZ       -18%                                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

# 20. Dashboard Sections

Include:

## Portfolio Summary

- Total invested
- Current value
- Total P&L
- Total return %
- Number of stocks
- Number of ETFs
- Last snapshot date

## Portfolio History

Line chart:

```text
Date → Portfolio Value
```

Also provide:

```text
Invested Amount
Current Value
P&L
```

with selectable series.

## Allocation

Show:

```text
Stock vs ETF
```

and optionally:

```text
Top 10 holdings by weight
```

## Top Performers

Sort by:

```text
P&L %
```

## Worst Performers

Sort ascending by:

```text
P&L %
```

## Largest Holdings

Sort by:

```text
Weight %
```

## Monthly Changes

Example:

```text
September → October

+3 new holdings
-1 removed
+2 increased
-1 reduced
```

---

# 21. Focus Dashboard

The dashboard should also include a personal decision-support section.

Example:

```text
MY FOCUS

🎯 Near Target

GRAB
Current $6.20
Target $8.00

────────────────

🟢 Accumulation Zone

XYZ
Current $4.60
Buy zone $4.50–$5.00

────────────────

🔴 Below Stop

ABC
Current $3.20
Stop $3.80

────────────────

⭐ High Conviction

GRAB
NVDA
VOO
```

These are based on user-defined values.

---

# 22. Security Detail Page

Route:

```text
/securities/[securityId]
```

This is one of the most important pages.

Layout:

```text
GRAB
Grab Holdings

[Stock] [Growth] [Fintech]

Current P&L
+42.5%

[Open Tickertape ↗]

────────────────────────

PORTFOLIO POSITION

Quantity
100

Average Buy Price
$5.00

Invested
$500

Current Value
$712

P&L
+$212

P&L %
+42.4%

Portfolio Weight
4.5%

────────────────────────

PERFORMANCE HISTORY

[Chart]

1M
3M
6M
1Y
All

────────────────────────

MY INVESTMENT THESIS

Why I bought it
...

Bull Case
...

Bear Case
...

────────────────────────

TARGETS

Target Price
$8.00

Accumulation Zone
$4.50 - $5.00

Stop / Exit
$3.80

────────────────────────

CONVICTION

⭐⭐⭐⭐ High

────────────────────────

BUSINESS

What the company does
...

Sector
...

Industry
...

────────────────────────

RISKS

...

────────────────────────

TAGS

Growth
Fintech
Long Term

────────────────────────

MY NOTES

...

────────────────────────

PORTFOLIO HISTORY

Date       Qty   Value    P&L
--------------------------------
Jan        50    $250     +10%
Feb        75    $390     +20%
Mar        100   $500     +35%

[Open Tickertape ↗]
```

---

# 23. Security Research Data

Add a separate model for user research.

```text
SecurityResearch
----------------
id
securityId

thesis
whyBought

bullCase
baseCase
bearCase

businessDescription

targetPrice
accumulationMin
accumulationMax
stopPrice

expectedHoldingPeriod

conviction

investmentStatus

risks
personalNotes

updatedAt
```

---

# 24. Conviction

Use:

```text
LOW
MEDIUM
HIGH
VERY_HIGH
```

Display visually.

Example:

```text
⭐⭐⭐⭐⭐ Very High
```

---

# 25. Investment Status

Use:

```text
WATCH
ACCUMULATE
HOLD
REDUCE
EXIT
```

The user can manually set this.

Do NOT automatically recommend BUY/SELL.

The application is a personal tracking tool.

---

# 26. Tags

Support multiple custom tags.

Example:

```text
Growth
AI
Fintech
ETF
Core
Speculative
Long Term
Dividend
High Risk
```

Database:

```text
Tag
---
id
profileId
name
```

Many-to-many:

```text
SecurityTag
-----------
securityId
tagId
```

---

# 27. ETF Support

ETFs should be first-class securities.

Example:

```text
VOO
QQQ
SCHD
```

Show:

```text
Type: ETF
```

The dashboard should allow:

```text
All
Stocks
ETFs
```

filters.

---

# 28. Security List

Route:

```text
/securities
```

Table:

```text
Security | Type | Qty | Invested | Value | P&L | P&L % | Weight | Status | Conviction
```

Features:

- Search
- Filter
- Sort
- Stock/ETF filter
- Tag filter
- Status filter
- Conviction filter
- Positive/negative P&L filter

---

# 29. Monthly History

Route:

```text
/history
```

Show:

```text
Snapshot Date
Total Invested
Current Value
P&L
P&L %
Holdings
New
Removed
```

Example:

```text
October 2026
Invested       $12,500
Value          $15,200
P&L            +$2,700
Holdings       19
```

Clicking opens the snapshot details.

---

# 30. Snapshot Comparison

Allow the user to select:

```text
Compare:

[Aug 2026 ▼]

vs

[Oct 2026 ▼]
```

Display:

```text
Portfolio Value
Aug     $12,000
Oct     $15,200
Change  +$3,200

Holdings
Aug     16
Oct     19
Change  +3
```

Security-level changes:

```text
GRAB      +20 shares
VOO       +2 shares
XYZ       Removed
NVDA      New
```

---

# 31. Import Preview

Before saving:

```text
IMPORT PREVIEW

Snapshot:
October 2026

Total holdings:
19

Existing:
15

New:
3

Removed:
1

Quantity increases:
5

Quantity decreases:
2

Unmapped:
0
```

Then:

```text
[Cancel] [Confirm Import]
```

---

# 32. Duplicate Import Protection

If the user uploads the same CSV twice:

Detect duplicate snapshot/date/content.

Show:

```text
This portfolio snapshot appears to already exist.

[View Existing] [Import Anyway]
```

Do not silently duplicate data.

---

# 33. CSV Parsing

Create a dedicated service:

```text
lib/portfolio/importer/
```

Suggested modules:

```text
csv-parser.ts
column-mapper.ts
security-resolver.ts
snapshot-comparator.ts
import-validator.ts
```

Keep CSV parsing separate from UI.

---

# 34. Domain Services

Suggested structure:

```text
lib/
  portfolio/
    importer/
    analytics/
    comparison/
    securities/
    snapshots/
  research/
  profiles/
```

Do not put all business logic inside React components.

---

# 35. Database Schema

At minimum:

```text
User
Profile

Security
Tag
SecurityTag

PortfolioSnapshot
SnapshotHolding

SecurityResearch

ImportSession
```

Potential relationships:

```text
User
 |
 +-- Profiles
       |
       +-- PortfolioSnapshots
       |      |
       |      +-- SnapshotHoldings
       |
       +-- Tags
       |
       +-- SecurityResearch

Security
 |
 +-- SnapshotHoldings
 |
 +-- SecurityResearch
 |
 +-- SecurityTags
```

---

# 36. Important Database Principle

Historical portfolio data is immutable.

For example:

```text
Snapshot A
  GRAB quantity = 100

Snapshot B
  GRAB quantity = 120
```

Never update Snapshot A to 120.

Snapshot A must permanently represent what the CSV contained at that time.

---

# 37. Analytics Calculations

Create reusable calculation functions.

Examples:

```typescript
calculatePnl()
calculatePnlPercentage()
calculatePortfolioWeight()
calculateQuantityChange()
calculateValueChange()
calculateInvestedChange()
calculatePortfolioReturn()
calculateMonthlyChange()
```

Do not duplicate formulas across UI components.

---

# 38. Portfolio Return Formula

Basic snapshot P&L:

```text
P&L = Current Value - Invested Amount
```

P&L percentage:

```text
P&L % =
(Current Value - Invested Amount)
/
Invested Amount
× 100
```

Use safe handling for:

```text
investedAmount = 0
```

Never produce NaN or Infinity in UI.

---

# 39. Monthly Performance

Because only monthly snapshots are available, do not pretend that the application has daily market performance.

Use:

```text
Snapshot-to-snapshot performance
```

Example:

```text
September value: $10,000
October value:   $11,200

Change: +12%
```

Clearly label this as:

```text
Since previous snapshot
```

---

# 40. No External Market API in MVP

Do NOT integrate:

- Alpha Vantage
- Polygon
- Yahoo Finance
- Finnhub
- Twelve Data
- etc.

in Version 1.

The CSV is the source of truth for portfolio values.

Future architecture should make market APIs possible, but do not implement them now.

---

# 41. No Broker Integration in MVP

Do not attempt:

- Tickertape account login
- Tickertape scraping
- Broker API integration
- Automatic synchronization

The user will manually upload CSV monthly.

This keeps the system reliable and simple.

---

# 42. Future Features

Design the architecture so these can be added later:

```text
Future:

Market price API
Daily prices
Dividends
Corporate actions
Currency conversion
Broker integration
Automatic CSV ingestion
Email alerts
Target alerts
Stop alerts
AI investment journal
AI thesis review
Portfolio rebalancing
Tax reports
Capital gains tracking
Dividend tracking
Portfolio benchmarking
S&P 500 comparison
```

Do not implement these in MVP.

---

# 43. UI Design

The UI should feel like a modern financial analytics product.

Characteristics:

- Clean
- Minimal
- Professional
- Data dense but readable
- Desktop first
- Responsive
- Dark/light mode
- Good typography
- Consistent spacing
- Accessible components

Avoid:

- Excessive gradients
- Excessive animations
- Huge cards
- Crypto-dashboard aesthetic
- Too many colors
- Clutter

Use color primarily for financial meaning:

```text
Positive → green
Negative → red
Neutral → muted
Warning → amber
```

Do not rely on color alone.

---

# 44. Application Navigation

Desktop sidebar:

```text
Portfolio
Dashboard
Securities
History
Import CSV

Research
My Focus
Tags

Settings
Profile
```

Header:

```text
[Logo]

Profile:
[Vimal ▼]

Search...

[Theme]
[Settings]
```

---

# 45. Global Search

Add a simple security search.

Example:

```text
Search:
GRAB

Results:
GRAB
Grab Holdings

Open →
```

Eventually this can search:

- Securities
- Notes
- Tags
- Thesis

but MVP can search securities.

---

# 46. My Focus Page

Create:

```text
/focus
```

Sections:

```text
Near Target
In Accumulation Zone
Below Stop
High Conviction
Needs Review
```

Example:

```text
NEAR TARGET

GRAB
$6.20 / $8.00

NVDA
$180 / $200
```

---

# 47. Needs Review

A useful section:

```text
Needs Review
```

Security appears here if:

- Research hasn't been updated for X months
- No thesis exists
- No target exists
- Status is WATCH
- User manually marks it for review

For MVP, implement:

```text
No research
```

and:

```text
Research older than configurable number of days
```

Default:

```text
180 days
```

---

# 48. Research Editing

Security page should have:

```text
[Edit Research]
```

Open a clean form:

```text
Investment Thesis
Why Bought
Business Description

Bull Case
Base Case
Bear Case

Target Price
Accumulation Min
Accumulation Max
Stop Price

Expected Holding Period

Conviction
Status

Risks
Personal Notes

Tags
```

Use React Hook Form + Zod.

---

# 49. Autosave

Do not implement complicated autosave in MVP.

Use:

```text
[Save Changes]
```

Show:

```text
Saved successfully
```

---

# 50. Audit-Friendly Research

Store:

```text
createdAt
updatedAt
```

for research.

Later this can evolve into research version history.

Do not implement version history in MVP unless simple.

---

# 51. Responsive Design

Desktop is primary.

Still support tablet/mobile.

On mobile:

```text
Sidebar → Drawer
Tables → horizontal scrolling / cards
Dashboard → stacked sections
```

Do not compromise desktop analytics usability just to make everything fit mobile.

---

# 52. Error Handling

Every important operation needs useful errors.

Examples:

```text
Invalid CSV
Missing required column
Invalid numeric value
Unknown security
Duplicate snapshot
Database error
Import failed
```

Never show raw stack traces to the user.

---

# 53. Empty States

Design proper empty states.

Example:

```text
No portfolio yet

Upload your first Tickertape CSV to start tracking your portfolio.

[Upload CSV]
```

Security:

```text
No research added yet.

Add your investment thesis to make this security easier to evaluate later.

[Add Research]
```

---

# 54. Loading States

Use skeleton loaders for:

- Dashboard
- Security table
- Security detail
- History
- Import preview

Avoid unnecessary spinners.

---

# 55. Testing

Implement tests for core business logic.

At minimum:

```text
CSV parsing
Column mapping
P&L calculation
P&L percentage
Portfolio weight
Snapshot comparison
New security detection
Removed security detection
Quantity change
Duplicate detection
Security mapping
```

Use:

```text
Vitest
```

For UI/E2E:

```text
Playwright
```

At minimum test:

```text
Create profile
Upload CSV
Resolve security
Confirm import
View dashboard
Open security
Edit research
Upload second CSV
Compare snapshots
```

---

# 56. Seed Data

Create development seed data.

Profiles:

```text
Vimal
Wife
```

Securities:

```text
GRAB
VOO
NVDA
```

Create several historical snapshots.

This should make the dashboard immediately visually testable.

---

# 57. CSV Sample

The project already has a sample Tickertape CSV available during development.

Use it to validate the importer.

Do NOT assume the sample is the only possible CSV structure.

Build a robust normalized column mapping layer.

---

# 58. Suggested Routes

```text
/
  → redirect to dashboard

/dashboard

/focus

/securities

/securities/[id]

/history

/history/[snapshotId]

/compare

/import

/settings

/settings/profile

/settings/securities
/settings/tags
```

---

# 59. API / Server Actions

Prefer Server Actions for internal application mutations where appropriate.

Examples:

```text
createProfile()
updateProfile()

uploadPortfolio()
previewPortfolioImport()
confirmPortfolioImport()

createSecurity()
updateSecurityMapping()

updateSecurityResearch()

createTag()
updateTag()
deleteTag()
```

For read-heavy pages, use Server Components and direct server-side data access.

Do not create API routes just because they are possible.

Use Route Handlers where an HTTP endpoint is actually useful.

---

# 60. Type Safety

Strict TypeScript.

Use:

```text
strict: true
```

Avoid:

```typescript
any
```

unless absolutely unavoidable.

Create shared domain types.

---

# 61. Code Quality

Follow:

- SOLID where useful
- DRY
- small focused modules
- clear naming
- reusable components
- domain/business logic outside UI
- no giant components

Avoid premature abstractions.

---

# 62. Component Structure

Suggested:

```text
components/
  layout/
  dashboard/
  portfolio/
  securities/
  research/
  import/
  charts/
  ui/
```

Examples:

```text
PortfolioSummary
PortfolioValueChart
AllocationChart
TopPerformers
WorstPerformers
FocusSection

SecurityTable
SecurityHeader
SecurityPosition
SecurityPerformanceChart
SecurityResearchForm
SecurityTags

CsvUploader
ImportPreview
SecurityMappingDialog
SnapshotComparison
```

---

# 63. Formatting

Money:

```text
$12,345.67
```

Percentage:

```text
+12.45%
-4.21%
```

Quantity:

```text
120
```

Avoid excessive decimal places.

Make currency configurable later.

MVP assumes USD because the current portfolio source is US stocks/ETFs.

---

# 64. Important: Do Not Over-Automate Investment Decisions

The app is for:

```text
tracking
remembering
analyzing
organizing
```

It should NOT automatically tell the user:

```text
BUY THIS STOCK
SELL THIS STOCK
```

Instead:

```text
Current price is below your accumulation range.
```

or:

```text
Current price is below your manually configured stop price.
```

The user makes the decision.

---

# 65. Development Method

Do NOT attempt to generate the entire application in one giant implementation.

Build incrementally.

## Phase 1 — Foundation

Implement:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Prisma
- PostgreSQL
- Base layout
- Sidebar
- Header
- Profile selector
- Theme

Deliver a working application.

---

## Phase 2 — Database

Implement:

- User
- Profile
- Security
- Tag
- SecurityTag
- PortfolioSnapshot
- SnapshotHolding
- SecurityResearch

Run migrations.

Create seed data.

Verify relationships.

---

## Phase 3 — CSV Import

Implement:

- CSV upload
- Parsing
- Validation
- Column normalization
- Security matching
- Manual security mapping
- Import preview
- Snapshot creation

Use the supplied Tickertape CSV as the first test case.

---

## Phase 4 — Dashboard

Implement:

- Portfolio summary
- P&L
- Allocation
- Holdings
- Top performers
- Worst performers
- Portfolio value chart
- Snapshot date

---

## Phase 5 — Security Detail

Implement:

- Position information
- Historical chart
- Portfolio history
- Tickertape URL
- Research
- Thesis
- Targets
- Stop
- Conviction
- Tags
- Notes

---

## Phase 6 — History and Comparison

Implement:

- Snapshot history
- Snapshot detail
- Snapshot comparison
- New holdings
- Removed holdings
- Quantity changes
- Value changes
- P&L changes

---

## Phase 7 — Focus Dashboard

Implement:

- Near target
- Accumulation zone
- Below stop
- High conviction
- Needs research
- Needs review

---

## Phase 8 — Testing & Polish

Implement:

- Unit tests
- Integration tests
- Playwright tests
- Empty states
- Error states
- Loading states
- Responsive behavior
- Accessibility
- Performance improvements

---

# 66. Cursor Instructions

You are acting as a senior full-stack engineer.

Read this entire specification before modifying code.

Before implementing each phase:

1. Inspect the existing project.
2. Understand current architecture.
3. Do not overwrite working code unnecessarily.
4. Follow existing conventions where they are good.
5. If architecture conflicts with this specification, explain the conflict before making a major change.
6. Implement one phase at a time.
7. Run type checking after each major change.
8. Run tests after business logic changes.
9. Fix errors before moving forward.
10. Keep commits/changes logically grouped.

Do not generate fake implementations.

Do not use mock data in production code.

Seed data is acceptable only for development.

---

# 67. Cursor Execution Rule

When I ask:

```text
Implement Phase 1
```

only implement Phase 1.

When I ask:

```text
Implement Phase 2
```

implement Phase 2 on top of the existing code.

Do not jump ahead to future phases unless required by the current phase.

---

# 68. Before Coding

First inspect:

```text
package.json
directory structure
existing source files
environment files
database configuration
```

Then provide a short implementation assessment.

Do not immediately rewrite the repository.

---

# 69. Database Migration Rule

Before changing the Prisma schema:

1. Explain the schema change briefly.
2. Update schema.
3. Create migration.
4. Run migration.
5. Regenerate Prisma client.
6. Verify application compilation.

Never silently destroy existing database data.

---

# 70. CSV Import Safety

Never modify existing snapshots during import.

Algorithm:

```text
Upload
  ↓
Parse
  ↓
Validate
  ↓
Resolve securities
  ↓
Compare against previous snapshot
  ↓
Show preview
  ↓
User confirms
  ↓
Create NEW snapshot
  ↓
Create snapshot holdings
  ↓
Record import metadata
```

Use a transaction when creating the snapshot and its holdings.

If anything fails, rollback the import.

---

# 71. Future-Proofing

Do not build unnecessary future features.

But keep clear extension points for:

```text
MarketDataProvider
BrokerProvider
PortfolioImporter
```

Possible future interface:

```typescript
interface PortfolioImporter {
  validate(input: unknown): ValidationResult;
  parse(input: unknown): ParsedHolding[];
}
```

This would allow another broker/CSV source later.

---

# 72. Documentation

Create:

```text
README.md
ARCHITECTURE.md
```

README should explain:

- What the application does
- Tech stack
- Local setup
- Environment variables
- Database setup
- Running migrations
- Running seed
- Running tests

ARCHITECTURE should explain:

- Domain model
- Snapshot architecture
- CSV import flow
- Security mapping
- Analytics calculations
- Major architectural decisions

---

# 73. Environment Variables

Use:

```text
DATABASE_URL=
```

Future integrations should use environment variables.

Never commit secrets.

Create:

```text
.env.example
```

---

# 74. Definition of Done

The MVP is complete when I can:

1. Start the application.
2. Create/select Vimal profile.
3. Create/select Wife profile.
4. Upload a Tickertape CSV.
5. See imported holdings.
6. Map an unknown ticker manually.
7. Automatically generate Tickertape URL.
8. Preview import changes.
9. Confirm import.
10. See portfolio dashboard.
11. See total invested.
12. See current value.
13. See P&L.
14. See P&L %.
15. See portfolio allocation.
16. See top/worst performers.
17. Upload another month's CSV.
18. See historical snapshots.
19. See new holdings.
20. See removed holdings.
21. See quantity changes.
22. Compare snapshots.
23. Open an individual security.
24. See its portfolio history.
25. Add investment thesis.
26. Add target price.
27. Add accumulation range.
28. Add stop price.
29. Add conviction.
30. Add tags.
31. Add business information.
32. Add personal notes.
33. Open Tickertape.
34. Use the Focus dashboard.
35. Switch profiles without mixing their data.

---

# 75. Product Success Criteria

The application should answer these questions quickly:

### Portfolio

> How is my portfolio doing?

### Monthly

> What changed since my last CSV?

### Security

> How is this stock doing for me?

### Research

> Why did I buy this stock?

### Decision

> What was my target?

> What was my accumulation zone?

> What was my stop?

> How strong is my conviction?

### Memory

> What does this company actually do?

### Focus

> Which stocks currently need my attention?

If the application can answer those questions quickly, it is succeeding.

---

# 76. Final Product Vision

The long-term application should feel like:

```text
             PERSONAL PORTFOLIO INTELLIGENCE
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼