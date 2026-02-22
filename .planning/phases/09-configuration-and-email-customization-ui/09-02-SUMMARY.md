---
phase: 09-configuration-and-email-customization-ui
plan: 02
subsystem: ui
tags: [react-email, nextjs, live-preview, controlled-component, debounce]

# Dependency graph
requires:
  - phase: 09-01
    provides: AutomationConfigForm controlled component, PATCH API, AutomationDetailClient pattern

provides:
  - All 5 email templates accept customBody/customHeadline/customCtaText optional props
  - POST /api/automations/[id]/preview endpoint rendering React Email templates with custom overrides
  - EmailPreviewPanel client component with 500ms debounced fetch and srcDoc iframe
  - AutomationDetailClient extracted to src/components/ owning form state shared with live preview

affects:
  - 09-03-email-sending: can now use customBody/customHeadline/customCtaText from actionConfig in executeEmailAction
  - any component rendering automation detail page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Live preview via debounced fetch to server-side render endpoint
    - srcDoc iframe pattern for sandboxed email HTML rendering
    - React.createElement for dynamic template selection in API route
    - Flat props API for client wrapper (initialDelayValue/etc. instead of initialValues object)

key-files:
  created:
    - src/app/api/automations/[id]/preview/route.ts
    - src/components/email-preview-panel.tsx
    - src/components/automation-detail-client.tsx
  modified:
    - src/emails/welcome.tsx
    - src/emails/winback.tsx
    - src/emails/repurchase.tsx
    - src/emails/abandoned-cart.tsx
    - src/emails/vip.tsx
    - src/app/(dashboard)/automations/[id]/page.tsx
    - src/inngest/functions.ts
  deleted:
    - src/app/(dashboard)/automations/[id]/automation-detail-client.tsx

key-decisions:
  - "Preview API uses React.createElement for dynamic template selection — avoids JSX in route file"
  - "EmailPreviewPanel uses srcDoc iframe with sandbox=allow-same-origin for safe HTML rendering"
  - "AutomationDetailClient uses flat props API (initialDelayValue/initialDelayUnit/etc.) — more explicit than initialValues object"
  - "Old automation-detail-client.tsx deleted from page directory after extraction to components/"

patterns-established:
  - "Server-rendered email preview: POST endpoint renders React Email to HTML, client renders in iframe"
  - "Debounce pattern: 500ms setTimeout ref cleared on each render/change via useEffect cleanup"

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 9 Plan 02: Email Template Custom Props and Live Preview Panel Summary

**All 5 React Email templates accept customBody/customHeadline/customCtaText optional props; live preview panel renders selected template in an iframe and updates within 500ms as user edits subject, body, headline, CTA, or discount code — no save required.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-21T14:21:55Z
- **Completed:** 2026-02-21T14:26:57Z
- **Tasks:** 2
- **Files modified:** 8 (including 1 deleted)

## Accomplishments
- Added `customBody`, `customHeadline`, `customCtaText` optional props to all 5 email templates (welcome, winback, repurchase, abandoned-cart, vip) with `??` fallback to defaults
- Created POST `/api/automations/[id]/preview` endpoint that renders any template with custom overrides using React.createElement + @react-email/render
- Built `EmailPreviewPanel` (144 lines) — 500ms debounced fetch, srcDoc iframe with sandbox, loading skeleton, no-template placeholder
- Extracted `AutomationDetailClient` to `src/components/` (176 lines) — owns form state, derives isDirty, passes actionConfig fields to EmailPreviewPanel for real-time preview
- Updated automation detail page to use new components-level client wrapper with flat props API
- Removed obsolete `src/app/(dashboard)/automations/[id]/automation-detail-client.tsx` (superseded)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add custom content props to all 5 email templates** - `469b969` (feat)
2. **Task 2: Create preview API, EmailPreviewPanel, and AutomationDetailClient wrapper** - `89ae7fb` (feat)
3. **Task 2 continuation: Update detail page import** - `d35bb22` (feat)

## Files Created/Modified
- `src/app/api/automations/[id]/preview/route.ts` - POST endpoint; zod schema; React.createElement dispatch; @react-email/render; SUBJECT_MAP defaults
- `src/components/email-preview-panel.tsx` - 'use client'; debounced fetch via setTimeout; srcDoc iframe; loading skeleton; no-template state
- `src/components/automation-detail-client.tsx` - 'use client'; useState + useRef; isDirty; onSave PATCH; onCancel revert; grid layout for form + preview
- `src/emails/welcome.tsx` - Added customHeadline/customBody/customCtaText props + JSX fallback
- `src/emails/winback.tsx` - Added customHeadline/customBody/customCtaText props; customBody overrides days-since paragraph
- `src/emails/repurchase.tsx` - Added customHeadline/customBody/customCtaText props
- `src/emails/abandoned-cart.tsx` - Added customHeadline/customBody/customCtaText props
- `src/emails/vip.tsx` - Added customHeadline/customBody/customCtaText props
- `src/app/(dashboard)/automations/[id]/page.tsx` - Import from @/components, flat props API
- `src/inngest/functions.ts` - Cast actionConfig to Record<string,unknown>|null (bug fix)

## Decisions Made
- Preview API uses `React.createElement` for dynamic template selection instead of JSX — avoids requiring JSX transform in a route file
- `EmailPreviewPanel` renders via `srcDoc` iframe with `sandbox="allow-same-origin"` — provides isolation without blocking styles
- `AutomationDetailClient` uses flat props (separate initialDelayValue, initialDelayUnit, etc.) — more explicit and avoids nested `initialValues` object on the server component call site
- Old local `automation-detail-client.tsx` deleted from page directory after extraction per the Plan 09-01 note that it would be extracted in Plan 09-02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Drizzle jsonb type incompatibility in inngest/functions.ts**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `automation.actionConfig ?? null` (type `{} | null`) is not assignable to `Record<string, unknown> | null` because Drizzle's `jsonb()` without explicit type returns `{}` which lacks the string index signature
- **Fix:** Cast to `(automation.actionConfig as Record<string, unknown> | null) ?? null`
- **Files modified:** src/inngest/functions.ts (line 881)
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** 89ae7fb (Task 2 commit)

**2. [Rule 3 - Blocking] Stash conflict caused page.tsx import to remain at old path**
- **Found during:** Task 2 commit (git stash during TS investigation restored old page.tsx)
- **Issue:** git stash restore left page.tsx importing from `./automation-detail-client` instead of `@/components/automation-detail-client`
- **Fix:** Re-applied import and props update, committed separately as d35bb22
- **Files modified:** src/app/(dashboard)/automations/[id]/page.tsx
- **Committed in:** d35bb22

---

**Total deviations:** 2 auto-fixed (Rule 1 — bug, Rule 3 — blocking)
**Impact on plan:** Minimal — both fixes were inline and required no scope changes.

## Issues Encountered
- Drizzle `jsonb()` columns without explicit generic type parameter return `{}` rather than `Record<string, unknown>` — this requires explicit type casts when passing to typed function parameters
- git stash conflict during investigation caused a page.tsx revert that required re-applying changes

## User Setup Required
None - no external service configuration required. Preview renders with placeholder data (storeName from env.RESEND_FROM_NAME, customerName = "Preview Customer").

## Next Phase Readiness
- All 5 templates ready for 09-03 to use customBody/customHeadline/customCtaText when sending real emails
- PATCH actionConfig fields (subject, body, headline, ctaText, discountCode) now flow through preview in real time
- AutomationDetailClient and EmailPreviewPanel are stable building blocks
- No blockers

## Self-Check: PASSED

All 9 artifact files found. All 3 task commits verified (469b969, 89ae7fb, d35bb22).

---
*Phase: 09-configuration-and-email-customization-ui*
*Completed: 2026-02-21*
