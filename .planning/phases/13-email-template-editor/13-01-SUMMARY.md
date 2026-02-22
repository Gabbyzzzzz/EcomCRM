---
phase: 13-email-template-editor
plan: 01
subsystem: database, api, ui
tags: [drizzle, postgresql, nextjs, react, email-templates]

# Dependency graph
requires:
  - phase: 12-open-and-click-tracking
    provides: emailClicks table and queries.ts patterns used as reference
provides:
  - email_templates PostgreSQL table (id, shop_id, name, html, design_json, is_preset, created_at, updated_at)
  - 6 CRUD query functions for email templates in queries.ts
  - GET/POST /api/email-templates REST endpoints
  - GET/PUT/DELETE/POST(duplicate) /api/email-templates/[id] REST endpoints
  - DB-backed /emails page with colored placeholder cards and Create/Duplicate/Delete actions
affects:
  - 13-02 (Unlayer editor - uses emailTemplates schema and API routes)
  - 13-03 (Preset templates - inserts into email_templates table)
  - 14-automation-template-linking (links automations to email_templates)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - getShopId() inline pattern using new URL(env.SHOPIFY_STORE_URL).hostname in API routes
    - Drizzle $inferSelect for EmailTemplateRow type definition
    - Server Component page with extracted 'use client' subcomponents in _components/ directory
    - UUID regex validation in API route handlers before DB queries
    - Deterministic color hash for template placeholder thumbnails

key-files:
  created:
    - src/app/api/email-templates/route.ts
    - src/app/api/email-templates/[id]/route.ts
    - src/app/(dashboard)/emails/_components/CreateTemplateButton.tsx
    - src/app/(dashboard)/emails/_components/TemplateCardActions.tsx
    - drizzle/0007_email_templates.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
    - src/app/(dashboard)/emails/page.tsx

key-decisions:
  - "drizzle-kit push bug workaround: applied migration directly via postgres.js client (drizzle-kit push fails with TypeError on pg_check constraints in this drizzle-kit version)"
  - "Duplicate action uses POST /api/email-templates/[id]?action=duplicate rather than a separate /duplicate route — keeps route structure simple"
  - "TemplateCardActions extracted to _components/TemplateCardActions.tsx as 'use client' component — Duplicate/Delete require client-side fetch + router.refresh()"
  - "CreateTemplateButton extracted to _components/CreateTemplateButton.tsx — POSTs to API then router.push to editor URL"

patterns-established:
  - "Email template API: zod validation on all inputs, UUID regex check on [id] params, 400 on invalid format"
  - "_components/ subdirectory pattern for collocating client components with their server-component page"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 13 Plan 01: Email Templates Foundation Summary

**PostgreSQL email_templates table, 6 Drizzle CRUD query functions, REST API routes (list/create/get/update/delete/duplicate), and a DB-backed /emails page with colored placeholder cards, Create New, Duplicate, and Delete actions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T05:22:36Z
- **Completed:** 2026-02-22T05:26:49Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- email_templates table created in PostgreSQL with 8 columns and 2 indexes (shop_id, is_preset)
- 6 email template CRUD functions added to queries.ts: list, get, create, update, delete, duplicate
- REST API routes for full CRUD + duplicate action at /api/email-templates and /api/email-templates/[id]
- /emails page fully replaced: DB-backed Server Component with colored placeholder thumbnails, Create New button, Duplicate + Delete actions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add emailTemplates schema, migration, and CRUD query functions** - `2237b41` (feat)
2. **Task 2: Create email-templates API routes and rebuild /emails list page** - `04d3da2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/db/schema.ts` - Added emailTemplates pgTable definition with 8 columns and 2 indexes
- `src/lib/db/queries.ts` - Added emailTemplates import and 6 CRUD query functions
- `drizzle/0007_email_templates.sql` - Migration SQL for email_templates table
- `drizzle/meta/_journal.json` - Updated journal to reference renamed migration tag
- `drizzle/meta/0007_snapshot.json` - Drizzle schema snapshot for migration 7
- `src/app/api/email-templates/route.ts` - GET list + POST create (zod-validated) endpoints
- `src/app/api/email-templates/[id]/route.ts` - GET/PUT/DELETE + POST?action=duplicate endpoints
- `src/app/(dashboard)/emails/page.tsx` - Replaced static template list with DB-backed Server Component
- `src/app/(dashboard)/emails/_components/CreateTemplateButton.tsx` - Client component: POST + router.push to editor
- `src/app/(dashboard)/emails/_components/TemplateCardActions.tsx` - Client component: Duplicate + Delete with confirmation

## Decisions Made
- drizzle-kit push has a bug with this drizzle-kit version (TypeError on pg_check constraints during schema pull). Applied migration directly via postgres.js client — same SQL from generated file.
- Duplicate action uses POST /api/email-templates/[id]?action=duplicate rather than a nested /duplicate route — keeps routing structure clean for a single action.
- Client components extracted to _components/ subdirectory within the emails route to keep collocated with their page.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used postgres.js for migration instead of drizzle-kit push**
- **Found during:** Task 1 (migration application)
- **Issue:** `npx drizzle-kit push` fails with `TypeError: Cannot read properties of undefined (reading 'replace')` when pulling existing schema — known bug in drizzle-kit related to pg_check constraints
- **Fix:** Applied the generated SQL migration directly via postgres.js client using the exact same SQL from 0007_email_templates.sql. Result is identical.
- **Files modified:** None (DB-only operation)
- **Verification:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'email_templates'` returns all 8 expected columns
- **Committed in:** 2237b41 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking workaround)
**Impact on plan:** Workaround applied transparently — table exists in DB with correct schema. No scope change.

## Issues Encountered
- drizzle-kit push crashes on this codebase due to existing pg_check constraints — same issue encountered in Phase 12. Used postgres.js direct execution as reliable workaround.

## User Setup Required
None - no external service configuration required. Migration applied automatically.

## Next Phase Readiness
- email_templates table exists with correct schema
- API routes fully functional at /api/email-templates and /api/email-templates/[id]
- /emails page renders from database with Create/Duplicate/Delete actions
- Plan 02 (Unlayer editor) can immediately add the editor page at /emails/[id]/edit
- Plan 03 (preset templates) can use createEmailTemplate() with isPreset=true to seed presets

---
*Phase: 13-email-template-editor*
*Completed: 2026-02-22*

## Self-Check: PASSED
