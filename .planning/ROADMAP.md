# Roadmap: EcomCRM

## Milestones

- ✅ **v1.0 Full CRM Loop** — Phases 1-7 (shipped 2026-02-21)
- ✅ **v1.1 Make It Real - Production-Ready Automations** — Phases 8-11 (shipped 2026-02-22)
- 🚧 **v2.0 Email Intelligence + Template Editor** — Phases 12-15 (in progress)
- 📋 **v3.0 Public App + Multi-Tenant** — Phases 16-20 (planned)

## Phases

<details>
<summary>✅ v1.0 Full CRM Loop (Phases 1-7) — SHIPPED 2026-02-21</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-02-19
- [x] Phase 2: Shopify Integration (5/5 plans) — completed 2026-02-19
- [x] Phase 3: RFM Engine (2/2 plans) — completed 2026-02-19
- [x] Phase 4: Email Infrastructure (2/2 plans) — completed 2026-02-19
- [x] Phase 5: Automation Engine (2/2 plans) — completed 2026-02-19
- [x] Phase 6: Dashboard and Customer UI (3/3 plans) — completed 2026-02-19
- [x] Phase 7: AI Insights (2/2 plans) — completed 2026-02-21

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Make It Real - Production-Ready Automations (Phases 8-11) — SHIPPED 2026-02-22</summary>

- [x] Phase 8: Pipeline Verification and Toggle Fix (2/2 plans) — completed 2026-02-21
- [x] Phase 9: Configuration and Email Customization UI (3/3 plans) — completed 2026-02-21
- [x] Phase 10: Test Send (1/1 plan) — completed 2026-02-22
- [x] Phase 11: UI Polish (2/2 plans) — completed 2026-02-22

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

---

### 🚧 v2.0 Email Intelligence + Template Editor (In Progress)

**Milestone Goal:** Make email performance measurable and let merchants design custom templates visually — upgrading from static React Email components to a fully configurable, trackable email system.

#### Phase 12: Open & Click Tracking
**Goal**: Make email performance measurable with open and click data.
**Depends on**: Phase 11
**Requirements**: TRACK-01, TRACK-02, TRACK-03, TRACK-04
**Success Criteria** (what must be TRUE):
  1. Every outgoing marketing email contains a 1×1 tracking pixel; loading it records `opened_at` in `message_logs` (MPP inflation documented as known limitation)
  2. Every link in outgoing emails routes through `/api/track/click`; clicking records to `email_clicks` table then redirects to the real URL
  3. Customer 360 profile Message History shows open/click status icons and timestamps per message
  4. Automation detail page displays per-flow open rate and click rate
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md — email_clicks table schema, tracking query helpers, open-pixel endpoint, click-redirect endpoint
- [ ] 12-02-PLAN.md — Inject tracking pixel + rewrite links in sendMarketingEmail, customer profile engagement icons, automation detail open/click rates

#### Phase 13: Email Template Editor
**Goal**: Merchants can design custom email templates visually using Unlayer drag-and-drop editor.
**Depends on**: Phase 12
**Requirements**: EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05
**Success Criteria** (what must be TRUE):
  1. `/emails` page shows all templates as cards with placeholder thumbnail (name + colored background), name, last edited date, Create/Duplicate/Delete actions
  2. `/emails/[id]/edit` opens Unlayer editor with full drag-and-drop, text, button, color/font editing
  3. Images uploaded in Unlayer are stored in Supabase Storage and inserted as public URLs
  4. Saving a template persists HTML + Design JSON; reopening loads JSON back into Unlayer for re-editing
  5. 5 preset Unlayer templates (welcome, abandoned-cart, repurchase, winback, VIP) exist as `is_preset = true` — built natively in Unlayer, not converted from React Email
**Plans**: TBD

Plans:
- [ ] 13-01-PLAN.md — Schema (email_templates table, automations FK columns), migration, /emails list page with placeholder thumbnails
- [ ] 13-02-PLAN.md — Unlayer editor integration at /emails/[id]/edit, save/load HTML+JSON, image upload to Supabase Storage
- [ ] 13-03-PLAN.md — Build and seed 5 preset Unlayer templates

#### Phase 14: Template ↔ Automation Linking
**Goal**: Connect the Unlayer template library to automation flows with 3-tier content fallback.
**Depends on**: Phase 13
**Requirements**: LINK-01, LINK-02, LINK-03, LINK-04, LINK-05
**Success Criteria** (what must be TRUE):
  1. Automation detail page has "Email Template" section with dropdown to select from template library
  2. "Customize for this Flow" copies the template into automation's `custom_template_html/json` and opens Unlayer inline for flow-specific edits
  3. Send logic uses 3-tier fallback: custom_template_html → linked email_template_id HTML → React Email template (never fails)
  4. Template preview on automation detail shows the currently active template (correct tier)
  5. Dynamic variables (customer name, discount code, store name, unsubscribe link) inject correctly into any template tier
**Plans**: TBD

Plans:
- [ ] 14-01-PLAN.md — Template selector dropdown + preview on automation detail, wire 3-tier fallback into executeEmailAction
- [ ] 14-02-PLAN.md — "Customize for this Flow" inline Unlayer editor, dynamic variable injection via merge tags

#### Phase 15: Email Performance Dashboard
**Goal**: Merchants can see email effectiveness across flows and time.
**Depends on**: Phase 12
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Dashboard shows "Email Performance" section: total sent, overall open rate, overall click rate (last 30 days)
  2. Automation list shows open rate and click rate columns per flow
  3. Automation detail shows sends/opens/clicks over time line chart (last 30 days)
  4. Customer profile Message History shows status icons (✓ sent, 👁 opened, 🔗 clicked) with timestamps
**Plans**: TBD

Plans:
- [ ] 15-01-PLAN.md — Dashboard email performance section, automation list open/click columns, automation detail performance chart
- [ ] 15-02-PLAN.md — Customer profile message history status icons (depends on Phase 12 data)

---

### 📋 v3.0 Public App + Multi-Tenant (Planned)

**Milestone Goal:** Transform EcomCRM from a single-store tool into a public Shopify app that any merchant can install, with full data isolation, Shopify billing, and App Store compliance.

#### Phase 16: OAuth 2.0 Authorization Flow
**Goal**: Any Shopify merchant can install the app via standard OAuth.
**Depends on**: Phase 15
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Plans**: TBD

#### Phase 17: Multi-Tenant Data Isolation
**Goal**: Every merchant's data is completely isolated — no cross-shop data leakage possible.
**Depends on**: Phase 16
**Requirements**: TENANT-01, TENANT-02, TENANT-03, TENANT-04, TENANT-05
**Plans**: TBD

#### Phase 18: Shopify Billing API
**Goal**: Charge merchants via Shopify's subscription system with 4 plan tiers.
**Depends on**: Phase 17
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Plans**: TBD

#### Phase 19: Webhook Auto-Registration + Sender Domain
**Goal**: Zero-config setup for new merchants after install.
**Depends on**: Phase 16
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Plans**: TBD

#### Phase 20: App Store Compliance + Listing
**Goal**: Pass Shopify App Store review and publish listing.
**Depends on**: Phase 17, Phase 18, Phase 19
**Requirements**: COMPLY-01, COMPLY-02, COMPLY-03, COMPLY-04, COMPLY-05
**Plans**: TBD

---

## Progress

**Execution Order:**
v1.0: 1 → 2 → 3 → 4 → 5 → 6 → 7 (complete)
v1.1: 8 → 9 → 10, 8 → 11 (complete)
v2.0: 12 → 13 → 14, 12 → 15 (Phase 15 can start after Phase 12)
v3.0: 16 → 17 → 18, 16 → 19, (17 + 18 + 19) → 20

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
| 9. Configuration and Email Customization UI | v1.1 | 3/3 | Complete | 2026-02-21 |
| 10. Test Send | v1.1 | 1/1 | Complete | 2026-02-22 |
| 11. UI Polish | v1.1 | 2/2 | Complete | 2026-02-22 |
| 12. Open & Click Tracking | v2.0 | 0/2 | Not started | - |
| 13. Email Template Editor | v2.0 | 0/3 | Not started | - |
| 14. Template ↔ Automation Linking | v2.0 | 0/2 | Not started | - |
| 15. Email Performance Dashboard | v2.0 | 0/2 | Not started | - |
| 16. OAuth 2.0 Authorization Flow | v3.0 | 0/? | Not started | - |
| 17. Multi-Tenant Data Isolation | v3.0 | 0/? | Not started | - |
| 18. Shopify Billing API | v3.0 | 0/? | Not started | - |
| 19. Webhook Auto-Registration + Sender Domain | v3.0 | 0/? | Not started | - |
| 20. App Store Compliance + Listing | v3.0 | 0/? | Not started | - |
