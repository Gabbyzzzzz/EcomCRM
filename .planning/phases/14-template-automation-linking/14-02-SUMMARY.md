---
phase: 14-template-automation-linking
plan: 02
subsystem: ui
tags: [unlayer, email-editor, merge-tags, automation, template-customization]

# Dependency graph
requires:
  - phase: 14-01
    provides: 3-tier template fallback, customTemplateHtml/Json schema columns, PATCH endpoint, preview endpoint
  - phase: 13-email-template-editor
    provides: UnlayerEditor patterns, email-templates API (GET /api/email-templates/[id])
provides:
  - AutomationInlineEditor component with inline Unlayer editor and merge tag registration
  - Customize for this Flow button on automation detail page
  - Clear Customization button (conditional on Tier 1 override being active)
  - substituteVariables now replaces unknown tags with empty string (not raw match)
affects:
  - 14-03 (if any): template linking complete, all 3 tiers functional end-to-end

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline Unlayer editor (non-fullscreen, 500px height) vs fullscreen email library editor
    - setMergeTags() called in onReady for merge tag menu registration
    - Fetch linked template designJson on demand (not pre-loaded) for Customize flow

key-files:
  created:
    - src/components/automation-inline-editor.tsx
  modified:
    - src/components/automation-detail-client.tsx
    - src/app/(dashboard)/automations/[id]/page.tsx
    - src/lib/automation/actions.ts

key-decisions:
  - "AutomationInlineEditor is inline (500px) not fullscreen — visually embedded in automation detail page below template selector"
  - "Customize for this Flow fetches designJson from linked template on demand via GET /api/email-templates/[id] — not pre-loaded to avoid extra DB fetch on page load"
  - "substituteVariables fallback changed from match (raw tag) to empty string — prevents literal {{discount_code}} appearing in sent emails when key is absent"
  - "isCustomizing state controls editor visibility; customDesignJson state pre-loaded with existing custom JSON or fetched from linked template"

patterns-established:
  - "onCustomizeForFlow: 3-way branch — existing custom JSON / fetch linked template JSON / toast error (no template selected)"
  - "Inline editor save: PATCH automation with customTemplateHtml + customTemplateJson, then setCustomTemplateHtml/setCustomDesignJson, then router.refresh()"
  - "Clear customization: window.confirm, PATCH with null/null, reset local state"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 14 Plan 02: Customize for this Flow Inline Editor Summary

**Inline Unlayer editor on automation detail page with 5 merge tags (customer_name, store_name, discount_code, unsubscribe_url, shop_url) and Customize/Clear buttons for per-flow template customization**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T07:57:37Z
- **Completed:** 2026-02-22T08:00:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `AutomationInlineEditor` component that renders an inline (500px) Unlayer editor with merge tags registered via `setMergeTags()` — merchant can insert `{{customer_name}}` etc. from the toolbar
- Added "Customize for this Flow" button to automation detail client that fetches the linked template's design JSON and opens the inline editor (or opens existing custom JSON directly)
- Added "Clear Customization" button (shown only when Tier 1 override is active) that PATCHes both custom columns to null with a confirmation dialog
- Fixed `substituteVariables` to replace unrecognized tags with empty string instead of leaving the raw `{{tag}}` literal in the sent email

## Task Commits

1. **Task 1: Inline Unlayer editor component with merge tags and Customize for this Flow integration** - `51f68cc` (feat)
2. **Task 2: Variable substitution fix — unknown tags to empty string** - `6152019` (fix)

## Files Created/Modified

- `src/components/automation-inline-editor.tsx` — New inline Unlayer editor component; props: automationId, initialDesign, onSave, onClose; registers 5 merge tags in onReady; 500px height; same image upload pattern as UnlayerEditor.tsx
- `src/components/automation-detail-client.tsx` — Added isCustomizing + customDesignJson state; onCustomizeForFlow, onInlineEditorSave, onClearCustomization handlers; "Customize for this Flow" and "Clear Customization" buttons; AutomationInlineEditor rendered inline below template selector
- `src/app/(dashboard)/automations/[id]/page.tsx` — Added initialCustomTemplateJson prop pass-through from automation.customTemplateJson
- `src/lib/automation/actions.ts` — Fixed substituteVariables: `vars[key] ?? ''` instead of `vars[key] ?? match`

## Decisions Made

- Inline editor (500px) not fullscreen — user stays in context of automation detail page; save/cancel in header bar closes it
- Design JSON fetched on-demand when Customize clicked — not pre-loaded on page — avoids extra API call for users who never customize
- `window.confirm` used for Clear Customization confirmation — lightweight, no modal dependency needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] substituteVariables returned raw match for unknown keys**
- **Found during:** Task 2 (variable substitution verification)
- **Issue:** `vars[key] ?? match` meant unknown merge tags like `{{custom_field}}` appeared literally in sent emails instead of being replaced with empty string. Plan spec: "replace the tag with empty string (don't leave `{{discount_code}}` in the output)"
- **Fix:** Changed fallback from `match` to `''`; renamed `match` param to `_match` to satisfy TypeScript unused-variable rule
- **Files modified:** src/lib/automation/actions.ts
- **Verification:** TypeScript passes; regex behavior confirmed by inspection
- **Committed in:** 6152019

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix. No scope creep.

## Issues Encountered

None — existing 14-01 infrastructure (PATCH endpoint, preview endpoint with substituteVariables, 3-tier send fallback) was complete and correct. Task 2 was largely a verification pass with one bug fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Template-Automation Linking phase is fully complete: 3-tier fallback works end-to-end (custom > linked > React Email), per-flow customization with merge tags is live, preview endpoint shows substituted dummy values
- All 5 merge tags injectable from Unlayer UI via merge tag menu
- Ready for Phase 15 or further automation features

---
*Phase: 14-template-automation-linking*
*Completed: 2026-02-22*
