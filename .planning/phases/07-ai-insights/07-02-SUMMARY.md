---
phase: 07-ai-insights
plan: 02
subsystem: ui
tags: [ai, email-copy, automations, next-js, drizzle, vercel-ai-sdk]

# Dependency graph
requires:
  - phase: 07-ai-insights
    provides: "generateEmailCopy function and AI provider abstraction"
  - phase: 05-automation-engine
    provides: "Automations table, listAutomations query, automation rows"
provides:
  - "POST /api/automations/[id]/generate-copy endpoint calling generateEmailCopy"
  - "EmailCopyGenerator client component with loading/error/3-card suggestion display"
  - "Automation detail page at /automations/[id] showing config + AI copy generator"
  - "Clickable automation names in list page linking to detail pages"
affects: [human-verification-pending]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async params pattern: Next.js 15 dynamic route params are Promises — await params before destructuring"
    - "EmailCopyGenerator client component: fetch on button click, reset suggestions/error on each call"

key-files:
  created:
    - src/app/api/automations/[id]/generate-copy/route.ts
    - src/components/email-copy-generator.tsx
    - src/app/(dashboard)/automations/[id]/page.tsx
  modified:
    - src/app/(dashboard)/automations/page.tsx

key-decisions:
  - "params typed as Promise<{ id: string }> in API route and page to match Next.js 15 async params convention — consistent with existing customers/[id] pattern"
  - "EmailCopyGenerator always renders the AI note text below button regardless of suggestion state — sets expectations before user clicks"
  - "noTemplate guard disables Generate Suggestions button when emailTemplateId is null — prevents meaningless API calls for non-email automations"

patterns-established:
  - "Automation detail page duplicates triggerLabel helper from list page rather than importing — avoids coupling between Server Components in same route group"

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 7 Plan 02: Automation Detail Page with AI Email Copy Generator Summary

**POST /api/automations/[id]/generate-copy endpoint, EmailCopyGenerator client component with 3-card display, and automation detail page at /automations/[id] with configuration + AI section**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T15:54:15Z
- **Completed:** 2026-02-20T15:56:15Z
- **Tasks:** 1 automated (Task 2 pending human verification)
- **Files modified:** 4

## Accomplishments
- Created POST endpoint `/api/automations/[id]/generate-copy` that fetches the automation from DB, extracts templateType/segmentTarget, and calls `generateEmailCopy`
- Created `EmailCopyGenerator` client component with loading state ("Generating..."), error display, 3 suggestion cards (subject bold + body preview muted), and AI-generated content note
- Created automation detail page at `/automations/[id]` with back link, status badge, configuration grid (trigger/delay/action/template/last run), and embedded `EmailCopyGenerator`
- Updated automations list page to wrap each automation name in a `Link` to `/automations/[automation.id]`

## Task Commits

Each task was committed atomically:

1. **Task 1: Email copy generation API and automation detail page** - `951b3da` (feat)

**Task 2 (checkpoint:human-verify):** Pending human verification — both AI-01 and AI-02 features to be verified end-to-end.

## Files Created/Modified
- `src/app/api/automations/[id]/generate-copy/route.ts` - POST endpoint: fetches automation from DB, calls generateEmailCopy, returns { suggestions: [...] }
- `src/components/email-copy-generator.tsx` - Client component with Generate Suggestions button, 3-card suggestion display, loading/error states
- `src/app/(dashboard)/automations/[id]/page.tsx` - Server Component: automation detail page with config grid and EmailCopyGenerator embed
- `src/app/(dashboard)/automations/page.tsx` - Added Link import; wrapped automation.name in `<Link href={/automations/${id}}>` with hover:underline text-primary

## Decisions Made
- **params as Promise<{ id: string }>**: Next.js 15 dynamic route params are async. Both the API route and detail page use `await params` before destructuring, consistent with the existing `customers/[id]` routes in this codebase.
- **Duplicate triggerLabel**: The automation detail page duplicates the `triggerLabel` helper from the list page rather than importing from a shared location, avoiding coupling between Server Components in the same route group.
- **noTemplate guard**: When `emailTemplateId` is null, the Generate Suggestions button is disabled and a muted note is shown — prevents API calls for tag-only automations that have no email template.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None beyond what was already documented in 07-01-SUMMARY.md (GOOGLE_GENERATIVE_AI_API_KEY required).

## Next Phase Readiness
- Phase 7 AI Insights is fully implemented — awaiting human verification (Task 2 checkpoint)
- Both AI-01 (customer insight narrative on 360 profile) and AI-02 (email copy generation on automation detail) are code-complete
- After human verification confirms both features work end-to-end, Phase 7 is complete

---
*Phase: 07-ai-insights*
*Completed: 2026-02-20*

## Self-Check: PASSED
