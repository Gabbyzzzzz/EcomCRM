# Architecture Patterns

**Domain:** Shopify CRM + Email Marketing Automation
**Project:** EcomCRM
**Researched:** 2026-02-19
**Confidence:** HIGH (stack versions verified against package.json; patterns verified against known library APIs)

---

## Recommended Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SYSTEMS                             │
│  Shopify Admin API (GraphQL)     Resend API     Anthropic Claude API  │
└────────────┬─────────────────────────┬──────────────────┬───────────┘
             │                         │                  │
             ▼                         ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER                            │
│                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────────┐  │
│  │  Webhook Ingest │   │  Inngest Serve   │   │   API Routes      │  │
│  │  /api/webhooks/ │   │  /api/inngest    │   │  /api/customers   │  │
│  │  shopify/route  │   │  (serve handler) │   │  /api/sync        │  │
│  └────────┬────────┘   └────────┬────────┘   └────────┬──────────┘  │
│           │                     │                     │              │
│           └─────────────────────┼─────────────────────┘              │
│                                 │                                    │
│  ┌──────────────────────────────▼──────────────────────────────────┐ │
│  │                    INNGEST FUNCTIONS (background)               │ │
│  │                                                                 │ │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │ │
│  │  │ shopify/sync     │  │ rfm/recalculate  │  │ automation/   │  │ │
│  │  │ (event+cron)     │  │ (event+cron)     │  │ check (cron)  │  │ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └──────┬────────┘  │ │
│  └───────────┼─────────────────────┼──────────────────┼────────────┘ │
│              │                     │                  │              │
│  ┌───────────▼─────────────────────▼──────────────────▼────────────┐ │
│  │                         CORE LIBRARY (lib/)                     │ │
│  │                                                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │ lib/shopify/ │  │  lib/rfm/    │  │  lib/automation/     │  │ │
│  │  │ client.ts    │  │  engine.ts   │  │  engine.ts           │  │ │
│  │  │ sync.ts      │  │              │  │  actions.ts          │  │ │
│  │  │ webhooks.ts  │  └──────┬───────┘  └──────────┬───────────┘  │ │
│  │  └──────┬───────┘         │                     │              │ │
│  │         │          ┌──────▼───────┐      ┌──────▼───────────┐ │ │
│  │         │          │  lib/db/     │      │  lib/email/      │ │ │
│  │         └─────────►│  schema.ts   │      │  send.ts         │ │ │
│  │                    │  queries.ts  │      │  (Resend wrapper) │ │ │
│  │                    └──────┬───────┘      └──────────────────┘ │ │
│  └───────────────────────────┼───────────────────────────────────┘ │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   PostgreSQL via    │
                    │   Supabase          │
                    │                    │
                    │  customers         │
                    │  orders            │
                    │  automations       │
                    │  message_logs      │
                    └────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Reads From | Writes To | Communicates With |
|-----------|---------------|-----------|-----------|-------------------|
| `lib/shopify/client.ts` | GraphQL client wrapper, rate limit throttling, cost-based retry | env vars | — | Shopify Admin API |
| `lib/shopify/sync.ts` | Full bulk sync + incremental order/customer upsert logic | Shopify client | customers, orders tables | lib/shopify/client.ts |
| `lib/shopify/webhooks.ts` | HMAC-SHA256 verification of incoming webhook payloads | Raw request body | — | Called by webhook API route |
| `lib/db/schema.ts` | Drizzle table definitions, enums, column types | — | — | Used by all DB-touching code |
| `lib/db/queries.ts` | Reusable parameterized query functions (no raw SQL) | DB via Drizzle | DB via Drizzle | Called by lib layers + API routes |
| `lib/rfm/engine.ts` | Quintile-based R/F/M scoring, segment label mapping | customers, orders tables | customers table (rfm_r/f/m, segment) | lib/db/queries.ts |
| `lib/automation/engine.ts` | Trigger evaluation: polls/checks trigger conditions per automation rule | automations, customers, message_logs | — | lib/automation/actions.ts |
| `lib/automation/actions.ts` | Action executors: send_email, add_tag, remove_tag | automations, customers | message_logs | lib/email/send.ts, Shopify client |
| `lib/email/send.ts` | Resend API wrapper, renders React Email template, sends | automations config | message_logs (via caller) | Resend API, emails/ templates |
| `lib/ai/insights.ts` | Claude API calls for customer analysis copy | customers, orders | — | Anthropic API |
| `inngest/client.ts` | Inngest client singleton (EventSchemas typed, event key from env) | env vars | — | All inngest functions |
| `inngest/functions.ts` | All Inngest function definitions: cron triggers, event handlers | inngest/client.ts | Fires events, calls lib/ | All core lib modules |
| `app/api/webhooks/shopify/route.ts` | Receives POST from Shopify, HMAC verify, fire inngest event | Request body | — | lib/shopify/webhooks.ts, inngest client |
| `app/api/inngest/route.ts` | Serves Inngest SDK handler (GET+POST+PUT) | — | — | Inngest cloud |
| `app/api/sync/route.ts` | Manual trigger for bulk sync (protected route) | — | — | inngest client (fire event) |
| `app/(dashboard)/page.tsx` | Server Component: aggregated KPI data fetch + render | DB queries | — | lib/db/queries.ts |
| `app/customers/page.tsx` | Server Component: paginated customer list with segment filters | DB queries | — | lib/db/queries.ts |
| `app/customers/[id]/page.tsx` | Server Component: customer 360 profile, orders, message history | DB queries | — | lib/db/queries.ts, lib/ai/insights.ts |
| `app/automations/page.tsx` | Server Component: list all automation rules | DB queries | — | lib/db/queries.ts |
| `app/automations/[id]/page.tsx` | Client Component: interactive workflow editor | DB queries | automations table | API routes |

---

## Data Flow Direction

### Flow 1: Initial Shopify Sync (Bulk)

```
Manual trigger (UI or cron)
  → app/api/sync/route.ts
  → inngest.send("shopify/sync.requested", { type: "full" })
  → Inngest function: handleShopifySync
    → lib/shopify/client.ts: bulkOperationRunQuery (GraphQL)
    → Shopify processes bulk op async → poll for completion URL
    → Stream JSONL result
    → lib/shopify/sync.ts: upsertCustomers(), upsertOrders()
    → lib/db/queries.ts: batch INSERT/UPDATE customers + orders
    → inngest.send("rfm/recalculate.requested")
  → Inngest function: recalculateRFM
    → lib/rfm/engine.ts: computeQuintiles(), scoreAll(), mapSegments()
    → lib/db/queries.ts: bulk UPDATE customers (rfm_r, rfm_f, rfm_m, segment)
    → inngest.send("automation/check.triggered") [per changed segment]
```

### Flow 2: Real-time Shopify Webhook

```
Shopify → POST app/api/webhooks/shopify/route.ts
  → lib/shopify/webhooks.ts: verifyHMAC(secret, rawBody, header)
    → IF INVALID: return 401 immediately (no further processing)
    → IF VALID: parse topic from X-Shopify-Topic header
  → inngest.send("shopify/order.created" | "shopify/customer.updated", payload)
  → return 200 immediately (Shopify requires <5s response)

Inngest processes async:
  → handleOrderCreated(event)
    → lib/shopify/sync.ts: upsertOrder(), upsertCustomer()
    → inngest.send("rfm/recalculate.requested", { customerId })
  → recalculateRFMForCustomer(event)
    → lib/rfm/engine.ts: rescoreCustomer() [relative to current quintile bounds]
    → lib/db/queries.ts: UPDATE customer
    → IF segment changed: inngest.send("automation/segment.changed", { customerId, oldSegment, newSegment })
  → checkAutomationTriggers(event)
    → lib/automation/engine.ts: evaluateTriggers(customer)
    → lib/automation/actions.ts: executeAction(action, customer)
      → lib/email/send.ts: send(template, recipient) → Resend API
      → lib/db/queries.ts: INSERT message_logs
```

### Flow 3: Automation Cron (Fallback + Time-based Triggers)

```
Inngest cron: "0 9 * * *" (daily 9am)
  → checkAllAutomations()
    → lib/db/queries.ts: getEnabledAutomations()
    → FOR EACH automation:
      → lib/automation/engine.ts: findEligibleCustomers(trigger)
        [handles: days_since_order, cart_abandoned, etc.]
      → FOR EACH eligible customer:
        → lib/automation/engine.ts: hasAlreadyReceived(customerId, automationId)
        → IF NOT: inngest.send("automation/action.execute", { customerId, automationId })

  → executeAutomationAction(event)
    → lib/automation/actions.ts: executeAction(action, customer)
    → lib/email/send.ts: send() → Resend
    → lib/db/queries.ts: INSERT message_logs
```

### Flow 4: Dashboard Read Path

```
Browser → app/(dashboard)/page.tsx (Server Component)
  → lib/db/queries.ts: getKPIs(), getSegmentBreakdown(), getRevenueTimeSeries()
  → Drizzle ORM query → PostgreSQL (Supabase)
  → Render Recharts components with data (no client round-trip for initial paint)
```

---

## Inngest Function Structure

Inngest v3 uses the `createFunction` API. All functions live in `inngest/functions.ts` and are served via `app/api/inngest/route.ts`.

### Required Route: `app/api/inngest/route.ts`

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

### Client Setup: `inngest/client.ts`

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ecomcrm",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

### Function Categories

**Cron (scheduled):**
```typescript
// Daily RFM recalculation fallback
export const dailyRFMRecalculate = inngest.createFunction(
  { id: "daily-rfm-recalculate" },
  { cron: "0 2 * * *" },           // 2am daily
  async ({ step }) => {
    await step.run("recalculate-all", async () => { /* ... */ });
  }
);

// Daily automation check (time-based triggers)
export const dailyAutomationCheck = inngest.createFunction(
  { id: "daily-automation-check" },
  { cron: "0 9 * * *" },
  async ({ step }) => { /* ... */ }
);
```

**Event-driven:**
```typescript
// Triggered by webhook ingestion
export const handleOrderCreated = inngest.createFunction(
  { id: "handle-order-created" },
  { event: "shopify/order.created" },
  async ({ event, step }) => {
    const order = await step.run("upsert-order", () =>
      upsertOrder(event.data)
    );
    await step.run("recalculate-rfm", () =>
      recalculateCustomerRFM(event.data.customerId)
    );
    // step.sendEvent to fire automation check
  }
);
```

**Key Inngest patterns for this project:**
- Use `step.run()` for each logical unit — Inngest checkpoints after each step, enabling retry without re-running prior steps
- Use `step.sleep()` for automation delays (e.g., "send email 3 days after segment_change") — Inngest handles the timer durably
- Use `step.sendEvent()` within functions to chain events without creating deep call stacks
- Fan-out pattern: cron function sends N individual events (one per customer to process), child functions handle each — avoids single long-running function timeouts

```typescript
// Fan-out pattern for automation check
export const dailyAutomationCheck = inngest.createFunction(
  { id: "daily-automation-check" },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const customers = await step.run("get-eligible", () =>
      getCustomersNeedingAutomation()
    );
    // Fan out — one event per customer
    await step.sendEvent(
      "fan-out-automation",
      customers.map((c) => ({
        name: "automation/customer.check",
        data: { customerId: c.id },
      }))
    );
  }
);
```

---

## Webhook Ingestion Pattern

Shopify requires a 200 response within 5 seconds. The correct pattern is verify-then-queue, not verify-then-process.

```typescript
// app/api/webhooks/shopify/route.ts

export async function POST(request: Request) {
  // 1. Read raw body ONCE — needed for HMAC verification
  const rawBody = await request.text();

  // 2. Verify HMAC immediately — reject fast
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const isValid = verifyShopifyHMAC(
    process.env.SHOPIFY_WEBHOOK_SECRET!,
    rawBody,
    hmacHeader
  );
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 3. Parse topic and payload
  const topic = request.headers.get("x-shopify-topic") ?? "";
  const payload = JSON.parse(rawBody);

  // 4. Fire Inngest event (non-blocking) and return 200 immediately
  await inngest.send({
    name: `shopify/${topic.replace("/", ".")}`,  // e.g. "shopify/orders.create"
    data: payload,
  });

  return new Response("OK", { status: 200 });
}
```

**Critical: raw body must be read as `request.text()` before any JSON parsing** — `request.json()` consumes the stream and the raw body needed for HMAC verification is lost.

HMAC verification logic:

```typescript
// lib/shopify/webhooks.ts
import { createHmac, timingSafeEqual } from "crypto";

export function verifyShopifyHMAC(
  secret: string,
  rawBody: string,
  receivedHmac: string
): boolean {
  const computed = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(computed);
  const b = Buffer.from(receivedHmac);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);  // constant-time compare prevents timing attacks
}
```

---

## Patterns to Follow

### Pattern 1: Server Components as Data-Fetching Shells

**What:** Pages are Server Components that fetch data directly from Drizzle, passing serializable props to Client Component islands for interactivity.

**When:** All read-heavy pages (dashboard, customer list, customer profile).

**Example:**
```typescript
// app/customers/[id]/page.tsx — Server Component
import { getCustomerById, getCustomerOrders } from "@/lib/db/queries";

export default async function CustomerProfile({ params }: { params: { id: string } }) {
  const [customer, orders] = await Promise.all([
    getCustomerById(params.id),
    getCustomerOrders(params.id),
  ]);

  return (
    <div>
      <CustomerHeader customer={customer} />       {/* Server Component */}
      <OrderHistory orders={orders} />             {/* Server Component */}
      <AutomationLogTable customerId={params.id} /> {/* Client Component if interactive */}
    </div>
  );
}
```

### Pattern 2: Zod Validation at API Route Boundaries

**What:** Every API route validates its input with Zod before touching the database.

**When:** All POST/PATCH API routes.

**Example:**
```typescript
// app/api/automations/route.ts
const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.enum(["first_order", "segment_change", "days_since_order", "tag_added", "cart_abandoned"]),
  triggerConfig: z.record(z.unknown()),
  delayValue: z.number().int().min(0),
  delayUnit: z.enum(["minutes", "hours", "days"]),
  actionType: z.enum(["send_email", "add_tag", "remove_tag"]),
  actionConfig: z.record(z.unknown()),
  emailTemplateId: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createAutomationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // ... proceed with parsed.data
}
```

### Pattern 3: Drizzle Query Functions Centralized in lib/db/queries.ts

**What:** No inline Drizzle queries in API routes or Server Components. All queries are named functions in `lib/db/queries.ts`.

**When:** Always.

**Why:** Testable, reusable, typed. Avoids schema knowledge leaking into UI layer.

```typescript
// lib/db/queries.ts
export async function getCustomersBySegment(
  shopId: string,
  segment: CustomerSegment,
  limit = 50,
  offset = 0
) {
  return db
    .select()
    .from(customers)
    .where(and(eq(customers.shopId, shopId), eq(customers.segment, segment)))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(customers.totalSpent));
}
```

### Pattern 4: Decimal for All Money Values

**What:** Use Drizzle `decimal` column type (maps to `string` in TypeScript). Never `number` or `float` for monetary values.

**When:** total_spent, total_price, avg_order_value — every money field.

**Why:** IEEE 754 float arithmetic loses cents. PostgreSQL `NUMERIC` is exact. Drizzle returns it as string — use a decimal library (e.g., `decimal.js`) if arithmetic is needed.

### Pattern 5: Idempotent Upserts for Shopify Sync

**What:** All sync writes use upsert (INSERT ... ON CONFLICT DO UPDATE) keyed on `shopify_id`.

**When:** All customer and order sync operations.

**Why:** Webhooks can fire multiple times for the same event. Bulk sync can overlap with webhook delivery. Idempotent writes make both safe.

```typescript
// lib/shopify/sync.ts
await db
  .insert(customers)
  .values(customerData)
  .onConflictDoUpdate({
    target: customers.shopifyId,
    set: {
      name: customerData.name,
      email: customerData.email,
      totalSpent: customerData.totalSpent,
      orderCount: customerData.orderCount,
      lastOrderAt: customerData.lastOrderAt,
      updatedAt: new Date(),
    },
  });
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Processing Webhooks Synchronously

**What:** Doing database writes or API calls inside the webhook handler before returning 200.

**Why bad:** Shopify retries webhooks if it doesn't receive a 200 within 5 seconds. Processing time + DB latency routinely exceeds this. Results in duplicate processing of retried webhooks.

**Instead:** Verify HMAC → fire Inngest event → return 200 immediately. Let Inngest handle all processing asynchronously.

### Anti-Pattern 2: Recalculating All RFM Scores on Every Webhook

**What:** Running the full quintile-based RFM recalculation for all customers when a single order webhook arrives.

**Why bad:** Quintile recalculation requires scanning all customers. At 10K+ customers this is slow and expensive per-webhook. Every order event triggers a full table scan.

**Instead:** On order webhook, recompute only the affected customer's raw R/F/M values and re-score against the pre-computed quintile boundaries stored in a separate config/cache. Run the full quintile recomputation on the daily cron only. This requires storing current quintile boundaries (5 thresholds × 3 dimensions = 15 values) in a `rfm_config` table or environment cache updated daily.

### Anti-Pattern 3: Storing Shopify Access Token in Database

**What:** Saving `SHOPIFY_ACCESS_TOKEN` to the database for "flexibility."

**Why bad:** Single-store Custom App — the token doesn't change per request. Storing in DB adds a DB read on every Shopify API call, and creates a secret management problem.

**Instead:** Read from `process.env.SHOPIFY_ACCESS_TOKEN` at runtime. For future multi-tenant support, introduce a `shops` table then.

### Anti-Pattern 4: Using `request.json()` Before HMAC Verification

**What:** Calling `await request.json()` at the top of the webhook handler to parse the payload, then trying to verify HMAC.

**Why bad:** `request.json()` consumes the body stream. The raw body (needed for HMAC) is gone. HMAC computed over a re-serialized JSON object will fail because key ordering and whitespace differ.

**Instead:** Always `await request.text()` first, verify HMAC on the raw string, then `JSON.parse()` the string.

### Anti-Pattern 5: Client Components Fetching Data Directly from Supabase

**What:** Using Supabase client SDK in Client Components to query data directly.

**Why bad:** Exposes `SUPABASE_SERVICE_ROLE_KEY` patterns, bypasses row-level security if misconfigured, leaks schema details to the browser, and breaks the Server Component data-fetching model.

**Instead:** Server Components fetch via Drizzle directly. For client-side mutations or real-time needs, go through Next.js API routes (which can enforce auth and validation).

### Anti-Pattern 6: One Inngest Function Per Customer in Cron

**What:** Scheduling N individual cron functions — one per customer — for automation checks.

**Why bad:** Inngest has function limits; you can't dynamically register functions per customer.

**Instead:** One cron function that fans out via `step.sendEvent()` to fire N individual events, each processed by a single event-driven function. This is the correct fan-out pattern.

---

## Build Order (Dependency Graph)

Components must be built in this order due to hard dependencies:

```
1. lib/db/schema.ts           ← foundation — everything depends on this
2. lib/db/queries.ts          ← depends on schema
3. lib/shopify/client.ts      ← no internal deps
4. lib/shopify/webhooks.ts    ← no internal deps (pure crypto)
5. lib/shopify/sync.ts        ← depends on shopify/client + db/queries
6. inngest/client.ts          ← no internal deps
7. app/api/inngest/route.ts   ← depends on inngest/client
8. app/api/webhooks/shopify/  ← depends on webhooks.ts + inngest/client
9. lib/rfm/engine.ts          ← depends on db/queries
10. lib/email/send.ts         ← depends on emails/ templates (React Email)
11. lib/automation/actions.ts ← depends on email/send + db/queries + shopify/client
12. lib/automation/engine.ts  ← depends on automation/actions + db/queries
13. inngest/functions.ts      ← depends on ALL lib modules
14. lib/ai/insights.ts        ← standalone, can be added any time
15. UI pages                  ← depend on db/queries (can build in parallel after step 2)
```

**Phase implications:**
- Phase 1 (Foundation): Steps 1-2 — schema + queries. Nothing else works without this.
- Phase 2 (Shopify Sync): Steps 3-5, 6-8 — get data into DB. RFM/automation are useless without data.
- Phase 3 (RFM Engine): Step 9 — requires customer+order data in DB.
- Phase 4 (Automation + Email): Steps 10-12 — requires RFM segments to be meaningful.
- Phase 5 (Inngest wiring): Step 13 — wire all background jobs; requires all lib modules complete.
- Phase 6 (UI): Step 15 — can start basic UI earlier (after step 2), but full dashboard needs RFM data.
- Phase 7 (AI): Step 14 — additive feature, no other components depend on it.

---

## Scalability Considerations

| Concern | At 1K customers | At 50K customers | At 500K customers |
|---------|-----------------|-----------------|-------------------|
| RFM full recalc | Fine, run inline in Inngest step | Batch in chunks of 500, use step.run() per chunk | Dedicated Postgres function + pg_cron |
| Shopify bulk sync | JSONL stream directly | JSONL stream + batch inserts of 500 rows | Same + connection pooling (PgBouncer via Supabase) |
| Webhook throughput | Direct Inngest event per webhook | Same — Inngest fan-out handles queue | Consider dedicated webhook queue (Supabase Realtime or SQS) |
| Dashboard queries | No indexes needed beyond shopify_id | Add composite index on (shop_id, segment, last_order_at) | Materialized views for KPI aggregates |
| Automation check | Scan all customers in one step | Fan-out to per-customer events | Same fan-out, add last_checked_at index |
| Email send rate | Resend free tier (100/day) | Resend Pro (50K/mo) | Resend scale tier + sending schedule spreading |

**Indexing strategy (add in schema.ts from day one):**
```typescript
// Compound indexes that will be hit by every major query
export const customersShopSegmentIdx = index("customers_shop_segment_idx")
  .on(customers.shopId, customers.segment);

export const customersShopLastOrderIdx = index("customers_shop_last_order_idx")
  .on(customers.shopId, customers.lastOrderAt);

export const ordersCustomerCreatedIdx = index("orders_customer_created_idx")
  .on(orders.customerId, orders.createdAt);

export const messageLogsCustomerAutomationIdx = index("message_logs_customer_automation_idx")
  .on(messageLogs.customerId, messageLogs.automationId, messageLogs.sentAt);
```

---

## Library-Specific Notes

### Drizzle ORM 0.45.x (HIGH confidence — version in package.json)
- Uses `postgres` driver (also in package.json) not `pg` — connection string goes directly to `postgres()` from the `postgres` package
- `drizzle-kit` 0.31.x handles migrations via `drizzle-kit push` (dev) or `drizzle-kit generate` + `drizzle-kit migrate` (prod)
- `decimal` column type → TypeScript `string`, not `number`
- Relations defined with `relations()` helper — separate from schema tables, used for type inference only (not enforced by ORM)

### Inngest 3.52.x (HIGH confidence — version in package.json)
- `serve()` from `inngest/next` handles GET/POST/PUT — all three methods must be exported from the route
- `step.sleep()` accepts duration strings like `"3d"`, `"2h"`, `"30m"` — ideal for automation delays
- `step.sendEvent()` returns after the event is enqueued (not after child function completes) — this is the correct fan-out trigger
- Idempotency: Inngest deduplicates events with same `id` field within a short window — pass `id: shopifyOrderId` on order events to prevent duplicate processing

### Resend 6.x (HIGH confidence — version in package.json)
- `react` option accepts a React Email component directly
- Returns `{ data: { id: string }, error: null }` or `{ data: null, error: ... }` — always check error
- `from` address must be a verified domain in Resend dashboard

### Next.js 14 App Router (HIGH confidence)
- Route Handlers use `export async function POST(request: Request)` — no `req`/`res` pattern
- Server Actions can be used for form mutations (alternative to API routes for simple CRUD)
- `app/api/inngest/route.ts` must export `{ GET, POST, PUT }` exactly — Inngest SDK probes GET for handshake
- Dynamic routes: `params` is now `Promise<{ id: string }>` in Next.js 15 but still synchronous object in Next.js 14

---

## Sources

- package.json (project) — confirmed library versions: Next.js 14.2.35, Inngest 3.52.1, Drizzle ORM 0.45.1, Resend 6.9.2
- CLAUDE.md (project) — confirmed tech decisions, data models, coding rules
- Training data: Inngest v3 `serve()` API, `step.*` methods, event schema patterns (HIGH confidence, version matches)
- Training data: Shopify Admin API HMAC-SHA256 webhook verification (HIGH confidence, stable API)
- Training data: Next.js 14 App Router Route Handlers, Server Components pattern (HIGH confidence)
- Training data: Drizzle ORM `onConflictDoUpdate` upsert pattern (HIGH confidence)
- Training data: Shopify `bulkOperationRunQuery` async polling pattern (HIGH confidence)
- NOTE: WebSearch, WebFetch, and external tool access were unavailable during this research session. All claims above are based on training data (cutoff August 2025) cross-referenced against confirmed package versions. Flag any Inngest 3.52.x-specific API changes for validation.
"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":433,"cache_read_input_tokens":18144,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":433},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcJaxrLda5vfGmzxxLc","type":"assistant","uuid":"e7afa330-db75-4cf7-b597-be5fc1dee07d","timestamp":"2026-02-19T02:08:35.945Z"}
{"parentUuid":"e7afa330-db75-4cf7-b597-be5fc1dee07d","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"aeba909","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","is_error":true,"tool_use_id":"toolu_01DqRwG52QfbHXSzqVcGcWeF"}]},"uuid":"4c7d3225-544b-421b-a242-d9baeb77d0d9","timestamp":"2026-02-19T02:08:35.949Z","toolUseResult":"Error: Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","sourceToolAssistantUUID":"e7afa330-db75-4cf7-b597-be5fc1dee07d"}
{"parentUuid":"4c7d3225-544b-421b-a242-d9baeb77d0d9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"aeba909","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01KD53DSo8os2GpMmZCCjprb","type":"message","role":"assistant","content":[{"type":"text","text":"I don't have permission to write files either. I need to stop and explain this to you.

---

## 