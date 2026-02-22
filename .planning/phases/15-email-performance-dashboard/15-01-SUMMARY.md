---
phase: 15-email-performance-dashboard
plan: "01"
subsystem: ui
tags: [email-metrics, dashboard, drizzle, sql, server-components]

# Dependency graph
requires:
  - phase: 12-open-and-click-tracking
    provides: message_logs table with opened_at, clicked_at columns for tracking computation
  - phase: 05-automation-engine
    provides: automations table and listAutomations pattern
provides:
  - getEmailPerformanceKpis query: aggregate open/click rates for last N days across all automations
  - getAutomationListWithRates query: per-automation open/click rates via LEFT JOIN subquery
  - Dashboard Email Performance section: total sent, open rate, click rate (last 30 days)
  - Automation list open/click rate columns: per-flow performance at a glance
affects: [16-*, future email analytics phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SQL FILTER clause aggregation for multi-metric single-pass queries
    - LEFT JOIN subquery pattern for per-row rate computation from a log table

key-files:
  created: []
  modified:
    - src/lib/db/queries.ts
    - src/app/(dashboard)/page.tsx
    - src/app/(dashboard)/automations/page.tsx

key-decisions:
  - "getEmailPerformanceKpis uses INTERVAL concatenation pattern (consistent with getRevenueOverTime) for parameterized days window"
  - "getAutomationListWithRates uses raw SQL db.execute<Row> + LEFT JOIN subquery — avoids N+1 query issue of calling getAutomationEmailStats per row"
  - "Automation list shows — when rate is 0 (no sends yet) rather than 0% for cleaner UX"
  - "Email Performance section placed between KPI cards and charts in the customers > 0 branch of dashboard"

patterns-established:
  - "LEFT JOIN subquery pattern: compute per-row aggregates from message_logs in a single query rather than N+1 stats calls"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 15 Plan 01: Email Performance Dashboard Summary

**Aggregate email open/click rate KPIs added to main dashboard and per-flow rate columns added to automation list via efficient SQL subquery joins**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T08:14:24Z
- **Completed:** 2026-02-22T08:16:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `getEmailPerformanceKpis(shopId, days=30)` — single SQL query aggregating total sent, opened, clicked and computing open/click rates with zero-guard for the dashboard
- Added `getAutomationListWithRates(shopId)` — replaces `listAutomations` with a LEFT JOIN subquery that computes per-automation open/click rates in one query (avoids N+1)
- Dashboard now shows "Email Performance" section (Total Sent, Open Rate %, Click Rate %) between KPI cards and charts, only when customers exist
- Automation list table now has "Open Rate" and "Click Rate" columns, displaying "—" when no messages have been sent for that flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Add email performance query functions to queries.ts** - `c159191` (feat)
2. **Task 2: Add Email Performance section to dashboard and rate columns to automation list** - `82d3b03` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `src/lib/db/queries.ts` - Added `EmailPerformanceKpis` interface + `getEmailPerformanceKpis()`, `AutomationWithRates` interface + `getAutomationListWithRates()`
- `src/app/(dashboard)/page.tsx` - Added `getEmailPerformanceKpis` import, added to Promise.all, rendered Email Performance card section
- `src/app/(dashboard)/automations/page.tsx` - Replaced `listAutomations` import with `getAutomationListWithRates`, added Open Rate and Click Rate columns to table header and rows

## Decisions Made
- `getAutomationListWithRates` uses raw SQL (`db.execute<Row>`) with a LEFT JOIN subquery instead of calling `getAutomationEmailStats` per row — avoids N+1 queries for the list view
- Automation list displays "—" when rate is 0 (no sends) rather than "0%" — cleaner UX signal distinguishing "no data" from actual 0% rate
- Email Performance section placed inside the `kpis.totalCustomers > 0` branch (not in empty state) — consistent with all other data sections

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PERF-01 (dashboard email performance) and PERF-02 (automation list rate columns) are complete
- Email performance data is now visible to merchants at both aggregate and per-flow granularity
- Ready for Phase 16 (next planned phase per ROADMAP)

---
*Phase: 15-email-performance-dashboard*
*Completed: 2026-02-22*

## Self-Check: PASSED

- FOUND: src/lib/db/queries.ts
- FOUND: src/app/(dashboard)/page.tsx
- FOUND: src/app/(dashboard)/automations/page.tsx
- FOUND: .planning/phases/15-email-performance-dashboard/15-01-SUMMARY.md
- FOUND commit: c159191 (Task 1)
- FOUND commit: 82d3b03 (Task 2)
