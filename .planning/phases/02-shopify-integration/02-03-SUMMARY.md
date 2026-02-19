---
phase: 02-shopify-integration
plan: "03"
subsystem: ui, api
tags: [sync, shadcn, polling, toast, sonner, settings, nav, client-component, sse, drizzle]

# Dependency graph
requires:
  - phase: 02-shopify-integration
    plan: "02"
    provides: syncLogs table, webhookDeliveries table, getLatestSyncLog query, /api/sync POST/GET, Inngest processShopifyWebhook

provides:
  - GET /api/sync/status: polling endpoint returning status/lastSyncAt/isStale/customersCount/ordersCount/deadLetterCount, ?history=true for last 10 sync_logs
  - SyncIndicator client component: three-state nav indicator (idle/running/stale), auto-sync on first run, completion toast with actual counts
  - /settings/sync page: full sync details, sync history table, dead letter count, Force Full Sync behind Advanced collapsible
  - Dashboard layout: sidebar + top nav with SyncIndicator, Toaster provider
  - SHOP-09 fully satisfied: "Last synced X ago" + stale alert + working Sync Now button

affects: [03-rfm-engine, 04-email-automation, 05-dashboard]

# Tech tracking
tech-stack:
  added:
    - sonner (toast notifications via shadcn add sonner)
    - shadcn/ui: button, popover, badge, card, table, collapsible, alert-dialog
  patterns:
    - Adaptive polling: setInterval→setTimeout chain, 2s when running, 10s when idle
    - Status transition detection via prevStatusRef to fire completion toast exactly once
    - hasAutoTriggered ref prevents duplicate auto-sync on re-render
    - Force-gated destructive action: Collapsible (Advanced toggle) + AlertDialog confirmation

key-files:
  created:
    - src/app/api/sync/status/route.ts
    - src/components/sync-indicator.tsx
    - src/components/sync-status-detail.tsx
    - src/components/sync-actions.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/page.tsx
    - src/app/settings/sync/page.tsx
  modified: []

key-decisions:
  - "Adaptive polling: setTimeout chain (not setInterval) — 2s when running, 10s when idle, avoids drift"
  - "hasAutoTriggered ref: prevents duplicate /api/sync POSTs when React re-renders on mount"
  - "deadLetterCount queried server-side in /api/sync/status, not in client — single fetch returns all needed data"
  - "SyncActions extracted as separate client component from settings page to keep page.tsx as Server Component"

patterns-established:
  - "Status transition tracking: prevStatusRef stores previous status, setSyncStatus callback compares old vs new to detect running→completed"
  - "Auto-destructive gate: Collapsible wraps destructive button, AlertDialog adds secondary confirmation — two-step friction for irreversible operations"

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 2 Plan 03: Sync Status UI Summary

**Nav sync indicator with three visual states (idle/spinner/stale), auto-trigger on first run, live progress polling, completion toast with actual counts, and /settings/sync page with history table, dead letter count, and Force Full Sync behind Advanced collapsible**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-19T06:40:17Z
- **Completed:** 2026-02-19T09:43:41Z
- **Tasks completed:** 3 of 3
- **Files created:** 7, Modified: 0

## Accomplishments

- Created `GET /api/sync/status` endpoint: returns `{ status, lastSyncAt, isStale, customersCount, ordersCount, deadLetterCount }`, plus optional `history[]` (last 10 sync_logs) via `?history=true`
- Built `SyncIndicator` client component: idle (green CheckCircle2), running (spinning RefreshCw + live counter), stale/error (red AlertCircle + red dot badge). Auto-syncs on `lastSyncAt === null`. Fires completion toast with actual customer/order counts on running→completed transition
- Built `SyncStatusDetail` + `SyncActions` for `/settings/sync`: live status, sync history table, dead letter count alert, Force Full Sync behind Advanced collapsible with AlertDialog confirmation
- Created dashboard layout `(dashboard)/layout.tsx` with sidebar, top nav, SyncIndicator, and Sonner Toaster provider

## Task Commits

1. **Task 1: Sync status API endpoint and nav indicator** - `03e91a0` (feat)
2. **Task 2: Settings/sync page with full details and force sync** - `09f3c54` (feat)
3. **Task 3: Human verify checkpoint** - Approved by user (no code commit)

## Files Created/Modified

- `src/app/api/sync/status/route.ts` - GET endpoint: status/counts/isStale/history, deadLetterCount from webhookDeliveries WHERE status='dead_letter'
- `src/components/sync-indicator.tsx` - Three-state nav indicator, auto-sync, adaptive polling, completion toast
- `src/components/sync-status-detail.tsx` - Detailed status + sync history table, dead letter alert
- `src/components/sync-actions.tsx` - Sync Now + Force Full Sync (behind Advanced collapsible + AlertDialog)
- `src/app/(dashboard)/layout.tsx` - Dashboard layout with sidebar, top nav, SyncIndicator, Toaster
- `src/app/(dashboard)/page.tsx` - Dashboard placeholder page
- `src/app/settings/sync/page.tsx` - Settings/sync server page rendering SyncStatusDetail + SyncActions

## Decisions Made

- Adaptive polling uses setTimeout chain (not setInterval) — avoids drift when fetch takes longer than interval
- `hasAutoTriggered` ref prevents duplicate auto-sync POSTs when React double-renders on mount in development
- `deadLetterCount` fetched server-side in the status endpoint, not via a separate client fetch
- `SyncActions` extracted as separate client component to keep `settings/sync/page.tsx` as a Server Component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed 'pending' from SyncStatus type comparison**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** `sync-status-detail.tsx` compared `status === 'pending'` but the `SyncStatus` type union is `'idle' | 'running' | 'completed' | 'failed' | 'no_sync_yet'` — `'pending'` is not in the type (the status API maps pending→running). TypeScript error TS2367.
- **Fix:** Removed `|| syncStatus.status === 'pending'` — the API endpoint already normalizes `pending` to `running` in the response.
- **Files modified:** `src/components/sync-status-detail.tsx`
- **Committed in:** `09f3c54`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type correctness fix. No scope change.

## Issues Encountered

None beyond the auto-fixed type error above.

## User Setup Required

None — no additional env vars or external services needed beyond what was established in 02-01 and 02-02.

## Next Phase Readiness

- 03-rfm-engine: Dashboard layout ready to receive RFM segment visualizations
- 04-email-automation: SyncIndicator pattern (client polling) can be reused for automation run status
- Phase 2 Shopify integration fully complete once human verification (Task 3) passes

---
*Phase: 02-shopify-integration*
*Completed: 2026-02-19*

## Self-Check: PASSED

- src/app/api/sync/status/route.ts: FOUND
- src/components/sync-indicator.tsx: FOUND
- src/components/sync-status-detail.tsx: FOUND
- src/components/sync-actions.tsx: FOUND
- src/app/(dashboard)/layout.tsx: FOUND
- src/app/(dashboard)/page.tsx: FOUND
- src/app/settings/sync/page.tsx: FOUND
- Commit 03e91a0: Task 1
- Commit 09f3c54: Task 2
