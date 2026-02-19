# Roadmap: EcomCRM

## Overview

EcomCRM builds a complete Shopify CRM and marketing automation loop across 7 phases, each delivering a distinct, verifiable capability. The dependency chain is strict: schema must exist before sync can run, sync must have real data before RFM can score, email compliance must be in place before automations can send, and the UI has meaningful data only after all backend phases are complete. Each phase is independently verifiable before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Schema, DB connection, env, and Inngest registered
- [ ] **Phase 2: Shopify Integration** - Real customer and order data flowing into the DB
- [ ] **Phase 3: RFM Engine** - Customers auto-segmented into 7 labeled groups
- [ ] **Phase 4: Email Infrastructure** - Compliant email sending with suppression and templates
- [ ] **Phase 5: Automation Engine** - Triggered email flows firing on real customer events
- [ ] **Phase 6: Dashboard and Customer UI** - Full CRM interface over live data
- [ ] **Phase 7: AI Insights** - Per-customer narratives and copy generation via Claude

## Phase Details

### Phase 1: Foundation
**Goal**: The data layer and configuration baseline exists — every subsequent phase can build without rework
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Running `drizzle-kit generate` then `drizzle-kit migrate` creates all 4 tables (customers, orders, automations, message_logs) with correct columns, types, and indexes in the Supabase database
  2. The application connects to Supabase via the PgBouncer Transaction mode pooler (port 6543) without connection exhaustion errors under concurrent requests
  3. All required env vars are documented in `.env.local.example` and the app fails with a clear error at startup if any are missing
  4. A GET to `/api/inngest` returns 200 and Inngest Dev Server can receive test events from the local app
**Plans**: TBD

Plans:
- [ ] 01-01: Drizzle schema, migration workflow, Supabase connection
- [ ] 01-02: Missing packages, env setup, Inngest client and serve handler

### Phase 2: Shopify Integration
**Goal**: Real Shopify customer and order data is in the database, kept current via webhooks
**Depends on**: Phase 1
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07, SHOP-08, SHOP-09
**Success Criteria** (what must be TRUE):
  1. Triggering a full sync loads all customers and orders from the Shopify store into the database, with money stored as NUMERIC and an `is_historical = true` flag on backfilled orders
  2. Creating an order in Shopify triggers the webhook endpoint within seconds; the endpoint returns 200 only after HMAC verification passes and upserts the record idempotently
  3. Sending the same webhook payload twice (duplicate `X-Shopify-Webhook-Id`) results in only one database record — no duplicate processing
  4. The UI shows "Last synced X ago" and displays an alert when no sync has completed in the past 24 hours
  5. GraphQL requests back off automatically when the Shopify API cost budget is low — no 429 errors crash the sync
**Plans**: TBD

Plans:
- [ ] 02-01: Shopify GraphQL client with rate limiting and bulk sync logic
- [ ] 02-02: Webhook ingestion endpoint, HMAC verification, idempotency
- [ ] 02-03: Incremental sync handlers, Inngest event wiring, sync status UI

### Phase 3: RFM Engine
**Goal**: Every customer in the database has an RFM score and a named segment that updates automatically
**Depends on**: Phase 2
**Requirements**: RFM-01, RFM-02, RFM-03, RFM-04, RFM-05, RFM-06
**Success Criteria** (what must be TRUE):
  1. After a full sync, every customer row has non-null rfm_r, rfm_f, rfm_m scores (1-5) and a segment label from the set: champion / loyal / potential / new / at_risk / hibernating / lost
  2. Quintile boundaries are computed by PostgreSQL `NTILE(5) OVER` window functions, not application-memory sorting — no customer rows are loaded into Node.js for scoring
  3. When a new order webhook arrives, the affected customer's order_count, total_spent, and last_order_at update within the same Inngest step that processes the event
  4. The daily Inngest cron runs, recomputes quintile boundaries across all customers, and persists updated segment assignments without manual intervention
  5. When a customer's segment changes (e.g., loyal to at_risk), a `segment_change` event is emitted that automation triggers can consume
**Plans**: TBD

Plans:
- [ ] 03-01: RFM scoring engine with PostgreSQL window functions and segment mapping
- [ ] 03-02: Daily cron, per-event rescoring, segment-change event emission

### Phase 4: Email Infrastructure
**Goal**: Email can be sent to opted-in customers with full compliance — no unsubscribes honored, no sends to bounced addresses
**Depends on**: Phase 1
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06
**Success Criteria** (what must be TRUE):
  1. All 5 React Email templates (welcome, abandoned-cart, repurchase, winback, VIP) render to valid HTML and display correctly on mobile viewport
  2. Every outbound marketing email contains `List-Unsubscribe` and `List-Unsubscribe-Post` headers
  3. When a customer clicks unsubscribe, the Resend webhook fires and sets `marketing_opted_out = true` on that customer within seconds — subsequent send attempts for that customer are blocked at the send layer
  4. When a hard bounce occurs, the customer is added to a suppression list and no further emails are dispatched to that address
  5. Calling `sendEmail()` twice with the same idempotency key results in exactly one email delivered — Resend deduplicates on the key
**Plans**: TBD

Plans:
- [ ] 04-01: React Email templates (all 5), Resend send wrapper with idempotency
- [ ] 04-02: Unsubscribe webhook, bounce suppression, compliance headers, subdomain config

### Phase 5: Automation Engine
**Goal**: All 5 preset flows evaluate triggers, wait delays, and execute actions on real customer events — with no duplicate sends and no fires on historical data
**Depends on**: Phase 3, Phase 4
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07, FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05
**Success Criteria** (what must be TRUE):
  1. Placing a first order in Shopify triggers the welcome flow: after a 1-hour delay, the welcome email arrives in the customer's inbox — with no duplicate send if the Inngest function retries
  2. Starting a cart abandonment then completing the order within 2 hours cancels the abandoned-cart email — it does not send after the order completes
  3. A customer in the `at_risk` or `hibernating` segment who has not ordered in 90 days receives the win-back email without manual action
  4. When a customer transitions to the `champion` segment, they receive the VIP email and the "vip" tag is added back to their Shopify customer record
  5. No automation fires on orders that arrived during the initial historical backfill (is_historical = true orders are excluded from trigger evaluation)
  6. The automation list page shows all 5 preset flows; toggling enable/disable takes effect on the next evaluation cycle
**Plans**: TBD

Plans:
- [ ] 05-01: Automation trigger evaluation engine and Inngest wiring
- [ ] 05-02: Delay handling via step.sleep(), action executors (send_email, add_tag, remove_tag)
- [ ] 05-03: All 5 preset flow configurations, MessageLog writes, automation list page

### Phase 6: Dashboard and Customer UI
**Goal**: The CRM interface surfaces all data — KPIs, segment health, customer profiles, and automation status — over live data from the database
**Depends on**: Phase 3, Phase 5
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. The dashboard loads KPI cards (total customers, total revenue, new customers last 30 days, automation emails sent last 30 days) and both charts (segment distribution, revenue over time) with live database data
  2. The customer list paginates correctly and filters by segment and free-text search by name or email — results update without a full page reload
  3. A customer 360 profile shows order timeline, RFM scores with segment label, Shopify tags, lifecycle stage, and message history (subject, sent date, open/click status) for that customer
  4. The churn alert widget on the dashboard shows the count and names of customers who moved to at_risk, hibernating, or lost in the last 7 days
  5. The recent activity feed shows the latest automation sends and Shopify order events in reverse chronological order
**Plans**: TBD

Plans:
- [ ] 06-01: Dashboard page (KPIs, segment chart, revenue chart, churn widget, activity feed)
- [ ] 06-02: Customer list page (pagination, search, segment filter)
- [ ] 06-03: Customer 360 profile page (order timeline, RFM, tags, message history)

### Phase 7: AI Insights
**Goal**: The Claude API adds per-customer intelligence and email copy generation on top of the complete data layer
**Depends on**: Phase 3, Phase 6
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. Opening a customer 360 profile generates and displays a plain-language insight narrative (e.g., "Customer is at risk: last ordered 90 days ago, down from monthly cadence. Suggest win-back offer.") using live RFM scores and order data
  2. On the automation template editor, clicking "Generate suggestions" produces AI-written subject line and body copy options that can be accepted or discarded before saving
**Plans**: TBD

Plans:
- [ ] 07-01: AI insights library, customer profile integration, automation editor copy generation

## Progress

**Execution Order:**
Phases execute in dependency order: 1 → 2 → 3 → 4 (can overlap with 2-3) → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Shopify Integration | 0/3 | Not started | - |
| 3. RFM Engine | 0/2 | Not started | - |
| 4. Email Infrastructure | 0/2 | Not started | - |
| 5. Automation Engine | 0/3 | Not started | - |
| 6. Dashboard and Customer UI | 0/3 | Not started | - |
| 7. AI Insights | 0/1 | Not started | - |
