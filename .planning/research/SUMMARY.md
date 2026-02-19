# Project Research Summary

**Project:** EcomCRM — Shopify CRM + Marketing Automation
**Domain:** Shopify SMB CRM / Email Marketing Automation
**Researched:** 2026-02-19
**Confidence:** HIGH (stack versions verified from package.json; architecture patterns verified against known library APIs; pitfalls cross-referenced against official docs)

---

## Executive Summary

EcomCRM is a CRM + marketing automation tool for Shopify merchants, and the research confirms a clear, well-trodden path for building it. The entire stack is already installed and pinned (Next.js 14.2.35, Drizzle ORM 0.45.1, Inngest 3.52.1, Resend 6.9.2, Anthropic SDK 0.76.0), which removes technology choice risk entirely. The product bet is a CRM-native framing — using RFM quintile scoring to auto-segment customers and drive triggered email flows — which is genuinely absent from all three major SMB Shopify competitors (Klaviyo, Omnisend, Drip). Two missing packages need adding before code starts: `@react-email/render` (required to send any email) and `decimal.js` (required for correct money arithmetic).

The recommended architecture is: Next.js App Router handles API routes and Server Component pages; Inngest runs all background work (sync, RFM recalculation, automation execution) with built-in retries and step-level checkpointing; Drizzle ORM with PostgreSQL via Supabase provides the data layer; Resend + React Email handle email delivery. The system has a strict build-order dependency: schema first, then Shopify sync, then RFM engine, then automation engine, then UI. Nothing works until data is in the database, and nothing should send email until unsubscribe/bounce suppression is wired.

The dominant risks are not technology risks — they are integration correctness risks. HMAC webhook verification must read raw bytes before JSON parsing. Bulk sync must use `bulkOperationRunQuery` with async completion handling, not synchronous pagination. Automations must not fire on historical backfill data. Money must never touch a float. RFM quintile computation must run in PostgreSQL, not application memory. Every one of these mistakes has been made in the wild, causes silent data corruption or mass email blasts, and is non-trivial to fix after the fact. Address them in Phase 1 schema and Phase 2 Shopify integration before any other feature work.

---

## Key Findings

### Recommended Stack

All core dependencies are installed and pinned. The stack is locked and non-negotiable per CLAUDE.md. The only changes needed are adding two missing packages and establishing the Drizzle migration workflow before touching the schema.

**Core technologies:**
- **Next.js 14.2.35 (App Router):** Full-stack framework — Server Components for data-heavy CRM views, API routes for webhook ingestion and sync triggers. Do not upgrade to 15.x mid-project (async `params` breaking change).
- **Drizzle ORM 0.45.1 + drizzle-kit 0.31.9:** Type-safe schema-first ORM. Must be version-locked together. Use `generate + migrate` workflow, never `push` against production.
- **PostgreSQL via Supabase:** Hosted Postgres. Use PgBouncer Transaction mode connection string (port 6543) to avoid serverless connection pool exhaustion.
- **Inngest 3.52.1:** Event-driven background jobs with durable execution, step-level retries, and native `step.sleep()` for automation delays. The correct architecture for all async work in a Vercel deployment.
- **Resend 6.9.2 + @react-email/components 1.0.8:** Email delivery + typed template primitives. `@react-email/render` package is missing and must be added — it provides the `render()` function needed to convert templates to HTML for Resend.
- **Zod 4.3.6:** Schema validation on all API inputs. Write Zod 4 patterns from day one (e.g., `z.string().min(1)` not `.nonempty()`).
- **Anthropic SDK 0.76.0:** Claude API for per-customer insight narratives and email copy generation.
- **decimal.js (missing):** Must be added. Money values from Shopify are strings; arithmetic requires a decimal library to avoid IEEE 754 precision errors that corrupt RFM M-scores.
- **Native fetch (no Shopify SDK):** For a Custom App with a static access token, a typed fetch wrapper is simpler and more maintainable than `@shopify/admin-api-client`. Pin to Shopify Admin API version `2025-01`.

### Expected Features

**Must have (table stakes) — every Shopify CRM tool ships these:**
- Shopify customer + order sync (full initial + incremental webhook) — the foundation; nothing else works without it
- Customer list with search and segment/tag filters — basic CRM navigation
- Customer 360 profile (order history, spend, tags, email activity) — core CRM experience
- Email send with unsubscribe link — legal requirement before any production send
- Welcome email automation — highest-ROI flow, every competitor ships it
- Abandoned cart automation — second-highest ROI, merchants expect it
- Hard bounce and unsubscribe suppression — legal and deliverability requirement, must exist before first send
- Dashboard KPIs (revenue, customer count, automation performance) — daily driver

**Should have (genuine differentiators for EcomCRM):**
- RFM-based segmentation: quintile-based, adaptive, 7 named segments (champion/loyal/potential/new/at_risk/hibernating/lost) — the core intellectual differentiator; no SMB competitor ships this as an automatic CRM layer
- RFM scores surfaced on customer profile — CRM-native framing vs. competitors' email-native framing
- Segment-change automation trigger — fires when a customer transitions segments (e.g., loyal → at_risk); unique to this product
- AI-generated customer insights (Claude API) — per-profile narrative ("this customer is at risk..."); no SMB competitor offered this as of mid-2025
- Churn alert dashboard widget — "15 customers moved to at_risk this week"; CRM-native intelligence email tools don't provide
- 5 preset automation flows (welcome, abandoned-cart, repurchase, winback, VIP) — pre-wired and one-toggle to enable; dramatically reduces time-to-value vs. competitors
- AI email copy suggestions — reduces setup friction for non-copywriter merchants

**Defer to v2+:**
- SMS channel — compliance overhead (TCPA, GDPR) is too heavy for v1; schema already reserves the `channel` enum slot
- A/B testing — needs larger lists than typical v1 users; produces misleading results at small scale
- Visual flow builder — half-built drag-and-drop is worse than no builder; preset flows with form editing is the correct v1 UX
- WYSIWYG email template editor — React Email code templates already produce polished output; textbox editing for subject/body is sufficient v1

### Architecture Approach

The architecture follows a clean event-driven separation: Next.js API routes handle ingestion (webhooks → Inngest events) and respond immediately with 200; all processing happens asynchronously in Inngest functions which call the core library modules; Server Components read directly from Drizzle/PostgreSQL with no client-side data fetching. Every Shopify write uses idempotent upserts keyed on `shopify_id`. Money is stored as PostgreSQL `NUMERIC(10,2)` and never converted to JavaScript `number`. RFM quintile computation runs as a PostgreSQL window function (`NTILE(5) OVER`), not in application memory.

**Major components:**
1. `lib/shopify/` — GraphQL client with cost-based rate limiting, bulk sync logic, HMAC verification
2. `lib/db/schema.ts + queries.ts` — Drizzle schema (4 tables: customers, orders, automations, message_logs) + all query functions centralized here; no inline queries in routes or components
3. `lib/rfm/engine.ts` — Quintile scoring via PostgreSQL window functions; daily cron + per-event rescoring against stored quintile boundaries
4. `lib/automation/engine.ts + actions.ts` — Trigger evaluation, delay management via Inngest `step.sleep()`, action execution (send_email, add_tag, remove_tag)
5. `lib/email/send.ts` — Resend wrapper with idempotency keys to prevent duplicate sends on Inngest retry
6. `inngest/functions.ts` — All background jobs: daily RFM cron, daily automation check, event-driven order/customer sync, fan-out automation execution
7. UI pages — Server Components fetching from Drizzle; Client Components only for interactive elements (automation editor, enable/disable toggle)

### Critical Pitfalls

1. **HMAC computed over re-stringified body fails** — Always `await req.text()` first, compute HMAC over raw string, then `JSON.parse()`. Never use `req.json()` before HMAC. Use `timingSafeEqual`, not `===`. Pin webhook route to Node.js runtime (not Edge) because `node:crypto` is unavailable on Edge.

2. **Automation fires on historical backfill during initial sync** — Add `is_historical` flag to sync pipeline. Gate all automation triggers on fresh events only (e.g., `order.created_at > sync_completed_at`). Store sync completion timestamp; don't enable automations until initial sync is confirmed complete. Mass-emailing your entire customer base on first sync destroys sender reputation.

3. **Duplicate emails from Inngest retry** — Pass idempotency key to every Resend `emails.send()` call: `customerId + automationId + eventTimestamp`. Resend deduplicates on this key. Also guard with `MessageLog` insert using `ON CONFLICT DO NOTHING`.

4. **Floating-point money corrupts RFM M-scores** — Parse Shopify money strings with `decimal.js`. Store as `NUMERIC(10,2)` in PostgreSQL. Sum with `SUM(total_price::numeric)` in DB. Never convert to JavaScript `number` for arithmetic.

5. **RFM quintile computation in application memory crashes at scale** — Use `NTILE(5) OVER (ORDER BY ...)` PostgreSQL window function. A Node.js process loading 50K+ customer rows to sort and partition is slow and will OOM in serverless. This is a database operation, not application logic.

6. **`bulkOperationRunQuery` treated as synchronous** — The bulk operation takes minutes to complete on Shopify's servers. Register a `bulk_operations/finish` webhook; on receipt, fetch and stream-parse the JSONL result file. Never poll in a tight loop. Store bulk operation state in DB for safe restarts.

7. **Webhook duplicates cause double processing** — Shopify guarantees at-least-once delivery. Deduplicate on `X-Shopify-Webhook-Id` header. Use `onConflictDoNothing()` on all `shopify_id` upserts.

---

## Implications for Roadmap

The feature dependency graph and pitfall analysis together dictate a clear phase ordering. Nothing can be skipped or reordered without creating correctness problems downstream.

### Phase 1: Foundation — Schema, DB, Config

**Rationale:** Every subsequent phase depends on the database schema. Getting schema wrong (float money, missing indexes, bad enum design) requires painful migrations later. Establish migration workflow before writing a single line of schema.

**Delivers:** Drizzle schema for all 4 tables (customers, orders, automations, message_logs), Drizzle config, migration scripts, DB connection setup with Supabase PgBouncer Transaction mode, compound indexes from day one.

**Implements:** `lib/db/schema.ts`, `lib/db/queries.ts`, `drizzle.config.ts`, migration workflow

**Avoids:** Float money pitfall (Pitfall 5), connection pool exhaustion (Pitfall 8), `drizzle-kit push` to production (Pitfall 15)

**Research flag:** Standard patterns — Drizzle schema definition and migration workflow are well-documented. No additional research needed.

---

### Phase 2: Shopify Integration — Sync + Webhooks

**Rationale:** Without Shopify data in the database, RFM scoring and automations have nothing to work with. This phase is the data foundation. It is also where the most dangerous pitfalls live — HMAC verification, bulk sync async model, idempotent upserts, historical data gate.

**Delivers:** Shopify GraphQL client with rate limiting, full initial bulk sync via `bulkOperationRunQuery`, webhook ingestion (orders/create, orders/updated, customers/create, customers/update) with HMAC verification, incremental sync, Inngest event firing.

**Implements:** `lib/shopify/client.ts`, `lib/shopify/sync.ts`, `lib/shopify/webhooks.ts`, `app/api/webhooks/shopify/route.ts`, `app/api/sync/route.ts`, `inngest/client.ts`, `app/api/inngest/route.ts`

**Avoids:** HMAC body parsing pitfall (Pitfall 1), webhook duplicates (Pitfall 2), GraphQL cost exhaustion (Pitfall 3), bulk sync synchronous assumption (Pitfall 4), automation on historical data (Pitfall 10), Shopify API version drift (Pitfall 9)

**Research flag:** Needs validation — Shopify `bulkOperationRunQuery` async model and `bulk_operations/finish` webhook should be verified against current Shopify docs before implementation. Rate limit budget numbers (1000 points/second) should also be confirmed.

---

### Phase 3: RFM Engine + Segmentation

**Rationale:** RFM is the core differentiator and the foundation for all automation triggers. Must be validated with real data before any automation is enabled. Requires Phase 2 (customer + order data in DB).

**Delivers:** Quintile-based RFM scoring using PostgreSQL `NTILE(5)` window functions, 7-segment label mapping, daily Inngest cron for full recalculation, per-event rescoring against stored quintile boundaries, segment-change detection and event emission.

**Implements:** `lib/rfm/engine.ts`, daily RFM cron in `inngest/functions.ts`, `rfm_config` table (quintile boundaries cache)

**Avoids:** In-memory quintile computation pitfall (Pitfall 6), race condition between per-event and cron recalculation (Pitfall 12), using incorrect data from partial sync

**Research flag:** Standard patterns — PostgreSQL window functions are well-documented. The `NTILE(5) OVER` pattern is stable SQL. Inngest concurrency key syntax for Pitfall 12 mitigation should be verified against Inngest 3.52.x docs.

---

### Phase 4: Email Infrastructure + Compliance

**Rationale:** Must be complete before any automation sends email. Unsubscribe handling and bounce suppression are legal requirements, not optional features. This phase unlocks the automation engine.

**Delivers:** React Email templates (all 5 presets: welcome, abandoned-cart, repurchase, winback, VIP), Resend integration with idempotency keys, unsubscribe management (Resend webhook → customer opt-out flag), hard bounce suppression, email open and click tracking, `List-Unsubscribe` headers for bulk sender compliance.

**Implements:** `lib/email/send.ts`, `emails/` templates (5 files), Resend webhook handler for unsubscribe/bounce events, `marketing_opted_out` field gating all sends

**Avoids:** Duplicate email sends on Inngest retry (Pitfall 7), regulatory violation from unsubscribe not honoured (Pitfall 17), marketing/transactional domain mixing (Pitfall 11)

**Research flag:** Needs validation — Resend idempotency key support should be verified against current Resend API docs. Gmail/Yahoo `List-Unsubscribe-Post` header requirement (Feb 2024 mandate) should be confirmed as still enforced.

---

### Phase 5: Automation Engine + Preset Flows

**Rationale:** The automation engine requires Phase 3 (RFM segments) and Phase 4 (email sending + compliance) to be complete. Trigger evaluation is meaningless without correct segments; action execution is blocked without compliant email sending.

**Delivers:** Automation trigger evaluation engine (first_order, segment_change, days_since_order, tag_added, cart_abandoned), delay handling via Inngest `step.sleep()`, action executors (send_email, add_tag, remove_tag), all 5 preset automation flows enabled with toggle, daily automation check cron, fan-out pattern for per-customer processing, `MessageLog` writes on every send.

**Implements:** `lib/automation/engine.ts`, `lib/automation/actions.ts`, automation functions in `inngest/functions.ts`

**Avoids:** Historical backfill triggering automations (Pitfall 10 — gate implemented in Phase 2), duplicate automation sends (Pitfall 7 — idempotency from Phase 4)

**Research flag:** Standard patterns — Inngest `step.sleep()` and fan-out via `step.sendEvent()` are well-documented for v3. No additional research needed for the trigger/delay/action pattern.

---

### Phase 6: Dashboard + Customer UI

**Rationale:** UI can be built in parallel with Phases 3-5 for basic scaffolding, but the full dashboard requires RFM data and automation data to be meaningful. Ship basic customer list and profile views early; complete dashboard KPIs and churn alerts after RFM is working.

**Delivers:** Dashboard with KPIs (total revenue, customer count, segment distribution chart, churn alert widget showing segment movement), customer list with segment/tag filters and search, customer 360 profile (order timeline, RFM scores, segment label, email history), automation list with enable/disable toggle, automation detail editor (trigger/delay/action form fields).

**Implements:** `app/(dashboard)/page.tsx`, `app/customers/page.tsx`, `app/customers/[id]/page.tsx`, `app/automations/page.tsx`, `app/automations/[id]/page.tsx`, shared components

**Avoids:** Client Components fetching directly from Supabase (Anti-Pattern 5 from ARCHITECTURE.md)

**Research flag:** Standard patterns — Next.js 14 Server Components, shadcn/ui, Recharts are all well-documented. No additional research needed.

---

### Phase 7: AI Layer

**Rationale:** AI features are additive — nothing depends on them. Ship after the data layer is stable and validated. The quality of Claude-generated insights depends on having correct RFM scores and order history, so this is correctly the last phase.

**Delivers:** Per-customer AI insight narrative on the 360 profile, AI-generated email copy suggestions on automation template editor.

**Implements:** `lib/ai/insights.ts`, integration into customer profile and automation editor pages

**Research flag:** Standard patterns — Anthropic SDK 0.76.0 is installed and well-documented. Prompt engineering for CRM insights is not complex. No additional research needed.

---

### Phase Ordering Rationale

- **Phases 1-2 must be sequential and complete** before anything else. Schema errors and sync correctness errors are catastrophic and hard to fix retroactively.
- **Phase 3 (RFM) requires Phase 2 data** — running quintile scoring on empty or partial data produces meaningless segments.
- **Phase 4 (Email compliance) must precede Phase 5 (Automations)** — sending email without unsubscribe/bounce handling is a legal violation.
- **Phase 6 (UI) can start partial scaffolding early** (after Phase 1 schema) but full functionality requires Phases 3-5.
- **Phase 7 (AI) is fully independent** once Phase 3 data exists, and correctly ships last.

### Research Flags Summary

| Phase | Status | Reason |
|-------|--------|--------|
| Phase 1: Foundation | Standard — no research needed | Drizzle schema + migration patterns are well-established |
| Phase 2: Shopify Integration | Needs validation | `bulkOperationRunQuery` async model, rate limit numbers, API version |
| Phase 3: RFM Engine | Mostly standard | PostgreSQL NTILE is stable; verify Inngest concurrency key syntax |
| Phase 4: Email Infrastructure | Needs validation | Resend idempotency key, Gmail/Yahoo bulk sender requirements |
| Phase 5: Automation Engine | Standard — no research needed | Inngest step patterns are well-documented for v3 |
| Phase 6: Dashboard UI | Standard — no research needed | Next.js + shadcn/ui + Recharts are well-documented |
| Phase 7: AI Layer | Standard — no research needed | Anthropic SDK is well-documented |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified directly from package.json/package-lock.json. Two missing packages identified with certainty. Version compatibility notes (Drizzle pairing, Zod 4 API changes, Next.js 14 vs 15 breaking change) are well-documented. |
| Features | MEDIUM | Table stakes and anti-features are HIGH confidence (grounded in project spec and well-known patterns). Differentiator claims (especially AI feature gaps vs. Klaviyo/Omnisend) are MEDIUM — competitors may have shipped AI features after August 2025 training cutoff. |
| Architecture | HIGH | Patterns are grounded in confirmed library versions. Inngest v3 step API, Drizzle upsert patterns, Next.js App Router route handlers, Shopify webhook HMAC — all verified against known API shapes. Minor caveat: Inngest 3.52.x concurrency key syntax should be verified against current docs. |
| Pitfalls | HIGH | All critical pitfalls are well-documented failure modes: HMAC body parsing, webhook idempotency, bulk sync async model, float money, in-memory RFM. These are stable risks that don't change with library versions. Medium-confidence items are flagged (Inngest concurrency syntax, Edge Runtime crypto). |

**Overall confidence:** HIGH

### Gaps to Address

- **Shopify Admin API version `2025-01` confirmation:** Verify at shopify.dev/changelog that 2025-01 is current stable and note its deprecation date. If a newer version (2025-04+) has shipped, evaluate whether to pin to the newer release.
- **Resend idempotency key API:** Confirm current Resend API supports `idempotencyKey` on `emails.send()`. If not, implement application-layer deduplication via `MessageLog` `ON CONFLICT DO NOTHING` as the sole guard.
- **Inngest `concurrency` config syntax for v3.52.x:** Verify `{ concurrency: { limit: 1, key: 'event/customer.id' } }` is valid in the installed version to prevent RFM recalculation race conditions.
- **Klaviyo/Omnisend AI feature parity:** Check whether competitors have shipped per-customer AI narratives since August 2025. This affects how aggressively to position the AI layer as a differentiator.
- **Gmail/Yahoo bulk sender enforcement:** Confirm `List-Unsubscribe-Post` header requirement is still enforced and review current thresholds. This is Phase 4 compliance work.

---

## Sources

### Primary (HIGH confidence)
- `/Users/zhangjiabei/Desktop/ecomcrm/package-lock.json` — resolved installed versions (source of truth)
- `/Users/zhangjiabei/Desktop/ecomcrm/CLAUDE.md` — authoritative project constraints and coding rules
- `/Users/zhangjiabei/Desktop/ecomcrm/.planning/PROJECT.md` — project requirements and scope decisions

### Secondary (MEDIUM confidence)
- Training data through August 2025: Drizzle ORM 0.45.x API, Inngest v3 step functions, Shopify Admin GraphQL API patterns, Resend + React Email integration
- Training data: Klaviyo, Omnisend, Drip feature sets (for competitive analysis) — verify AI feature claims against current competitor docs
- Training data: Shopify webhook at-least-once delivery, cost-based rate limiting, bulk operation async model

### Tertiary (LOW confidence — verify before implementing)
- Shopify Admin API `2025-01` as current stable version — verify at shopify.dev
- Resend idempotency key support — verify at resend.com/docs
- Inngest concurrency config syntax for v3.52.1 — verify at inngest.com/docs
- Klaviyo/Omnisend current AI capabilities — verify against competitor docs (training data cutoff August 2025 may miss recent launches)

---

*Research completed: 2026-02-19*
*Ready for roadmap: yes*
