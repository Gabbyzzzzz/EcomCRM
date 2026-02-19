# Phase 1: Foundation - Research

**Researched:** 2026-02-19
**Domain:** Drizzle ORM + Supabase PostgreSQL + Inngest + React Email + env validation
**Confidence:** HIGH (all critical claims verified via official docs and Context7)

---

## Summary

Phase 1 establishes the data layer and configuration baseline for EcomCRM. The stack is fully decided (no CONTEXT.md): drizzle-orm 0.45.1 + drizzle-kit 0.31.9 for schema/migrations, postgres 3.4.8 (porsager driver) connected to Supabase via the Transaction Mode pooler (port 6543), inngest 3.52.1 for background jobs, and React Email for email templates.

Three non-obvious issues were discovered during research. First, Supabase's Transaction Mode pooler requires `{ prepare: false }` on the postgres.js client — omitting this causes runtime errors because PgBouncer does not support prepared statements. Second, `@react-email/render` is NOT available as a top-level package in the current install; it is bundled as a nested dependency of `@react-email/components`, but must be added as an explicit dependency and configured via `serverExternalPackages` in next.config to avoid Next.js build failures. Third, drizzle-kit will silently skip enum migrations if `pgEnum` definitions are not explicitly exported from schema.ts.

Fourth, `decimal.js` itself is not installed (only `decimal.js-light` is present as a transitive dep). The CLAUDE.md requirement to use `decimal.js` means it must be installed — but `decimal.js-light` is API-compatible for the subset needed here (basic arithmetic, no trig), so it is a viable alternative if bundle size matters. However, CLAUDE.md says `decimal.js`, so install `decimal.js`.

**Primary recommendation:** Follow the generate → migrate workflow (never `push` in production), connect with `{ prepare: false }` for the pooler, export every `pgEnum`, and add `@react-email/render` + `decimal.js` as explicit dependencies.

---

## Standard Stack

### Core (all already installed — versions confirmed from node_modules)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | ORM + type-safe query builder | Official choice in CLAUDE.md |
| drizzle-kit | 0.31.9 | Migration generation and apply | Paired CLI for drizzle-orm |
| postgres (porsager) | 3.4.8 | Low-level PostgreSQL driver | Recommended by Drizzle docs for Supabase |
| inngest | 3.52.1 | Background job scheduling + event queues | Official choice in CLAUDE.md |
| @react-email/components | 1.0.8 | Email template primitives | Official choice in CLAUDE.md |
| zod | 4.3.6 | Schema validation (env + API inputs) | Official choice in CLAUDE.md |
| @supabase/supabase-js | 2.97.0 | Supabase client (auth, storage — NOT used for DB queries in this phase) | Already installed |

### Packages to Install (FOUND-04 + discovered gap)

| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| @react-email/render | ^1.0.x | Convert React email components to HTML string | Required for Resend integration; not available at top level |
| decimal.js | ^10.x | Arbitrary-precision decimal arithmetic | CLAUDE.md: "Decimal for all money values"; numeric columns return strings from Drizzle |

**Installation:**
```bash
npm install @react-email/render decimal.js
```

**Note on @react-email/render:** It is currently installed only as a nested dep inside `node_modules/@react-email/components/node_modules/@react-email/render` (version 2.0.4). This means imports work in dev but the package is not in package.json and will fail in CI or after clean install. Add it as an explicit dep AND configure `serverExternalPackages` (see below).

**Note on decimal.js-light:** `decimal.js-light` 2.5.1 is present transitively. For this project's needs (basic arithmetic on monetary values, no trig), it is API-compatible. However, CLAUDE.md says `decimal.js`, so install the full package.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| decimal.js | decimal.js-light | Light version is 2.5x smaller, missing NaN/Infinity handling and trig. Adequate for CRM money values, but CLAUDE.md specifies decimal.js |
| drizzle-kit migrate (CLI) | drizzle-orm migrate() programmatically | CLI is simpler for dev; programmatic approach is better for auto-migrate on deploy. Phase 1 uses CLI only |
| pgEnum for TypeScript enums | text() with runtime validation | pgEnum creates a real PostgreSQL TYPE, enforced at DB level. Always preferred |

---

## Architecture Patterns

### Recommended Project Structure for Phase 1

```
src/
├── lib/
│   ├── db/
│   │   ├── schema.ts       # All pgTable + pgEnum definitions — all must be EXPORTED
│   │   ├── index.ts        # db instance singleton (postgres client + drizzle)
│   │   └── queries.ts      # (empty in phase 1, populated later)
│   └── env.ts              # Zod-validated env vars, fails at startup if missing
├── app/
│   └── api/
│       └── inngest/
│           └── route.ts    # serve({ client, functions: [] })
├── inngest/
│   ├── client.ts           # new Inngest({ id: "ecomcrm" })
│   └── functions.ts        # (empty in phase 1, filled in later phases)
drizzle/                    # Generated migration SQL files (git-tracked)
drizzle.config.ts           # Drizzle Kit configuration
.env.local                  # Secrets (gitignored)
.env.local.example          # Template (git-tracked)
```

### Pattern 1: Drizzle Schema with Full Type Coverage

**What:** All tables and enums defined in `src/lib/db/schema.ts`, all exported at top level.
**When to use:** Always. drizzle-kit scans this file and will miss any non-exported definitions.

```typescript
// Source: https://orm.drizzle.team/docs/sql-schema-declaration + official verified pattern
// src/lib/db/schema.ts

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  jsonb,
  boolean,
  timestamp,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core'

// --- ENUMS (must all be exported or drizzle-kit skips their migrations) ---

export const customerSegmentEnum = pgEnum('customer_segment', [
  'champion',
  'loyal',
  'potential',
  'new',
  'at_risk',
  'hibernating',
  'lost',
])

export const triggerTypeEnum = pgEnum('trigger_type', [
  'first_order',
  'segment_change',
  'days_since_order',
  'tag_added',
  'cart_abandoned',
])

export const actionTypeEnum = pgEnum('action_type', [
  'send_email',
  'add_tag',
  'remove_tag',
])

export const messageChannelEnum = pgEnum('message_channel', ['email', 'sms'])

export const messageStatusEnum = pgEnum('message_status', [
  'sent',
  'opened',
  'clicked',
  'converted',
])

export const financialStatusEnum = pgEnum('financial_status', [
  'pending',
  'authorized',
  'paid',
  'refunded',
  'voided',
])

// --- TABLES ---

export const customers = pgTable(
  'customers',
  {
    id: uuid().primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    shopifyId: varchar('shopify_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    rfmR: integer('rfm_r'),
    rfmF: integer('rfm_f'),
    rfmM: integer('rfm_m'),
    segment: customerSegmentEnum('segment'),
    lifecycleStage: varchar('lifecycle_stage', { length: 100 }),
    tags: text('tags').array(),
    totalSpent: numeric('total_spent', { precision: 19, scale: 4 }),
    orderCount: integer('order_count').default(0),
    avgOrderValue: numeric('avg_order_value', { precision: 19, scale: 4 }),
    firstOrderAt: timestamp('first_order_at', { withTimezone: true }),
    lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('customers_shop_id_idx').on(table.shopId),
    index('customers_shopify_id_idx').on(table.shopifyId),
    index('customers_segment_idx').on(table.segment),
    index('customers_email_idx').on(table.email),
  ]
)

export const orders = pgTable(
  'orders',
  {
    id: uuid().primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    shopifyId: varchar('shopify_id', { length: 255 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id),
    totalPrice: numeric('total_price', { precision: 19, scale: 4 }),
    lineItems: jsonb('line_items'),
    financialStatus: financialStatusEnum('financial_status'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('orders_shop_id_idx').on(table.shopId),
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_created_at_idx').on(table.createdAt),
  ]
)

export const automations = pgTable(
  'automations',
  {
    id: uuid().primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    triggerType: triggerTypeEnum('trigger_type').notNull(),
    triggerConfig: jsonb('trigger_config'),
    delayValue: integer('delay_value'),
    delayUnit: varchar('delay_unit', { length: 50 }),
    actionType: actionTypeEnum('action_type').notNull(),
    actionConfig: jsonb('action_config'),
    emailTemplateId: varchar('email_template_id', { length: 255 }),
    enabled: boolean('enabled').default(true).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('automations_shop_id_idx').on(table.shopId),
    index('automations_enabled_idx').on(table.enabled),
  ]
)

export const messageLogs = pgTable(
  'message_logs',
  {
    id: uuid().primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id),
    automationId: uuid('automation_id').references(() => automations.id),
    channel: messageChannelEnum('channel').notNull(),
    subject: varchar('subject', { length: 500 }),
    status: messageStatusEnum('status').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('message_logs_shop_id_idx').on(table.shopId),
    index('message_logs_customer_id_idx').on(table.customerId),
    index('message_logs_automation_id_idx').on(table.automationId),
    index('message_logs_status_idx').on(table.status),
  ]
)
```

### Pattern 2: Supabase PgBouncer-Safe DB Client

**What:** Single db singleton with `prepare: false` to disable prepared statements.
**When to use:** Always when connecting through port 6543 (Transaction mode pooler).

```typescript
// Source: https://supabase.com/docs/guides/database/drizzle + https://orm.drizzle.team/docs/get-started/supabase-new
// src/lib/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// CRITICAL: prepare: false required for Supabase Transaction mode pooler (port 6543)
// Without this, you get "prepared statements not supported" errors
const client = postgres(process.env.DATABASE_URL!, { prepare: false })

export const db = drizzle(client, { schema })
```

### Pattern 3: Drizzle Kit Configuration

**What:** `drizzle.config.ts` for generate and migrate CLI commands.
**When to use:** At project root. Points to schema, outputs to `./drizzle/`.

```typescript
// Source: https://orm.drizzle.team/docs/drizzle-config-file
// drizzle.config.ts

import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
```

**Migration workflow:**
```bash
# Step 1: Generate SQL from schema diff
npx drizzle-kit generate

# Step 2: Apply to database
npx drizzle-kit migrate

# NEVER use in production:
# npx drizzle-kit push  (bypasses migration files, unsafe)
```

### Pattern 4: Env Validation (Zod 4.x compatible)

**What:** Fail at startup with clear message if any required env var is missing.
**When to use:** Import env from this module everywhere — never access process.env directly.

```typescript
// Source: verified pattern against Zod 4.x changelog (https://zod.dev/v4/changelog)
// src/lib/env.ts

// NOTE: Zod 4.x breaking change — z.string().url() still works as method form
// (format validators are deprecated as methods but NOT yet removed in 4.x)
// Using z.string().min(1) for env vars is safer and version-agnostic

import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Shopify
  SHOPIFY_STORE_URL: z.string().min(1),
  SHOPIFY_ACCESS_TOKEN: z.string().min(1),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1),

  // Resend (email)
  RESEND_API_KEY: z.string().min(1),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),

  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('Missing or invalid environment variables:')
  console.error(result.error.flatten().fieldErrors)
  throw new Error('Environment validation failed. See above for details.')
}

export const env = result.data
```

**Validation trigger location:** Import `@/lib/env` in `src/lib/db/index.ts` so it runs on first DB access (server-only). Do NOT import it in next.config.mjs — it runs in an edge context during config loading.

### Pattern 5: Inngest Client + Serve Handler

**What:** Inngest client singleton + Next.js App Router serve handler.
**When to use:** Phase 1 creates these empty shells; later phases add functions.

```typescript
// Source: https://www.inngest.com/docs/getting-started/nextjs-quick-start
// src/inngest/client.ts

import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'ecomcrm' })
```

```typescript
// Source: https://www.inngest.com/docs/reference/serve
// src/app/api/inngest/route.ts

import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
// import functions as they are created in later phases

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // functions added here in later phases
  ],
})
```

### Pattern 6: next.config.mjs for React Email

**What:** Add `@react-email/render` and `@react-email/components` to `serverExternalPackages` to prevent Next.js bundler from attempting to bundle Node.js-only modules.
**When to use:** Required; without this, `next build` fails with ESM/CJS interop errors.

```javascript
// Source: https://github.com/resend/react-email/issues/977 (MEDIUM confidence — verified by multiple issue reporters)
// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-email/render', '@react-email/components'],
}

export default nextConfig
```

### Anti-Patterns to Avoid

- **Using `drizzle-kit push` for migration management:** `push` skips migration file generation. Use `generate` then `migrate` always. Push is only acceptable during local prototyping, never in a shared environment.
- **Direct connection string (port 5432) for serverless:** The direct connection does not pool; under concurrent serverless invocations this exhausts the 15–20 connection limit on free-tier Supabase. Always use the pooler (port 6543) with `prepare: false`.
- **`pgEnum` without `export`:** drizzle-kit silently omits the `CREATE TYPE` SQL when the enum is not exported. The table migration runs but references a non-existent type, causing a DB error.
- **Accessing `process.env` directly in app code:** Always use the validated `env` object from `src/lib/env.ts` to guarantee type safety and early failure on misconfiguration.
- **Importing `env.ts` in client-side code:** `env.ts` imports server secrets; it must only be imported in server contexts (API routes, server components, lib files).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Money arithmetic | Custom float math | `decimal.js` | Float arithmetic has precision errors (0.1 + 0.2 != 0.3). Drizzle numeric columns return strings, decimal.js handles the string input natively |
| DB connection pooling | Manual pool | Supabase Supavisor (port 6543) | PgBouncer handles connection reuse, queue management, and overflow — complex to replicate |
| Migration tracking | Custom migration table | drizzle-kit migrate | Drizzle maintains `__drizzle_migrations` table and handles ordering, idempotency |
| Env validation | Manual if-checks | Zod schema | Produces clear field-level errors, TypeScript inference, single source of truth |
| Email HTML generation | Manual HTML strings | React Email + `render()` | Email HTML has many quirks (Outlook, Gmail) that React Email's components handle |

**Key insight:** The "foundational" libs (Drizzle, Inngest, Zod) each solve a class of problems that look simple but have many edge cases. The effort savings are proportional to the amount of state involved (migrations, connections, background jobs).

---

## Common Pitfalls

### Pitfall 1: Missing `prepare: false` on Postgres Client

**What goes wrong:** Connection to port 6543 works initially, then crashes with `"prepared statements are not supported"` under load or after reconnect.
**Why it happens:** PgBouncer Transaction mode cannot maintain per-connection state, which prepared statements require.
**How to avoid:** Always pass `{ prepare: false }` to `postgres()` when the DATABASE_URL points to port 6543.
**Warning signs:** Works in dev (direct connection) but fails in staging/production (pooler).

### Pitfall 2: pgEnum Not Exported — Silent Migration Gap

**What goes wrong:** `drizzle-kit generate` produces a migration that creates tables but omits the `CREATE TYPE` statements for enums. Running the migration fails with `type "customer_segment" does not exist`.
**Why it happens:** drizzle-kit scans exported symbols from schema.ts; non-exported definitions are invisible.
**How to avoid:** Export every `pgEnum` declaration with `export const`. Verify generated `.sql` includes `CREATE TYPE` before `CREATE TABLE`.
**Warning signs:** Generated SQL has `CREATE TABLE` references to types that weren't created.

### Pitfall 3: `@react-email/render` Not in package.json

**What goes wrong:** Works locally (nested dep exists), fails in CI/Vercel with `Cannot find module '@react-email/render'`.
**Why it happens:** The package is a transitive dep of `@react-email/components`, hoisted into `node_modules/@react-email/components/node_modules/` but not declared in the project's package.json.
**How to avoid:** `npm install @react-email/render` to make it an explicit dependency.
**Warning signs:** Import from `@react-email/render` or `@react-email/components` throws on clean install.

### Pitfall 4: React Email Build Failure Without serverExternalPackages

**What goes wrong:** `next build` fails with errors like `Cannot get final name for export 'encodeXML'` or ESM/CJS module conflicts.
**Why it happens:** Next.js attempts to bundle React Email, which uses Node.js-only APIs incompatible with the edge bundler.
**How to avoid:** Add to `next.config.mjs`: `serverExternalPackages: ['@react-email/render', '@react-email/components']`.
**Warning signs:** Build succeeds in dev (`next dev`) but fails on `next build`.

### Pitfall 5: Zod 4.x API Changes Affecting env Validation

**What goes wrong:** Using `z.string().email()` or `z.string().url()` as method chaining — these are deprecated in Zod 4.x (top-level `z.email()` is the new form) though not yet removed.
**Why it happens:** Zod 4 migrated string format validators to top-level functions.
**How to avoid:** Use `z.string().min(1)` for env var validation (sufficient for presence check). Avoid format-specific validators in the env schema to stay version-agnostic.
**Warning signs:** Console deprecation warnings from Zod about method-form string validators.

### Pitfall 6: Drizzle numeric Columns Return Strings at Runtime

**What goes wrong:** TypeScript infers `total_spent` as `string | null`, causing type errors when you try to do arithmetic.
**Why it happens:** PostgreSQL NUMERIC type is returned as a string by pg drivers to preserve precision. Drizzle does not automatically convert.
**How to avoid:** Use `decimal.js` to wrap numeric values: `new Decimal(customer.totalSpent ?? '0')`. Do NOT cast to `parseFloat` — this defeats the purpose of using numeric.
**Warning signs:** TypeScript error when adding two numeric column values, or silent precision loss.

### Pitfall 7: Inngest Functions Array Empty — 200 but No Functions Registered

**What goes wrong:** `/api/inngest` returns 200 but Inngest Dev Server shows no functions registered.
**Why it happens:** The `functions` array in `serve()` is empty; the serve handler is working but has nothing to register.
**How to avoid:** In Phase 1, this is expected — the empty array serves as proof the endpoint works. Add functions in later phases and re-sync.
**Warning signs:** Inngest Dev Server shows "0 functions" after sync; check the functions array.

---

## Code Examples

### Drizzle DB Singleton with Env Import

```typescript
// Source: https://orm.drizzle.team/docs/get-started/supabase-new
// src/lib/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { env } from '@/lib/env'  // triggers env validation on first import

const client = postgres(env.DATABASE_URL, { prepare: false })

export const db = drizzle(client, { schema })
export type DB = typeof db
```

### decimal.js Usage for Money Values

```typescript
// Source: https://mikemcl.github.io/decimal.js/ + drizzle-orm numeric returns string
// Usage pattern in application code

import Decimal from 'decimal.js'

// Drizzle numeric columns return strings — Decimal accepts string input
function calculateAOV(totalSpent: string | null, orderCount: number): string {
  if (!totalSpent || orderCount === 0) return '0'
  return new Decimal(totalSpent).dividedBy(orderCount).toFixed(4)
}

// Comparing money values
const isHighValue = new Decimal(customer.totalSpent ?? '0').greaterThan(1000)

// DO NOT: parseFloat(customer.totalSpent)  -- loses precision on large values
```

### pgEnum Migration Verification Checklist

After `npx drizzle-kit generate`, open the generated `.sql` file and verify:

```sql
-- Generated SQL should contain CREATE TYPE before CREATE TABLE:
CREATE TYPE "customer_segment" AS ENUM ('champion', 'loyal', 'potential', 'new', 'at_risk', 'hibernating', 'lost');
CREATE TYPE "trigger_type" AS ENUM ('first_order', 'segment_change', 'days_since_order', 'tag_added', 'cart_abandoned');
-- ... all other enums ...

CREATE TABLE "customers" (
  -- ...
  "segment" "customer_segment",  -- references the type
  -- ...
);
```

If `CREATE TYPE` lines are missing, the enum is not exported from schema.ts.

### .env.local.example Template

```bash
# Database — use Supabase Transaction Mode Pooler (port 6543)
DATABASE_URL=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Shopify Custom App (NOT Public App — use access token directly)
SHOPIFY_STORE_URL=https://your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here

# Resend (email sending)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Anthropic (AI insights)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Inngest (background jobs)
# In local dev: INNGEST_DEV=1 can be used; Dev Server handles events without real keys
# In production: required from https://app.inngest.com/
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `drizzle-kit push` to shared DB | `generate` + `migrate` workflow | Best practice from Drizzle docs | Migration files are git-tracked, reproducible |
| Port 5432 direct for all apps | Port 6543 Transaction pooler for serverless | Supabase Supavisor GA (2024) | Prevents connection exhaustion on Vercel |
| Supabase session mode on port 6543 | Session mode now only on port 5432 | **Feb 28, 2025 Supabase deprecation** | Port 6543 = Transaction only going forward |
| `renderAsync` (old React Email) | `render()` async (new React Email) | React Email 3.0+ | `render()` now returns a Promise; must be awaited |
| `z.string().email()` method | `z.email()` top-level | Zod 4.x | Method form deprecated (not removed yet) |

**Deprecated/outdated:**
- `drizzle-kit push` for production: bypasses migration tracking, cannot be rolled back
- `renderAsync` from `@react-email/render`: deprecated in favor of async `render()`
- Session mode on Supabase port 6543: removed Feb 28, 2025 — port 6543 is Transaction mode only

---

## Open Questions

1. **DATABASE_URL should use the pooler or the direct connection for drizzle-kit migrate?**
   - What we know: drizzle-kit migrate runs once during deployment/dev setup, not in a serverless context; it is a long-lived CLI process.
   - What's unclear: Supabase docs recommend the pooler for all connections, but the direct connection (port 5432) also works for migration tools since it maintains state (prepared statements OK there).
   - Recommendation: Use the pooler URL (port 6543) in `DATABASE_URL` with `prepare: false` for everything. For `drizzle.config.ts`, this works fine since drizzle-kit migrate does not use prepared statements by default.

2. **Inngest env vars required for local dev?**
   - What we know: Official docs say `INNGEST_EVENT_KEY` is "required" in env var table, but note "not required for local dev with Dev Server."
   - What's unclear: Exact behavior when `INNGEST_EVENT_KEY` is absent but `INNGEST_DEV=1` is set.
   - Recommendation: Document both in `.env.local.example` with a comment that local dev can use placeholder values with Inngest Dev Server running. The env validation schema should keep them required to avoid surprises in production.

---

## Sources

### Primary (HIGH confidence)
- Drizzle ORM official docs — `orm.drizzle.team/docs/get-started/supabase-new` — DB client setup, prepare: false
- Drizzle ORM official docs — `orm.drizzle.team/docs/sql-schema-declaration` — pgTable, pgEnum, column types
- Drizzle ORM official docs — `orm.drizzle.team/docs/column-types/pg` — uuid, varchar, numeric, jsonb, timestamp, boolean
- Drizzle ORM official docs — `orm.drizzle.team/docs/indexes-constraints` — foreignKey, index, uniqueIndex
- Drizzle ORM official docs — `orm.drizzle.team/docs/drizzle-config-file` — drizzle.config.ts options
- Drizzle ORM official docs — `orm.drizzle.team/docs/drizzle-kit-migrate` — migrate CLI workflow
- Supabase official docs — `supabase.com/docs/guides/database/drizzle` — Supabase + Drizzle integration
- Supabase official docs — `supabase.com/docs/guides/troubleshooting/disabling-prepared-statements` — prepare: false requirement, pgbouncer=true parameter
- Supabase official GitHub Discussion #32755 — Port 6543 session mode deprecation (Feb 28, 2025)
- Inngest official docs — `inngest.com/docs/getting-started/nextjs-quick-start` — serve handler, file structure
- Inngest official docs — `inngest.com/docs/sdk/environment-variables` — INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
- Inngest official docs — `inngest.com/docs/reference/serve` — serve() options
- Zod official docs — `zod.dev/v4/changelog` — breaking changes in Zod 4.x (string format API)

### Secondary (MEDIUM confidence)
- GitHub issue resend/react-email #977 — serverExternalPackages requirement for Next.js (verified by multiple commenters, consistent with Next.js docs on serverExternalPackages)
- GitHub issue drizzle-team/drizzle-orm #5174 — pgEnum must be exported for migration generation (verified with official docs on export requirement)
- Local inspection: `node_modules/@react-email/components` exports `render` (confirmed via Node.js require); `@react-email/render` 2.0.4 is nested dep, not top-level dep (confirmed via filesystem)
- Local inspection: `decimal.js` not installed; `decimal.js-light` 2.5.1 present as transitive dep only (confirmed via Node.js require)

### Tertiary (LOW confidence)
- wanago.io article on Drizzle + NestJS money storage — numeric precision 19/4 recommendation. Pattern is reasonable but precision choice is application-specific.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed via node_modules inspection, versions exact
- Missing packages (@react-email/render, decimal.js): HIGH — confirmed via filesystem that they are not top-level deps
- Supabase connection setup: HIGH — verified via official Supabase + Drizzle docs, multiple sources agree on `prepare: false`
- Port 6543 deprecation (session mode): HIGH — official GitHub Discussion from Supabase team
- Drizzle schema patterns: HIGH — verified against current official column type docs
- pgEnum export requirement: HIGH — confirmed in official schema docs + GitHub issue with official response
- Inngest serve handler: HIGH — verified against official Next.js quick start docs
- React Email serverExternalPackages: MEDIUM — multiple GitHub issue reports, consistent with Next.js docs behavior
- Zod 4.x env pattern: MEDIUM — changelog verified, method forms deprecated not removed; exact timing of removal unknown

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 for stable libraries (Drizzle, Inngest). Supabase connection topology is stable but verify if adding new Supabase project (connection string format varies by region/setup).
