---
phase: 01-foundation
plan: "01"
subsystem: database
tags: [drizzle, postgresql, supabase, pgbouncer, schema, migrations, enums]

# Dependency graph
requires: []
provides:
  - Drizzle ORM schema with 6 enums and 4 tables (customers, orders, automations, message_logs)
  - db singleton with PgBouncer-safe postgres client (prepare: false)
  - drizzle.config.ts pointing at schema with out: ./drizzle
  - Generated migration SQL with all CREATE TYPE + CREATE TABLE + INDEX statements
  - queries.ts placeholder module for future query functions
affects:
  - 01-02 (env validation uses same db singleton)
  - phase-02 (Shopify sync writes to customers + orders tables)
  - phase-03 (RFM engine reads/writes customers.segment, rfm_r/f/m columns)
  - phase-04 (email automation reads automations + messageLogs tables)
  - all subsequent phases (all DB access goes through db singleton from index.ts)

# Tech tracking
tech-stack:
  added:
    - drizzle-orm (schema + query builder, already in package.json)
    - drizzle-kit (migration tooling, already in package.json)
    - postgres (pg driver for Node.js, already in package.json)
    - dotenv (dev dependency, installed during execution for drizzle.config.ts)
  patterns:
    - pgEnum exported at top level so drizzle-kit generates CREATE TYPE before CREATE TABLE
    - postgres({ prepare: false }) for Supabase Transaction mode pooler on port 6543
    - db singleton in src/lib/db/index.ts imported throughout app
    - numeric(19,4) for all money columns (never float)
    - All tables include shop_id for future multi-tenant support

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/lib/db/queries.ts
    - drizzle.config.ts
    - drizzle/0000_wonderful_violations.sql
    - drizzle/meta/_journal.json
    - drizzle/meta/0000_snapshot.json
  modified:
    - package.json (added dotenv dev dependency)
    - package-lock.json

key-decisions:
  - "prepare: false on postgres client is mandatory for Supabase Transaction mode pooler (port 6543) — omitting causes 'prepared statements are not supported' errors under load"
  - "All pgEnums must be exported with export const at module top level — drizzle-kit silently skips non-exported enums, producing missing CREATE TYPE in migration"
  - "numeric(19,4) used for all money fields (total_spent, avg_order_value, total_price) — never float to avoid precision loss"
  - "shop_id column on every table enables future multi-tenant support without schema migration"

patterns-established:
  - "Pattern 1: db singleton import — all server code imports { db } from '@/lib/db'"
  - "Pattern 2: money as numeric — all monetary values use numeric(19,4), handled as string/Decimal in application code"
  - "Pattern 3: PgBouncer-safe — postgres client initialized with { prepare: false } for serverless/Supabase compatibility"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 1 Plan 01: Database Schema and Migration Summary

**Drizzle ORM schema with 6 PostgreSQL enums and 4 tables, PgBouncer-safe db singleton, and generated migration SQL with 13 indexes and 3 FK constraints**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T04:04:50Z
- **Completed:** 2026-02-19T04:07:03Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Schema defines all 6 enums (customerSegment, triggerType, actionType, messageChannel, messageStatus, financialStatus) and 4 tables (customers, orders, automations, messageLogs) with correct columns and indexes
- db singleton uses `{ prepare: false }` for Supabase Transaction mode pooler compatibility on port 6543
- Migration SQL generated with all 6 CREATE TYPE statements before CREATE TABLE, 13 CREATE INDEX statements, and 3 FK constraints

## Task Commits

Each task was committed atomically:

1. **Task 1: Drizzle schema, DB singleton, and migration config** - `657ef0b` (feat)
2. **Task 2: Generate migration SQL from schema** - `1ddd8e8` (feat)

**Plan metadata:** see final commit (docs: complete 01-01 plan)

## Files Created/Modified

- `src/lib/db/schema.ts` - 6 exported enums + 4 exported tables (10 total exports), all indexes defined inline
- `src/lib/db/index.ts` - db singleton with postgres({ prepare: false }) client, imports env for startup validation
- `src/lib/db/queries.ts` - empty placeholder module (populated in later phases)
- `drizzle.config.ts` - drizzle-kit config: dialect postgresql, schema ./src/lib/db/schema.ts, out ./drizzle
- `drizzle/0000_wonderful_violations.sql` - generated migration: 6 CREATE TYPE + 4 CREATE TABLE + 3 FK ALTER TABLE + 13 CREATE INDEX
- `drizzle/meta/_journal.json` - migration journal (git-tracked)
- `drizzle/meta/0000_snapshot.json` - schema snapshot for diffing
- `package.json` - added dotenv dev dependency
- `package-lock.json` - updated lock file

## Decisions Made

- `prepare: false` is mandatory for Supabase Transaction mode pooler (port 6543) — without it, serverless functions hit "prepared statements are not supported" errors under concurrent load
- All pgEnums exported with `export const` at module top level — drizzle-kit silently skips non-exported enums, which would produce missing CREATE TYPE in the migration SQL
- `numeric(19,4)` for all money columns to avoid floating-point precision loss
- `shop_id` on every table enables future multi-tenancy without schema migration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing dotenv dev dependency**
- **Found during:** Task 2 (generate migration SQL)
- **Issue:** `drizzle.config.ts` has `import 'dotenv/config'` but dotenv was not in package.json, causing `Cannot find module 'dotenv/config'` when drizzle-kit tried to load the config
- **Fix:** Ran `npm install dotenv --save-dev`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx drizzle-kit generate` completed successfully after install
- **Committed in:** `1ddd8e8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** dotenv is required by drizzle.config.ts as written in the plan — this was an implicit dependency the plan assumed would be present. No scope creep.

## Issues Encountered

- TypeScript binary in node_modules was broken (`Cannot find module '../lib/tsc.js'`). Worked around by calling `node /path/to/tsc.js` directly. TSC check passed with no errors in schema/db files.

## User Setup Required

None - no external service configuration required for this plan. Migration SQL is generated but not yet applied (requires `DATABASE_URL` pointing to live Supabase instance, handled when user configures env in plan 01-02).

## Next Phase Readiness

- Database schema is complete and migration-ready
- `db` singleton is importable once `@/lib/env` is created (plan 01-02)
- To apply migration: set `DATABASE_URL` in `.env.local` and run `npx drizzle-kit migrate`
- All subsequent phases can import `{ db }` from `@/lib/db` and `{ customers, orders, automations, messageLogs }` from `@/lib/db/schema`

---
*Phase: 01-foundation*
*Completed: 2026-02-19*
