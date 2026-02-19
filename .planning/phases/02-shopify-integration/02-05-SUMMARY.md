---
phase: 02-shopify-integration
plan: 05
subsystem: infra
tags: [shopify, env-vars, documentation, oauth, partners-dashboard]

# Dependency graph
requires:
  - phase: 02-shopify-integration
    provides: OAuth client credentials refactor (commit ea8b9bb) that replaced SHOPIFY_ACCESS_TOKEN with SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET in runtime code
provides:
  - Six documentation files accurate to src/lib/env.ts envSchema (Gap 3 resolved)
  - CLAUDE.md Env Vars section matches env.ts exactly (11 vars, no SHOPIFY_ACCESS_TOKEN)
  - REQUIREMENTS.md FOUND-05 lists correct 11 env vars
  - Codebase map docs (STACK.md, INTEGRATIONS.md, STRUCTURE.md, CONCERNS.md) reference OAuth Partners Dashboard pattern correctly
affects: [03-rfm-engine, 04-email-infrastructure, 05-automation-engine, 06-customer-crm, planning-agents]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Documentation mirrors runtime truth: env var docs (CLAUDE.md, codebase maps) always reflect src/lib/env.ts envSchema"

key-files:
  created: []
  modified:
    - CLAUDE.md
    - .planning/REQUIREMENTS.md
    - .planning/codebase/STACK.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/CONCERNS.md

key-decisions:
  - "No SHOPIFY_ACCESS_TOKEN: OAuth client credentials grant (SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET) obtains tokens at runtime — no static access token needed or documented"
  - "11 required env vars total: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHOPIFY_STORE_URL, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, SHOPIFY_WEBHOOK_SECRET, RESEND_API_KEY, ANTHROPIC_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY"

patterns-established:
  - "Gap closure pattern: when runtime code diverges from docs, update all six doc surfaces (CLAUDE.md, REQUIREMENTS.md, STACK.md, INTEGRATIONS.md, STRUCTURE.md, CONCERNS.md)"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 2 Plan 05: Env Var Documentation Gap Closure Summary

**Six documentation files updated to remove SHOPIFY_ACCESS_TOKEN and reflect the OAuth Partners Dashboard client credentials pattern (SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET) matching src/lib/env.ts exactly**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T07:47:39Z
- **Completed:** 2026-02-19T07:49:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Removed all SHOPIFY_ACCESS_TOKEN references from CLAUDE.md, REQUIREMENTS.md, and four codebase map docs
- Updated FOUND-05 requirement to list the correct 11 env vars matching env.ts envSchema
- Updated STACK.md, INTEGRATIONS.md, STRUCTURE.md, CONCERNS.md to reflect OAuth Partners Dashboard auth pattern
- Gap 3 from Phase 2 verification fully resolved — documentation now mirrors runtime truth

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CLAUDE.md and REQUIREMENTS.md env var references** - `55905fd` (docs)
2. **Task 2: Update codebase map docs (STACK.md, INTEGRATIONS.md, STRUCTURE.md, CONCERNS.md)** - `7b88684` (docs)

**Plan metadata:** see final commit (docs: complete plan)

## Files Created/Modified
- `CLAUDE.md` - Removed SHOPIFY_ACCESS_TOKEN line from Shopify Integration section and Env Vars block; clarified OAuth client credentials grant
- `.planning/REQUIREMENTS.md` - FOUND-05 updated from 8 incorrect vars to 11 correct vars matching env.ts
- `.planning/codebase/STACK.md` - Replaced SHOPIFY_ACCESS_TOKEN with SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET; updated Runtime Constraints comment
- `.planning/codebase/INTEGRATIONS.md` - Updated Shopify API auth, Auth Provider section, and Environment Configuration section
- `.planning/codebase/STRUCTURE.md` - Updated .env.local required vars list (11 vars, correct names)
- `.planning/codebase/CONCERNS.md` - Updated Secrets Management risk bullet (10 vars → 11 vars, correct var names)

## Decisions Made
None - documentation-only gap closure. The underlying decision (OAuth client credentials grant replacing static SHOPIFY_ACCESS_TOKEN) was made in commit ea8b9bb during Phase 2. This plan propagated that decision to all documentation surfaces.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All documentation accurately describes the 11 required env vars matching src/lib/env.ts
- Future phases can rely on CLAUDE.md Env Vars section as accurate reference for environment setup
- Gap 3 from Phase 2 verification fully closed — no residual documentation debt

## Self-Check: PASSED

All modified files exist on disk. All task commits (55905fd, 7b88684) verified in git log.

---
*Phase: 02-shopify-integration*
*Completed: 2026-02-19*
