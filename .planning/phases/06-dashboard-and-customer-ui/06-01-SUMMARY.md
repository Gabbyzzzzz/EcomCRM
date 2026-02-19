---
phase: 06-dashboard-and-customer-ui
plan: 01
subsystem: ui
tags: [recharts, dashboard, server-components, drizzle, decimal.js]

# Dependency graph
requires:
  - phase: 05-automation-engine
    provides: messageLogs table with sentAt and status; automations table; customers/orders tables fully populated
  - phase: 03-rfm-engine
    provides: customer segment field used by segment distribution and churn alerts
  - phase: 04-email-infrastructure
    provides: message_logs rows for emailsSent30d KPI

provides:
  - Dashboard page at / with 4 KPI cards, 2 Recharts charts, churn alerts widget, activity feed
  - getDashboardKpis: single-query 4-metric KPI fetcher
  - getSegmentDistribution: GROUP BY segment for bar chart
  - getRevenueOverTime: daily SUM(total_price) for N days
  - getChurnAlerts: customers in at_risk/hibernating/lost recently updated
  - getRecentActivity: recent message logs + orders with customer join
  - SegmentChart client component (Recharts BarChart with per-segment color)
  - RevenueChart client component (Recharts LineChart with date/revenue formatting)

affects:
  - 06-02-customer-list: shares queries.ts for customer queries
  - future dashboard features that extend KPI cards

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all for parallel server-side data fetching in Next.js Server Components"
    - "db.execute<T>() with sql template literals for aggregate queries not expressible in Drizzle query builder"
    - "Client Components receive pre-fetched data as props — never call DB directly"
    - "shopId derived from new URL(env.SHOPIFY_STORE_URL).hostname — consistent pattern"
    - "Recharts Cell component for per-bar coloring in BarChart"

key-files:
  created:
    - src/components/segment-chart.tsx
    - src/components/revenue-chart.tsx
  modified:
    - src/lib/db/queries.ts
    - src/app/(dashboard)/page.tsx

key-decisions:
  - "db.execute<T>() with sql`` template for getDashboardKpis: single round-trip with 4 correlated subqueries instead of 4 separate queries"
  - "getRevenueOverTime uses (days || ' days')::interval SQL interpolation pattern for safe dynamic interval"
  - "getChurnAlerts uses shopifyUpdatedAt as proxy for segment change recency — acceptable approximation since daily RFM cron updates customers on segment change"
  - "RevenueChart converts revenue string to float for Recharts (parseFloat) while all DB/API layers stay string/Decimal"
  - "Tooltip content={<CustomTooltip />} pattern for RevenueChart — passes JSX rather than render prop for type compatibility"

patterns-established:
  - "Server Component dashboard pattern: fetch all data in parallel with Promise.all, pass as props to Client Components"
  - "Recharts with 'use client' boundary: chart components receive typed data arrays from Server Component parent"
  - "Activity feed merge pattern: concat two typed arrays, sort by time desc, slice to limit"

# Metrics
duration: 8min
completed: 2026-02-19
---

# Phase 6 Plan 01: Dashboard with KPI Cards, Charts, and Activity Feed Summary

**Live-data CRM dashboard with 4 KPI cards, segment distribution BarChart, 90-day revenue LineChart, churn alerts, and merged activity feed — all Server Component with Recharts Client Components receiving pre-fetched props**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-19T00:00:00Z
- **Completed:** 2026-02-19T00:08:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added 5 typed dashboard query functions to queries.ts (getDashboardKpis, getSegmentDistribution, getRevenueOverTime, getChurnAlerts, getRecentActivity) with exported interfaces
- Created SegmentChart and RevenueChart client components using Recharts with empty-state handling and per-segment color coding
- Replaced the dashboard placeholder page with a fully data-driven Server Component that renders 4 KPI cards, 2 charts, churn alert widget, and merged activity feed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dashboard query functions to queries.ts** - `4d88014` (feat)
2. **Task 2: Create Recharts chart components** - `9420514` (feat)
3. **Task 3: Replace dashboard placeholder with data-driven page** - `fd471cb` (feat)

## Files Created/Modified
- `src/lib/db/queries.ts` - Added 5 dashboard query functions + exported interfaces (DashboardKpis, SegmentDistributionItem, RevenueOverTimeItem, ChurnAlertItem, RecentActivity); added `inArray` import
- `src/components/segment-chart.tsx` - Recharts BarChart with per-segment colors via Cell, empty state handling, capitalize XAxis formatter
- `src/components/revenue-chart.tsx` - Recharts LineChart with custom Tooltip, date MM/DD formatter, revenue $K abbreviation, empty state handling
- `src/app/(dashboard)/page.tsx` - Full data-driven dashboard: Promise.all fetch, 4 KPI cards, 2 chart cards, churn alerts with segment badges + customer links, activity feed with relative timestamps

## Decisions Made
- `db.execute<T>()` with a single correlated-subquery SQL for getDashboardKpis — one round-trip instead of 4 queries
- `shopifyUpdatedAt` used as proxy for "recently changed to churn segment" — acceptable approximation documented in code comment
- Revenue strings converted to `parseFloat` only inside chart component — DB/API layers always remain Decimal/string
- `Tooltip content={<CustomTooltip />}` pattern for RevenueChart — avoids Recharts generic Tooltip type complexity while keeping full control over rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip prop type errors in segment-chart.tsx**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** `formatter` prop expected `(value: number | undefined)` not `(value: number)`; `labelFormatter` expected `(label: ReactNode)` not `(label: string)` — strict TypeScript mode caught these
- **Fix:** Updated formatter to accept `number | undefined` with nullish coalescing; updated labelFormatter to accept `unknown` and cast via `String()`
- **Files modified:** src/components/segment-chart.tsx
- **Verification:** `tsc --noEmit` passes with no errors
- **Committed in:** 9420514 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed RevenueChart CustomTooltip placement — must use Tooltip content prop**
- **Found during:** Task 2 (code review before commit)
- **Issue:** `<CustomTooltip />` was placed as a direct child of `<LineChart>` which Recharts ignores; it must be passed via `<Tooltip content={<CustomTooltip />} />`
- **Fix:** Changed to `<Tooltip content={<CustomTooltip />} />`
- **Files modified:** src/components/revenue-chart.tsx
- **Verification:** `tsc --noEmit` passes; pattern is standard Recharts custom tooltip usage
- **Committed in:** 9420514 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 - bug fixes caught during TypeScript verification)
**Impact on plan:** Both fixes necessary for correct chart rendering. No scope creep.

## Issues Encountered
None beyond the two auto-fixed type/usage issues above.

## User Setup Required
None - no external service configuration required. Dashboard reads from existing PostgreSQL tables.

## Next Phase Readiness
- Dashboard page complete and fully type-safe
- Query functions available for reuse in customer list / detail pages (Plan 02)
- Chart components ready to be reused elsewhere in dashboard if needed

---
*Phase: 06-dashboard-and-customer-ui*
*Completed: 2026-02-19*
