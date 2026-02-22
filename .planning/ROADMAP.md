# Roadmap: EcomCRM

## Milestones

- ✅ **v1.0 Full CRM Loop** - Phases 1-7 (shipped 2026-02-21)
- 🚧 **v1.1 Make It Real - Production-Ready Automations** - Phases 8-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 Full CRM Loop (Phases 1-7) - SHIPPED 2026-02-21</summary>

### Phase 1: Foundation
**Goal**: The data layer and configuration baseline exists — every subsequent phase can build without rework
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Running `drizzle-kit generate` then `drizzle-kit migrate` creates all 4 tables (customers, orders, automations, message_logs) with correct columns, types, and indexes in the Supabase database
  2. The application connects to Supabase via the PgBouncer Transaction mode pooler (port 6543) without connection exhaustion errors under concurrent requests
  3. All required env vars are documented in `.env.local.example` and the app fails with a clear error at startup if any are missing
  4. A GET to `/api/inngest` returns 200 and Inngest Dev Server can receive test events from the local app
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Drizzle schema (4 tables + 6 enums), db singleton with prepare: false, drizzle.config.ts, generate migration SQL
- [x] 01-02-PLAN.md — Install @react-email/render + decimal.js, next.config serverExternalPackages, Zod env validation, .env.local.example, Inngest client + serve handler

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
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Schema extensions (sync_logs, webhook_deliveries, is_historical, soft-delete) and Shopify GraphQL client with cost-based rate limiting
- [x] 02-02-PLAN.md — Bulk sync pipeline, webhook endpoint with HMAC + idempotency, incremental handlers, Inngest functions
- [x] 02-03-PLAN.md — Sync status nav indicator (idle/spinning/stale), settings/sync page, live progress, force sync
- [x] 02-04-PLAN.md — Gap closure: fix bulk_operations/finish failure path (syncLog marked failed) + add onFailure dead-letter handler + fix last-write-wins timestamp comparison in upsert queries
- [x] 02-05-PLAN.md — Gap closure: update documentation (CLAUDE.md, REQUIREMENTS.md, codebase map) to reflect SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET replacing SHOPIFY_ACCESS_TOKEN

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
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — RFM scoring engine with PostgreSQL NTILE(5) window functions and segment mapping, customer counter recalculation query
- [x] 03-02-PLAN.md — Daily Inngest cron for full RFM recalculation, per-order customer counter updates, segment-change event emission

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
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Schema extensions (suppressions table, marketing_opted_out column, messageStatus enum), env vars, unsubscribe token utility, 5 React Email templates, Resend send wrapper with idempotency + compliance headers + suppression gate
- [x] 04-02-PLAN.md — Resend bounce/complaint webhook endpoint, unsubscribe API with Shopify tag sync, unsubscribe confirmation page with undo/resubscribe

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
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Automation engine core: engine.ts + actions.ts + presets.ts + DB query helpers + event-driven Inngest functions (first_order, segment_change, cart_abandoned)
- [x] 05-02-PLAN.md — Days-since-order daily cron + preset seed API + automation PATCH toggle API + automation list page (with human-verify checkpoint)

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
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Dashboard page: KPI cards, segment distribution chart, revenue over time chart, churn alert widget, recent activity feed
- [x] 06-02-PLAN.md — Customer list page: paginated table with search by name/email, segment filter, API endpoint
- [x] 06-03-PLAN.md — Customer 360 profile page: customer info, RFM scores, order timeline, tags, message history (with human-verify checkpoint)

### Phase 7: AI Insights
**Goal**: The Claude API adds per-customer intelligence and email copy generation on top of the complete data layer
**Depends on**: Phase 3, Phase 6
**Requirements**: AI-01, AI-02
**Success Criteria** (what must be TRUE):
  1. Opening a customer 360 profile generates and displays a plain-language insight narrative (e.g., "Customer is at risk: last ordered 90 days ago, down from monthly cadence. Suggest win-back offer.") using live RFM scores and order data
  2. On the automation template editor, clicking "Generate suggestions" produces AI-written subject line and body copy options that can be accepted or discarded before saving
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — AI insights library (generateCustomerInsight + generateEmailCopy), customer profile insight API + async client component
- [x] 07-02-PLAN.md — Automation detail page with AI email copy generator, clickable automation list rows (with human-verify checkpoint)

</details>

---

### v1.1 Make It Real - Production-Ready Automations (In Progress)

**Milestone Goal:** Make the automation pipeline actually fire end-to-end, add configuration and email customization UI, and polish the whole app for demo-readiness.

#### Phase 8: Pipeline Verification and Toggle Fix
**Goal**: The full automation pipeline is verified working with real Shopify data and toggle state persists correctly to the database
**Depends on**: Phase 7
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. A real Shopify order event flows through the full chain — webhook receives it, Inngest picks it up, the automation engine evaluates it, and the email arrives in the recipient inbox
  2. All 5 preset flows (welcome, abandoned cart, repurchase, winback, VIP) can be triggered manually with test event data and produce the correct email send
  3. Toggling an automation off and reloading the page shows it still off — the enabled state persists to the database row, not only local UI state
  4. The automation badge shows "Active" when the toggle is ON and "Inactive" when OFF, reflecting the persisted database value on every page load
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Pipeline wiring audit, payload format fixes, and manual test-trigger API endpoint for all 5 automation flows
- [x] 08-02-PLAN.md — Badge text fix (Active/Inactive), PATCH endpoint enhancement, toggle persistence verification with human checkpoint

#### Phase 9: Configuration and Email Customization UI
**Goal**: Users can edit every meaningful automation parameter in the UI and see a live preview of the resulting email before saving
**Depends on**: Phase 8
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, ECUST-01, ECUST-02
**Success Criteria** (what must be TRUE):
  1. On the automation detail page, user can change delay value/unit, trigger threshold, discount code, email subject, and body text — all fields are editable inline
  2. Clicking Save commits all changes to trigger_config and action_config JSON columns in the database; clicking Cancel reverts to the last saved state; a success toast confirms the save
  3. The live email preview panel on the automation detail page re-renders in real time as the user edits subject, body, or discount fields — no save required to see the preview
  4. When an automation fires after configuration changes, the sent email uses the customized subject, headline, body text, CTA, and discount code — not the original template defaults
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — Expand PATCH API for full automation config + AutomationConfigForm controlled component with Save/Cancel and success toast
- [ ] 09-02-PLAN.md — Add custom content props to email templates, live email preview panel, AutomationDetailClient wrapper sharing state between form and preview
- [ ] 09-03-PLAN.md — Wire customized action_config into executeEmailAction, Inngest callers, and test-send path

#### Phase 10: Test Send
**Goal**: Users can send the customized email to their own inbox directly from the automation detail page
**Depends on**: Phase 9
**Requirements**: TSEND-01, TSEND-02
**Success Criteria** (what must be TRUE):
  1. Clicking "Send Test Email" on the automation detail page delivers a real email to the logged-in user's inbox within seconds — no automation trigger or delay required
  2. The test email uses the current in-form content (subject, body, discount code) rather than the last saved values — edits in progress are reflected without requiring a save first
**Plans**: TBD

Plans:
- [ ] 10-01: Test send API and button — POST /api/automations/[id]/test-send accepts current form content, renders the template with those values, and sends via Resend to the user's email address

#### Phase 11: UI Polish
**Goal**: Every page the user sees during a demo is clean, handles loading states gracefully, and has clear empty states when no data exists
**Depends on**: Phase 8
**Requirements**: POLISH-01, POLISH-02, POLISH-03
**Success Criteria** (what must be TRUE):
  1. The dashboard page shows skeleton loaders during data fetch, a clear empty state when no customers exist, and all KPI cards render without layout shifts
  2. The customer list page shows a skeleton table during load, a "No customers found" empty state with guidance, and segment filter chips have consistent active/inactive styling
  3. The automation pages (list and detail) show loading skeletons, have consistent card styling, and display empty states when no automations are seeded
**Plans**: TBD

Plans:
- [ ] 11-01: Dashboard and customer list polish — skeleton loaders, empty states, consistent badge/chip styles across both pages
- [ ] 11-02: Automation pages polish — skeleton loaders, empty states, card layout consistency on list and detail pages

---

## Progress

**Execution Order:**
v1.0: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 (complete)
v1.1: 8 -> 9 -> 10, 8 -> 11 (Phase 11 can run in parallel with 9-10)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-02-19 |
| 2. Shopify Integration | v1.0 | 5/5 | Complete | 2026-02-19 |
| 3. RFM Engine | v1.0 | 2/2 | Complete | 2026-02-19 |
| 4. Email Infrastructure | v1.0 | 2/2 | Complete | 2026-02-19 |
| 5. Automation Engine | v1.0 | 2/2 | Complete | 2026-02-19 |
| 6. Dashboard and Customer UI | v1.0 | 3/3 | Complete | 2026-02-19 |
| 7. AI Insights | v1.0 | 2/2 | Complete | 2026-02-21 |
| 8. Pipeline Verification and Toggle Fix | v1.1 | 2/2 | Complete | 2026-02-21 |
| 9. Configuration and Email Customization UI | v1.1 | 0/3 | Not started | - |
| 10. Test Send | v1.1 | 0/1 | Not started | - |
| 11. UI Polish | v1.1 | 0/2 | Not started | - |
