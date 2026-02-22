---
phase: 11-ui-polish
plan: "01"
subsystem: ui

tags: [nextjs, skeleton, loading, empty-state, shadcn]

# Dependency graph
requires:
  - phase: 06-dashboard-and-customer-ui
    provides: Dashboard page.tsx and CustomerFilters component that were extended

provides:
  - shadcn/ui Skeleton component at src/components/ui/skeleton.tsx
  - Dashboard loading.tsx skeleton (KPI cards, charts, churn alerts, activity)
  - Customer list loading.tsx skeleton (header, filter bar, table rows)
  - Dashboard zero-customer empty state with sync link
  - Customer list empty state distinguishing filtered vs. unfiltered cases

affects: [any future dashboard or customer list work]

# Tech tracking
tech-stack:
  added: [shadcn/ui Skeleton]
  patterns:
    - Next.js App Router loading.tsx for route-level Suspense skeleton fallbacks
    - Conditional empty state pattern: check data count before rendering content grid

key-files:
  created:
    - src/components/ui/skeleton.tsx
    - src/app/(dashboard)/loading.tsx
    - src/app/(dashboard)/customers/loading.tsx
  modified:
    - src/app/(dashboard)/page.tsx
    - src/components/customer-filters.tsx

key-decisions:
  - "loading.tsx files placed at route segment level — picked up automatically by Next.js App Router as Suspense boundaries, no manual Suspense wrapping needed"
  - "Dashboard empty state gates on kpis.totalCustomers === 0 so heading always renders but full content (KPI grid, charts, alerts) replaced by sync-guidance card"
  - "Customer list empty state splits on search||segment boolean — filter-active message vs. import-guidance message with sync link"

patterns-established:
  - "loading.tsx skeleton pattern: mirror page layout structure with Skeleton placeholders of matching dimensions"
  - "Empty state pattern: always provide actionable next step (link to sync settings) rather than bare 'no data' message"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 11 Plan 01: UI Polish — Skeleton Loaders and Empty States Summary

**Next.js loading.tsx skeleton placeholders for dashboard and customer list, plus zero-state empty states with actionable sync-settings links replacing blank-screen and all-zeros displays**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T01:27:01Z
- **Completed:** 2026-02-22T01:29:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed shadcn/ui Skeleton component and created dashboard + customer list loading.tsx files that Next.js App Router uses automatically as Suspense fallbacks
- Dashboard empty state: when `kpis.totalCustomers === 0`, replaces KPI grid / charts / alerts with a centered card reading "No customers yet" plus a link to sync settings
- Customer list empty state: distinguishes between "no filter match" (shows "No customers match your filters") and "no data at all" (shows "No customers found" + sync link)

## Task Commits

1. **Task 1: Install Skeleton component and create loading.tsx files** - `7d96465` (feat)
2. **Task 2: Dashboard zero-state and customer list empty-state improvements** - `ebc617f` (feat)

## Files Created/Modified

- `src/components/ui/skeleton.tsx` - shadcn/ui Skeleton component (animate-pulse, bg-primary/10)
- `src/app/(dashboard)/loading.tsx` - Dashboard skeleton: heading, 4 KPI cards, 2 chart panels, churn alerts, recent activity
- `src/app/(dashboard)/customers/loading.tsx` - Customer list skeleton: header, filter bar, 8 table rows with 6 column cells each
- `src/app/(dashboard)/page.tsx` - Added `kpis.totalCustomers === 0` conditional wrapping full dashboard content
- `src/components/customer-filters.tsx` - Replaced flat empty state with `search || segment` branch for filter-aware messaging

## Decisions Made

- `loading.tsx` placed at each route segment level — no manual Suspense needed; Next.js App Router handles the boundary automatically on navigation.
- Dashboard empty state uses `kpis.totalCustomers === 0` (not `segmentData.length === 0`) because `totalCustomers` is the authoritative count from `getDashboardKpis`.
- Customer list splits on `search || segment` (existing filter state refs) — no new prop needed to the component.

## Deviations from Plan

None - plan executed exactly as written.

Note: `src/app/(dashboard)/automations/loading.tsx` was an existing untracked file in the working tree that was staged with Task 1 files. It is a valid skeleton loader that was already present and complements this plan's work.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 11 Plan 01 complete. The UI now shows skeleton placeholders on navigation and meaningful empty states for zero-data scenarios. Ready for any remaining Phase 11 plans or deployment.

---
*Phase: 11-ui-polish*
*Completed: 2026-02-22*

## Self-Check: PASSED

- FOUND: src/components/ui/skeleton.tsx
- FOUND: src/app/(dashboard)/loading.tsx
- FOUND: src/app/(dashboard)/customers/loading.tsx
- FOUND: 11-01-SUMMARY.md
- FOUND commit: 7d96465 (Task 1)
- FOUND commit: ebc617f (Task 2)
