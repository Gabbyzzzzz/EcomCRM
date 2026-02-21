---
phase: 06-dashboard-and-customer-ui
plan: 03
subsystem: ui
tags: [next.js, server-components, drizzle, tailwind, customer-profile, rfm]

# Dependency graph
requires:
  - phase: 06-dashboard-and-customer-ui
    provides: 06-01 dashboard queries.ts patterns; 06-02 customer list page with segment badge colors
  - phase: 05-automation-engine
    provides: messageLogs table with sentAt/openedAt/clickedAt; automations table with name
  - phase: 03-rfm-engine
    provides: customer rfmR, rfmF, rfmM, segment fields

provides:
  - Customer 360 profile page at /customers/[id]
  - getCustomerProfile: single customer fetch by internal UUID
  - getCustomerOrders: all orders for a customer ordered by date desc
  - getCustomerMessages: message logs joined with automations ordered by sentAt desc
  - Visual RFM score bars (w-1/5 through w-full per score value 1-5)
  - Order history table with financial status badges
  - Message history table with open/click timestamp display

affects:
  - Phase 7 (if any future phases reference customer profile patterns)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all for three parallel server-side queries in Next.js Server Component"
    - "notFound() from next/navigation for missing customer 404 handling"
    - "Tailwind width class array indexed by score-1 for RFM visual bars"
    - "leftJoin automations on messageLogs for automation name without separate query"

key-files:
  created:
    - src/app/(dashboard)/customers/[id]/page.tsx
  modified:
    - src/lib/db/queries.ts

key-decisions:
  - "getCustomerProfile uses customers.id (internal UUID) not shopifyId — profile page URL uses internal ID for stable routing"
  - "RFM visual bars use Tailwind w-1/5 through w-full array indexed by score-1 — avoids dynamic class generation issues"
  - "getCustomerMessages uses leftJoin(automations) for automation name — avoids N+1 queries"
  - "DB schema migration applied inline (Rule 3 fix) — marketing_opted_out column and suppressions table were missing from DB"

patterns-established:
  - "Customer profile pattern: Promise.all([getCustomerProfile, getCustomerOrders, getCustomerMessages]) in Server Component"
  - "notFound() pattern: if (!customer) notFound() — clean 404 for invalid UUIDs"
  - "Score bar pattern: widthClasses[score-1] array for proportional visual indicators without dynamic Tailwind"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 6 Plan 03: Customer 360 Profile Page Summary

**Server Component customer profile at /customers/[id] with RFM visual score bars, order history table, message history with open/click timestamps, Shopify tags, and financials — all fetched in parallel via Promise.all**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-19T14:47:03Z
- **Completed:** 2026-02-19T14:51:00Z
- **Tasks:** 1 of 2 auto tasks complete (Task 2 is checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments
- Added three query functions to queries.ts: getCustomerProfile, getCustomerOrders, getCustomerMessages with proper joins and ordering
- Created full customer 360 profile page with 5 sections: header, info/RFM/financials card row, tags, order history, message history
- Visual RFM score bars using Tailwind width classes proportional to score (1-5 → w-1/5 to w-full)
- Order history table with financial status color badges; message history table with open/click status
- Applied missing DB schema changes (marketing_opted_out column, suppressions table) that were pending

## Task Commits

Each task was committed atomically:

1. **Task 1: Add customer profile query functions and build the 360 profile page** - `ec5e6ac` (feat)

## Files Created/Modified
- `src/app/(dashboard)/customers/[id]/page.tsx` - Customer 360 profile Server Component: header with back link + segment badge; 3-column info/RFM/financials grid; tags section; order history table; message history table with open/click timestamps
- `src/lib/db/queries.ts` - Added getCustomerProfile, getCustomerOrders, getCustomerMessages query functions

## Decisions Made
- `getCustomerProfile` uses internal `customers.id` (UUID) not `shopifyId` — the profile page URL is `/customers/[uuid]` matching the internal PK used throughout the app
- RFM score bars use `widthClasses[score-1]` array pattern (`['w-1/5', 'w-2/5', 'w-3/5', 'w-4/5', 'w-full']`) — avoids dynamic Tailwind class generation, all classes statically present for purging
- `getCustomerMessages` uses `leftJoin(automations)` to fetch automation name in a single query

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied missing DB schema migrations (marketing_opted_out column, suppressions table)**
- **Found during:** Task 1 verification (dev server startup)
- **Issue:** Customers page returned 500 with `PostgresError: column "marketing_opted_out" does not exist`. Migrations 0003 and 0004 were generated but never applied to the database. The `suppressions` table was also missing.
- **Fix:** Applied the DDL directly via postgres.js node script: created `suppression_reason` enum, added `message_status` enum values ('suppressed', 'failed'), created `suppressions` table with indexes, added `marketing_opted_out` column to `customers`, and created `automations_shop_name_unique` index.
- **Files modified:** Database schema (no code file changes needed — migration SQL was already in drizzle/0003 and 0004)
- **Verification:** `curl http://localhost:3001/customers` returns 200; `curl http://localhost:3001/` returns 200; `curl http://localhost:3001/customers/[uuid]` returns 200; non-existent UUID returns 404
- **Committed in:** Not committed (infrastructure change, no code files modified)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking DB schema mismatch)
**Impact on plan:** Required fix — without this, both /customers and /customers/[id] pages would error. No scope creep.

## Issues Encountered
- `npx tsc --noEmit` invocation fails with MODULE_NOT_FOUND for the .bin/tsc wrapper. Worked around by calling `node node_modules/typescript/lib/tsc.js --noEmit --project tsconfig.json` directly. TypeScript check passes with zero errors.

## User Setup Required
None - no external service configuration required. Profile page reads from existing PostgreSQL tables.

## Next Phase Readiness
- Customer 360 profile complete and fully type-safe
- All Phase 6 automated tasks complete — awaiting human verification checkpoint (Task 2)
- Dashboard, customer list, and customer profile all functional with live DB data

---
*Phase: 06-dashboard-and-customer-ui*
*Completed: 2026-02-19*
