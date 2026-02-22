---
phase: 14-template-automation-linking
plan: 01
subsystem: automation-template-linking
tags: [drizzle, schema, migration, automation, email-templates, 3-tier-fallback, preview]
dependency-graph:
  requires:
    - 13-email-template-editor  # email_templates table and Unlayer editor
  provides:
    - automation template linking via UUID FK
    - 3-tier send fallback (customTemplateHtml -> linkedEmailTemplateId -> React Email)
    - template selector dropdown on automation detail page
    - preview endpoint 3-tier resolution
  affects:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
    - src/lib/automation/actions.ts
    - src/lib/email/send.ts
    - src/app/(dashboard)/automations/[id]/page.tsx
    - src/components/automation-detail-client.tsx
    - src/components/email-preview-panel.tsx
    - src/app/api/automations/[id]/route.ts
    - src/app/api/automations/[id]/preview/route.ts
tech-stack:
  added:
    - substituteVariables() — {{variable}} replacement helper for Tier 1/2 HTML
    - rawHtml param on SendMarketingEmailParams — skips React Email render for raw HTML sends
  patterns:
    - 3-tier template fallback: customTemplateHtml (Tier 1) > linkedEmailTemplateId (Tier 2) > React Email (Tier 3)
    - postgres.js direct migration (drizzle-kit push bug workaround, same as Phase 13)
    - left-join query helper for automation + linked template data
key-files:
  created:
    - drizzle/0008_automation_template_linking.sql
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/queries.ts
    - src/app/api/automations/[id]/route.ts
    - src/app/(dashboard)/automations/[id]/page.tsx
    - src/components/automation-detail-client.tsx
    - src/components/email-preview-panel.tsx
    - src/lib/automation/actions.ts
    - src/lib/email/send.ts
    - src/app/api/automations/[id]/preview/route.ts
decisions:
  - 3-tier template fallback: customTemplateHtml (Tier 1, highest) -> linkedEmailTemplateId HTML (Tier 2) -> React Email switch (Tier 3, always succeeds)
  - rawHtml added to SendMarketingEmailParams to allow Tier 1/2 to bypass React Email render while preserving tracking pixel injection and link rewriting
  - Template selector saves linkedEmailTemplateId with other form changes on Save (not an immediate PATCH on change) for UX consistency
  - PreviewPanel Tier 1 renders customTemplateHtml directly client-side (no API call needed since HTML is already available as prop)
  - substituteVariables() exported from actions.ts and imported by preview/route.ts to share the same replacement logic
  - Migration applied directly via postgres.js ADD COLUMN IF NOT EXISTS (drizzle-kit push bug workaround)
metrics:
  duration: 5 min
  completed: 2026-02-22
  tasks-completed: 2
  files-modified: 9
  files-created: 1
---

# Phase 14 Plan 01: Automation Template Linking Summary

**One-liner:** 3-tier email send fallback linking Unlayer library templates to automations via UUID FK, with selector UI and preview resolution.

## What Was Built

Phase 14-01 connects the email template library (Phase 13) to the automation engine. Previously, Unlayer templates created in /emails were completely siloed from automation send logic. Now:

1. Automations have a `linked_email_template_id` UUID FK column pointing to `email_templates`
2. The automation detail page has a template selector dropdown listing all templates
3. The send pipeline uses a 3-tier fallback: custom flow-specific HTML first, linked library template second, React Email third (never fails)
4. The preview panel resolves the correct tier and shows a tier indicator badge

## Tasks Completed

### Task 1: Schema, migration, and PATCH endpoint (commit: 7008f38)

- Added 3 columns to `automations` pgTable in schema.ts:
  - `linkedEmailTemplateId`: `uuid('linked_email_template_id').references(() => emailTemplates.id)`
  - `customTemplateHtml`: `text('custom_template_html')`
  - `customTemplateJson`: `jsonb('custom_template_json')`
- Created `drizzle/0008_automation_template_linking.sql` and applied via postgres.js (same workaround as Phase 13)
- Added `getAutomationWithTemplate(shopId, automationId)` — left-join query returning automation + linked template HTML/JSON/name
- Added `listEmailTemplatesForDropdown(shopId)` — lightweight `{id, name}` query ordered presets first, then alphabetically
- Updated PATCH endpoint patchSchema with 3 new zod fields (`linkedEmailTemplateId`, `customTemplateHtml`, `customTemplateJson`)
- Wired all 3 new fields into updateSet and included in `hasConfigChanges` check

### Task 2: Template selector UI, 3-tier send fallback, preview endpoint (commit: d84a376)

- **AutomationDetailPage**: fetches `templateOptions` via `listEmailTemplatesForDropdown` in `Promise.all`; passes to `AutomationDetailClient`; updated Email Template label to show tier-aware display (Custom/Linked name/legacy ID)
- **AutomationDetailClient**: added `templateOptions`, `initialLinkedEmailTemplateId`, `initialCustomTemplateHtml` props; `<select>` dropdown with "Default (React Email)" as first option; `linkedEmailTemplateId` tracked in state alongside form values; included in PATCH save; "Custom edits applied" amber badge when `customTemplateHtml` set
- **EmailPreviewPanel**: added `linkedEmailTemplateId` and `customTemplateHtml` props; Tier 1 renders custom HTML directly (no API call); Tier 2 calls preview endpoint with `linkedEmailTemplateId`; Tier 3 uses legacy emailTemplateId; `TierLabel` badge shows active tier
- **actions.ts**: fetches automation row for `customTemplateHtml`/`linkedEmailTemplateId` before send; `substituteVariables()` exported helper replaces `{{customer_name}}`, `{{store_name}}`, `{{unsubscribe_url}}`, `{{discount_code}}`, `{{shop_url}}`; Tier 1/2 send via `sendMarketingEmail` with `rawHtml` param; Tier 3 unchanged React Email switch
- **send.ts**: optional `rawHtml` param on `SendMarketingEmailParams`; when provided skips `templateFactory`/`render` step; tracking pixel + link rewriting still apply to rawHtml
- **preview/route.ts**: `hasCustomTemplate` + `linkedEmailTemplateId` added to previewSchema; Tier 1 fetches `customTemplateHtml` from DB; Tier 2 fetches linked template HTML; both apply `substituteVariables` with preview-safe values; Tier 3 unchanged React Email render

## Decisions Made

- **3-tier fallback order**: customTemplateHtml (Tier 1) > linkedEmailTemplateId HTML (Tier 2) > React Email switch (Tier 3). Tier 3 always succeeds — no null path.
- **rawHtml in SendMarketingEmailParams**: cleanest approach to skip React Email render while keeping all compliance infrastructure (tracking pixel, link rewriting, suppression checks, List-Unsubscribe headers)
- **substituteVariables exported from actions.ts**: shared between send pipeline and preview endpoint to guarantee identical variable replacement logic
- **Template selector saves with form**: does not immediately PATCH on dropdown change — saves with other form changes on the Save button for UX consistency and fewer API calls
- **Tier 1 preview is client-side**: customTemplateHtml is available as a prop, so the panel renders it directly without an API round-trip

## Deviations from Plan

### Auto-added: buildUnsubscribeUrl import in actions.ts

- **Found during**: Task 2, Tier 1/2 send implementation
- **Issue**: substituteVariables needs `unsubscribe_url` value for `{{unsubscribe_url}}` substitution, but the existing pattern in executeEmailAction only built the unsubscribeUrl inside the templateFactory closure (which is bypassed in Tier 1/2)
- **Fix**: Import `buildUnsubscribeUrl` from `@/lib/email/unsubscribe` and compute it before the tier checks so it's available for all tiers
- **Files modified**: `src/lib/automation/actions.ts`
- **Rule**: Rule 2 (missing critical functionality — unsubscribe link compliance)

### Auto-added: shopId scoping for Drizzle query in actions.ts

- **Found during**: Task 2, Tier 1/2 automation row fetch
- **Issue**: TypeScript strict mode requires `shopId` to be unambiguously scoped when passed to `eq()` inside an async closure that also receives it as a function parameter
- **Fix**: Added `const shopId2 = shopId` alias before the query (minimal change, preserves type safety)
- **Files modified**: `src/lib/automation/actions.ts`
- **Rule**: Rule 3 (blocking TypeScript strict issue)

## Self-Check

### Files exist
- `drizzle/0008_automation_template_linking.sql` — FOUND
- `src/lib/db/schema.ts` — FOUND (linkedEmailTemplateId present)
- `src/lib/automation/actions.ts` — FOUND (customTemplateHtml present)
- `src/components/automation-detail-client.tsx` — FOUND (linkedEmailTemplateId present)
- `src/app/api/automations/[id]/preview/route.ts` — FOUND (customTemplateHtml present)

### Commits exist
- `7008f38` — feat(14-01): add automation template linking columns... — FOUND
- `d84a376` — feat(14-01): template selector UI... — FOUND

### TypeScript
- `npx tsc --noEmit` — PASS (0 errors)

## Self-Check: PASSED
