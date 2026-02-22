---
phase: 15-email-performance-dashboard
plan: "02"
subsystem: ui
tags: [email-metrics, recharts, time-series, line-chart, automation-detail, drizzle, sql]

# Dependency graph
requires:
  - phase: 15-01
    provides: email performance KPI query pattern and automation detail page structure
  - phase: 12-open-and-click-tracking
    provides: message_logs table with opened_at, clicked_at, sent_at columns for time-series aggregation
provides:
  - getAutomationEmailTimeSeries query: daily sends/opens/clicks time-series for a single automation
  - EmailPerformanceChart component: Recharts LineChart with three lines (sent/opened/clicked)
  - Automation detail 'Performance Over Time' section: time-series chart embedded between stat cards and Configuration
  - PERF-04 verified: customer profile Message History engagement column with CheckIcon/EyeIcon/Link2Icon (Phase 12-02, unchanged)
affects: [16-*, future email analytics phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Time-series line chart with Legend + custom Tooltip following revenue-chart.tsx pattern
    - SQL GROUP BY DATE(sent_at) with FILTER clause for multi-metric daily bucketing

key-files:
  created:
    - src/components/email-performance-chart.tsx
  modified:
    - src/lib/db/queries.ts
    - src/app/(dashboard)/automations/[id]/page.tsx

key-decisions:
  - "getAutomationEmailTimeSeries uses same db.execute<Row>(sql`...`) + Date instanceof guard pattern as getRevenueOverTime for consistent date handling"
  - "EmailPerformanceChart renders 'No email data yet' empty state (not null) for graceful handling before any emails are sent"
  - "PERF-04 (customer profile engagement icons) confirmed complete from Phase 12-02 — CheckIcon/EyeIcon/Link2Icon already in customers/[id]/page.tsx, no changes needed"

patterns-established:
  - "Multi-series line chart pattern: three Line elements with distinct colors (blue/green/amber), dot=false, activeDot, Legend, custom Tooltip"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 15 Plan 02: Email Performance Time-Series Chart Summary

**Sends/opens/clicks time-series line chart added to automation detail page using Recharts, backed by new SQL GROUP BY DATE daily aggregation query**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T08:18:51Z
- **Completed:** 2026-02-22T08:20:02Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Added `getAutomationEmailTimeSeries(shopId, automationId, days=30)` to queries.ts — groups message_logs by DATE(sent_at), returns `EmailTimeSeriesItem[]` with date, sent, opened, clicked per day
- Created `src/components/email-performance-chart.tsx` — Recharts LineChart with 3 colored lines (sent=blue-500, opened=green-500, clicked=amber-500), custom Tooltip, Legend, and empty state
- Wired chart into automation detail page between Email Performance stat cards and Configuration section — "Performance Over Time" heading with subtitle
- Verified PERF-04 complete: customer profile at `customers/[id]/page.tsx` already has CheckIcon (sent), EyeIcon (opened), Link2Icon (clicked) engagement column from Phase 12-02

## Task Commits

Each task was committed atomically:

1. **Task 1: Add time-series query and EmailPerformanceChart component** - `293a041` (feat)
2. **Task 2: Wire chart into automation detail and verify PERF-04** - `79fc33a` (feat)

## Files Created/Modified
- `src/lib/db/queries.ts` - Added `EmailTimeSeriesItem` interface + `getAutomationEmailTimeSeries()` query function
- `src/components/email-performance-chart.tsx` - New Recharts line chart client component with 3-series display and empty state
- `src/app/(dashboard)/automations/[id]/page.tsx` - Imported and wired `getAutomationEmailTimeSeries` + `EmailPerformanceChart`, added "Performance Over Time" section

## Decisions Made
- `getAutomationEmailTimeSeries` uses the same `db.execute<Row>(sql\`...\`)` pattern with `Date instanceof Date ? .toISOString().slice(0,10) : String(r.date)` date guard — consistent with `getRevenueOverTime`
- Empty state renders "No email data yet" text in a 300px container — graceful handling before any messages are sent for this automation
- PERF-04 required no code changes — verified as already complete from Phase 12-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PERF-03 (automation time-series chart) and PERF-04 (customer engagement icons) are now both complete
- Phase 15 is fully complete (both plans done)
- Ready for Phase 16 per ROADMAP

---
*Phase: 15-email-performance-dashboard*
*Completed: 2026-02-22*

## Self-Check: PASSED

- FOUND: src/lib/db/queries.ts
- FOUND: src/components/email-performance-chart.tsx
- FOUND: src/app/(dashboard)/automations/[id]/page.tsx
- FOUND: .planning/phases/15-email-performance-dashboard/15-02-SUMMARY.md
- FOUND commit: 293a041 (Task 1)
- FOUND commit: 79fc33a (Task 2)
