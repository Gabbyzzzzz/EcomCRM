---
phase: 01-foundation
plan: "02"
subsystem: infra
tags: [zod, inngest, react-email, env-validation, next-config]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: Drizzle schema and db singleton — env.ts will be imported by db layer

provides:
  - Zod-validated env singleton (src/lib/env.ts) — all 10 required env vars validated at startup
  - .env.local.example with per-var source instructions for all external services
  - Inngest client singleton (src/inngest/client.ts) with id 'ecomcrm'
  - Inngest functions placeholder (src/inngest/functions.ts) — empty array, ready for Phase 2+
  - /api/inngest serve handler exporting GET, POST, PUT
  - next.config.mjs with serverExternalPackages for React Email compatibility

affects: [phase-02-shopify-sync, phase-03-rfm-engine, phase-04-email, phase-05-automation]

# Tech tracking
tech-stack:
  added:
    - "@react-email/render@2.0.4 — React Email rendering (was nested dep, now explicit)"
    - "decimal.js@10.6.0 — Decimal precision for money values"
    - "inngest@3.52.1 (already present) — Background job handler wired up"
  patterns:
    - "env.ts as single import point for all process.env access — never import process.env directly"
    - "Zod z.string().min(1) for env validation — avoids Zod 4.x deprecated url/email validators"
    - "InngestFunction.Like[] type for functions array — proper TypeScript compatibility with serve()"

key-files:
  created:
    - src/lib/env.ts
    - .env.local.example
    - src/inngest/client.ts
    - src/inngest/functions.ts
    - src/app/api/inngest/route.ts
  modified:
    - next.config.mjs
    - package.json
    - package-lock.json

key-decisions:
  - "Use InngestFunction.Like[] (not GetFunctionOutput<any>[]) for the empty functions array — GetFunctionOutput produces unknown[] which is incompatible with serve()"
  - "serverExternalPackages includes both @react-email/render and @react-email/components to prevent Next.js bundler from failing on Node.js-only internals"
  - "env.ts throws at module load time on missing vars — catches misconfiguration at startup rather than at runtime deep in a request handler"

patterns-established:
  - "All env access goes through src/lib/env.ts — import { env } from '@/lib/env'"
  - "Inngest functions registered in src/inngest/functions.ts array — add functions here in later phases"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 1 Plan 02: Packages, Env Validation, and Inngest Setup Summary

**Zod-validated env singleton for all 10 external service vars, React Email build config, and wired Inngest /api/inngest serve handler**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T04:04:51Z
- **Completed:** 2026-02-19T04:07:51Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Installed @react-email/render and decimal.js as explicit dependencies
- Created src/lib/env.ts validating all 10 env vars at startup with clear error messages
- Wired up Inngest client + serve handler at /api/inngest (GET, POST, PUT exported)
- Updated next.config.mjs with serverExternalPackages to prevent React Email bundling errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install missing packages, env validation, and next.config update** - `3471cb8` (feat)
2. **Task 2: Inngest client, functions placeholder, and serve handler** - `5d5934f` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified

- `src/lib/env.ts` - Zod schema validating DATABASE_URL, SUPABASE, SHOPIFY, RESEND, ANTHROPIC, INNGEST vars; throws with clear error on missing
- `.env.local.example` - Template with source instructions for all 10 env vars; git-tracked, no real values
- `src/inngest/client.ts` - Inngest singleton exported as `inngest` with id 'ecomcrm'
- `src/inngest/functions.ts` - Empty `functions: InngestFunction.Like[]` array placeholder for Phase 2+
- `src/app/api/inngest/route.ts` - Next.js App Router handler serving Inngest (GET, POST, PUT)
- `next.config.mjs` - Added serverExternalPackages for @react-email/render and @react-email/components
- `package.json` - Added @react-email/render@2.0.4 and decimal.js@10.6.0 to dependencies
- `package-lock.json` - Updated lockfile

## Decisions Made

- **InngestFunction.Like[] type:** The plan specified `GetFunctionOutput<any>[]` but that produces `unknown[]` which TypeScript rejects when passed to `serve()`. Used `InngestFunction.Like[]` which is the correct type expected by `serve({ functions })`. (Rule 1 auto-fix)
- **Env validation at module load:** env.ts runs validation immediately on import so missing vars fail fast at startup, not deep in a request handler at runtime.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type incompatibility in functions.ts**
- **Found during:** Task 2 (Inngest client, functions placeholder, and serve handler)
- **Issue:** Plan specified `GetFunctionOutput<any>[]` as the type for the functions array, but this resolves to `unknown[]` which TypeScript (strict mode) rejects when passed to `serve({ functions })` — error: "Type 'unknown[]' is not assignable to type 'readonly Like[]'"
- **Fix:** Changed type to `InngestFunction.Like[]` which is the exact type expected by the serve handler's `functions` parameter
- **Files modified:** src/inngest/functions.ts
- **Verification:** `node tsc.js --noEmit` passes with zero errors (excluding expected env.ts errors from missing env vars)
- **Committed in:** `5d5934f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type error)
**Impact on plan:** Fix was necessary for TypeScript strict mode compliance. No scope creep. Behavior is identical — empty array in both cases.

## Issues Encountered

- TypeScript binary invocation failed via `npx tsc` (Node.js path issue in this environment) — used `node node_modules/typescript/lib/tsc.js --noEmit` directly as workaround.

## User Setup Required

**External services require manual configuration before running the app.**

Required env vars (add to .env.local, see .env.local.example for source instructions):

| Var | Source |
|-----|--------|
| DATABASE_URL | Supabase Dashboard -> Settings -> Database -> Connection string -> Transaction (port 6543) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase Dashboard -> Settings -> API -> Project URL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard -> Settings -> API -> service_role (secret) |
| SHOPIFY_STORE_URL | Your store URL, e.g. https://your-store.myshopify.com |
| SHOPIFY_ACCESS_TOKEN | Shopify Admin -> Apps -> Develop apps -> [Your App] -> API credentials -> Admin API access token |
| SHOPIFY_WEBHOOK_SECRET | Shopify Admin -> Apps -> Develop apps -> [Your App] -> API credentials -> Webhooks -> Signing secret |
| RESEND_API_KEY | resend.com -> API Keys -> Create API Key |
| ANTHROPIC_API_KEY | console.anthropic.com -> API Keys -> Create Key |
| INNGEST_EVENT_KEY | app.inngest.com -> Your App -> Event Keys (or placeholder for local dev with Inngest Dev Server) |
| INNGEST_SIGNING_KEY | app.inngest.com -> Your App -> Signing Key |

Verification: once .env.local is populated, `npm run dev` should start and `curl http://localhost:3000/api/inngest` should return 200.

## Next Phase Readiness

- Env singleton ready — Phase 2 Shopify sync should import from '@/lib/env' to access SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN
- Inngest client ready — Phase 2 sync functions should import `inngest` from '@/inngest/client' and register in functions.ts array
- React Email build config in place — Phase 4 email templates can use @react-email/render without bundling errors
- decimal.js installed — Phase 3 RFM engine and all money calculations can import Decimal directly

---
*Phase: 01-foundation*
*Completed: 2026-02-19*
