---
phase: 05-automation-engine
plan: 02
subsystem: automation
tags: [inngest, drizzle, nextjs, cron, react, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: automation engine core (engine.ts, actions.ts, presets.ts), processFirstOrder, processSegmentChange, processCartAbandoned Inngest functions, 5 automation DB query functions

provides:
  - checkDaysSinceOrder Inngest daily cron (0 3 * * *) scanning customers by lastOrderAt cutoff
  - getRecentMessageLog duplicate-send guard in queries.ts
  - POST /api/automations/seed upserts all 5 PRESET_AUTOMATIONS
  - PATCH /api/automations/[id] enable/disable toggle with zod validation
  - /automations Server Component page listing all flows with status, toggle, last run

affects: [06-ui-dashboard, 07-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline segment filter logic in step.run callbacks to avoid JsonifyObject type incompatibility
    - AutomationToggle client component uses useTransition + router.refresh() for optimistic UI
    - SeedAutomationsButton client component handles empty state with window.location.reload()
    - Duplicate-send guard pattern: getRecentMessageLog before every executeEmailAction in cron

key-files:
  created:
    - src/inngest/functions.ts (checkDaysSinceOrder function added)
    - src/app/api/automations/seed/route.ts
    - src/app/api/automations/[id]/route.ts
    - src/app/(dashboard)/automations/page.tsx
    - src/components/automation-toggle.tsx
    - src/components/seed-automations-button.tsx
  modified:
    - src/lib/db/queries.ts (getRecentMessageLog, messageLogs import, gte import)
    - src/inngest/functions.ts (imports, checkDaysSinceOrder, functions array update)

key-decisions:
  - "Inline segment filter in checkDaysSinceOrder step.run instead of calling evaluateSegmentFilter — avoids JsonifyObject type incompatibility when Inngest serializes AutomationRow dates (createdAt: Date becomes string)"
  - "AutomationToggle uses useTransition + router.refresh() — optimistic pending state without full page reload"
  - "Automations page placed at (dashboard)/automations/page.tsx (not src/app/automations/) to inherit dashboard sidebar layout via Next.js route group"
  - "dedupeWindowStart == cutoffDate for getRecentMessageLog — prevents resending to same customer every cron run until they order again"

patterns-established:
  - "Segment filter inline pattern: read config?.segments, check array includes — use for all future step.run callbacks with Inngest-serialized AutomationRow"
  - "Cron function pattern: const shopId = getShopId() as first line (not event.data — cron has no data object)"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 5 Plan 02: Automation Engine UI + Daily Cron Summary

**Daily cron for days-since-order flows with duplicate-send guard, automation seed API, enable/disable PATCH endpoint, and /automations list page with live toggle**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T14:02:07Z
- **Completed:** 2026-02-19T14:06:20Z
- **Tasks:** 2 auto tasks complete (Task 3 = checkpoint awaiting human verify)
- **Files modified:** 8

## Accomplishments
- checkDaysSinceOrder Inngest function (0 3 * * *) scans all customers, applies segment filter, dedupes via getRecentMessageLog, fires executeEmailAction for eligible customers
- POST /api/automations/seed endpoint upserts all 5 PRESET_AUTOMATIONS via upsertAutomation
- PATCH /api/automations/[id] enables/disables automation with zod-validated body, persists to DB
- /automations page shows all flows with name, trigger (human-readable), delay, action, status badge, last run, and working toggle

## Task Commits

1. **Task 1: Days-since-order cron + duplicate-send guard + seed endpoint** - `7a281b9` (feat)
2. **Task 2: Automation PATCH API + automation list page** - `bedb647` (feat)

## Files Created/Modified
- `src/lib/db/queries.ts` - Added getRecentMessageLog function, messageLogs and gte imports
- `src/inngest/functions.ts` - Added checkDaysSinceOrder function, imports, functions array (now 9 total)
- `src/app/api/automations/seed/route.ts` - POST endpoint seeding 5 preset automations
- `src/app/api/automations/[id]/route.ts` - PATCH endpoint for enable/disable toggle
- `src/app/(dashboard)/automations/page.tsx` - Server Component listing all automations
- `src/components/automation-toggle.tsx` - Client toggle with useTransition + router.refresh()
- `src/components/seed-automations-button.tsx` - Client button for empty state seed action

## Decisions Made
- Inline segment filter in `checkDaysSinceOrder` `step.run` callbacks instead of calling `evaluateSegmentFilter` — when Inngest checkpoints and resumes, AutomationRow dates (createdAt: Date) are serialized to strings (JsonifyObject), causing type incompatibility with the function's typed parameter
- Automations page at `(dashboard)/automations/page.tsx` to inherit sidebar layout from the Next.js route group
- `dedupeWindowStart` equals `cutoffDate` — same time window used for both customer eligibility and dedupe guard, ensuring consistent semantics

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] evaluateSegmentFilter call removed from step.run — Inngest JsonifyObject type incompatibility**
- **Found during:** Task 1 (checkDaysSinceOrder implementation)
- **Issue:** TypeScript error: `JsonifyObject<AutomationRow>` is not assignable to `AutomationRow` because `createdAt: string` (serialized by Inngest) != `createdAt: Date` (typed parameter)
- **Fix:** Replaced `evaluateSegmentFilter(automation, customer.segment)` with inline segment filter reading `config?.segments` array directly
- **Files modified:** src/inngest/functions.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 7a281b9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug/type error)
**Impact on plan:** Required for TypeScript correctness. Inline logic is semantically identical to evaluateSegmentFilter. No scope creep.

## Issues Encountered
- TypeScript binary at `node_modules/.bin/tsc` was broken (incorrect relative require path). Resolved by running TypeScript directly via `node node_modules/typescript/lib/tsc.js --noEmit`.

## User Setup Required
None - no external service configuration required. Human verification in Task 3 checkpoint covers the end-to-end test.

## Next Phase Readiness
- All 9 Inngest functions registered and ready (pending human verify at Task 3 checkpoint)
- Full automation engine complete: 5 flows, daily cron, UI page, enable/disable toggle
- Phase 6 (UI Dashboard) can use listAutomations and the /automations page as foundation
- Phase 7 (Deployment) has all Inngest functions to configure in production

---
*Phase: 05-automation-engine*
*Completed: 2026-02-19*
