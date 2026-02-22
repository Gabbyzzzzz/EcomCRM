---
phase: 13-email-template-editor
plan: 03
subsystem: database, scripts
tags: [drizzle, postgresql, unlayer, email-templates, seeding, tsx]

# Dependency graph
requires:
  - phase: 13-01
    provides: email_templates table and isPreset column for preset seeding

provides:
  - scripts/seed-preset-templates.ts: one-time idempotent seeder inserting 5 preset Unlayer templates
  - 5 preset email templates in email_templates table (Welcome, Abandoned Cart, Repurchase, Win-back, VIP)
  - npm run seed:templates: tsx-based script runner loading .env.local

affects:
  - 14-automation-template-linking (preset templates available for linking to automations)
  - /emails page (5 preset cards with Preset badge now visible)

# Tech tracking
tech-stack:
  added:
    - tsx (via npx) — zero-config TypeScript executor for standalone scripts
  patterns:
    - Idempotent seeding via pre-query + Set-based skip (not onConflictDoNothing, which requires unique constraint)
    - tsx --env-file .env.local pattern for scripts that need Next.js environment without a running server
    - Unlayer Design JSON schemaVersion 12 structure with row/column/contents hierarchy

key-files:
  created:
    - scripts/seed-preset-templates.ts
  modified:
    - package.json

key-decisions:
  - "Used tsx --env-file .env.local instead of ts-node — tsx is zero-config, handles dotenv/config correctly, and env-file flag avoids adding dotenv as runtime dependency"
  - "Idempotent seeding via pre-query + existingNames Set, not onConflictDoNothing — email_templates has no unique(shopId, name) constraint so duplicate INSERTs would succeed silently"
  - "5 Unlayer Design JSON objects use schemaVersion 12 with native heading/text/button/divider block types and 3-row layout (header, body, footer)"

patterns-established:
  - "Seed scripts: scripts/*.ts with npm run seed:[name], use tsx --env-file .env.local"
  - "Unlayer preset layout: header row (brand bg + white heading), body row (text + CTA button), footer row (divider + unsubscribe text)"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 13 Plan 03: Preset Template Seeder Summary

**Idempotent TypeScript seeder inserting 5 Unlayer Design JSON presets (Welcome, Abandoned Cart, Repurchase, Win-back, VIP) into email_templates with is_preset=true, runnable via npm run seed:templates**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T05:35:00Z
- **Completed:** 2026-02-22T05:37:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `scripts/seed-preset-templates.ts` created with 5 complete Unlayer Design JSON objects — each with 3-row layout (branded header, CTA body, unsubscribe footer) using heading, text, button, and divider block types
- Idempotent seeding: pre-queries existing preset names, skips any that already exist — safe to run multiple times
- `npm run seed:templates` script added to package.json using `npx tsx --env-file .env.local`
- Seeder executed: all 5 presets confirmed in database with `is_preset=true`, verified via API at /api/email-templates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create preset seed script with 5 Unlayer Design JSON templates** - `f4a4107` (feat)
2. **Task 2: Add seed:templates npm script and run the seeder** - `45d0b25` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `scripts/seed-preset-templates.ts` - Standalone TypeScript seeder with row/headingBlock/textBlock/buttonBlock/dividerBlock/makeDesign helpers and 5 preset design definitions
- `package.json` - Added `"seed:templates": "npx tsx --env-file .env.local scripts/seed-preset-templates.ts"` to scripts section

## Decisions Made
- Used `tsx --env-file .env.local` rather than ts-node — tsx is zero-config, handles ESM/CJS correctly, and `--env-file` loads .env.local natively without extra setup
- Idempotent approach uses pre-query SELECT + existingNames Set to skip duplicates — `onConflictDoNothing()` would not work since email_templates has no unique constraint on (shop_id, name)
- All 5 designs use schemaVersion 12 (current Unlayer format), with brand colors per template type: blue/amber/green/purple/gold

## Deviations from Plan

None — plan executed exactly as written. The plan itself already anticipated the onConflictDoNothing limitation and specified the pre-query approach.

## Issues Encountered
None — script executed cleanly on first run. TypeScript compiled without errors. Both insertion and idempotency checks worked as expected.

## User Setup Required
None — seeder already executed. 5 presets exist in the database. Re-running `npm run seed:templates` is safe.

## Next Phase Readiness
- 5 preset templates visible on /emails page with Preset badge
- Each preset's Edit button loads the Unlayer editor with the pre-authored design (heading, CTA, footer layout)
- Phase 14 (automation-template-linking) can reference these preset template IDs when linking automations to templates
- Merchants can duplicate any preset to start customizing their own version

---
*Phase: 13-email-template-editor*
*Completed: 2026-02-22*

## Self-Check: PASSED
