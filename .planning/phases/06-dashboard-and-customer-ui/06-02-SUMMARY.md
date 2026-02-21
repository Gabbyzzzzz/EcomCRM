---
phase: 06-dashboard-and-customer-ui
plan: 02
subsystem: ui
tags: [next.js, drizzle-orm, react, tailwind, pagination, search, customer-list]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: db setup, env, schema
  - phase: 03-rfm-engine
    provides: customer segment enum values and RFM scores
provides:
  - "GET /api/customers with Zod-validated pagination, search, and segment filter"
  - "Customer list page at /customers with server-side initial data load"
  - "CustomerFilters client component with debounced search and segment dropdown"
affects: [06-03-customer-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component fetches initial data, Client Component handles subsequent fetches via API route"
    - "ilike() from drizzle-orm for case-insensitive search"
    - "Debounced search via useRef + setTimeout (no external library)"
    - "Segment color badge pattern: champion=green, loyal=blue, potential=purple, new=cyan, at_risk=yellow, hibernating=orange, lost=red"

key-files:
  created:
    - src/app/api/customers/route.ts
    - src/app/(dashboard)/customers/page.tsx
    - src/components/customer-filters.tsx
  modified: []

key-decisions:
  - "Segment filter validation uses VALID_SEGMENTS string array guard (not z.enum) to avoid TS2367 comparison error between enum and empty string"
  - "CustomerFilters tracks search in both useState and useRef — useRef allows debounce closure to read current search without stale capture"
  - "Server Component uses db.$count() helper (Drizzle 0.38+) for clean count query before offset pagination"
  - "lastOrderAt serialized as ISO string in server component initialData to avoid Date serialization across server/client boundary"

patterns-established:
  - "Customer API pattern: two queries (COUNT + data) with shared whereClause built from SQL[] conditions array"
  - "Page renders with initialData from server to avoid empty content flash; client takes over for filter/page changes"

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 6 Plan 02: Customer List Page Summary

**Paginated customer list at /customers with Drizzle ilike search, segment badge filter, and debounced client-side updates — initial data fetched server-side for zero flash**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T14:37:00Z
- **Completed:** 2026-02-19T14:43:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- GET /api/customers with Zod validation, ilike case-insensitive search, segment filter, COUNT + data dual queries, and pagination metadata
- CustomerFilters client component with 300ms debounced search input, segment dropdown, colored segment badges, and previous/next pagination controls
- CustomersPage server component fetches first page on load so table is populated immediately without a client-side loading flash

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/customers endpoint** - `d5694a1` (feat)
2. **Task 2: Customer list page + CustomerFilters** - `562e975` (feat)

## Files Created/Modified
- `src/app/api/customers/route.ts` - GET endpoint with Zod-validated page/limit/search/segment params, dual COUNT + data queries using ilike
- `src/app/(dashboard)/customers/page.tsx` - Server Component that fetches initial data server-side and passes to CustomerFilters
- `src/components/customer-filters.tsx` - Client Component with debounced search, segment select, customer table with segment badges, and pagination controls

## Decisions Made
- Segment filter validation uses `VALID_SEGMENTS` array guard rather than `z.enum([..., ''])` because TypeScript raises TS2367 when comparing a union that includes `''` with `!== ''` narrowing
- `searchRef` useRef tracks search alongside `useState` so the debounce closure can read the current value without stale capture (avoids double fetch)
- `lastOrderAt` serialized as ISO string in server component before passing as initialData, since Date objects cannot cross the server→client boundary in Next.js

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript tsc binary in node_modules/.bin/tsc was broken (missing `../lib/tsc.js` path) — ran type check via `node node_modules/typescript/lib/tsc.js --noEmit` directly. Pre-existing issue unrelated to this plan.
- Pre-existing TS error in `src/components/segment-chart.tsx` (Recharts Formatter type incompatibility from Phase 06-01) was present before this plan; not introduced or worsened here.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Customer list page complete, ready for Phase 06-03 (Customer 360 profile page)
- /customers/[id] route does not yet exist — customer name links will 404 until next plan

## Self-Check: PASSED

- `src/app/api/customers/route.ts` - EXISTS
- `src/app/(dashboard)/customers/page.tsx` - EXISTS
- `src/components/customer-filters.tsx` - EXISTS
- Commit `d5694a1` - EXISTS (Task 1)
- Commit `562e975` - EXISTS (Task 2)

---
*Phase: 06-dashboard-and-customer-ui*
*Completed: 2026-02-19*
