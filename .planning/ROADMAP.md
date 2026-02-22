# Roadmap: EcomCRM

## Milestones

- ✅ **v1.0 Full CRM Loop** — Phases 1-7 (shipped 2026-02-21)
- ✅ **v1.1 Make It Real - Production-Ready Automations** — Phases 8-11 (shipped 2026-02-22)
- ✅ **v2.0 Email Intelligence + Template Editor** — Phases 12-15 (shipped 2026-02-22)
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

<details>
<summary>✅ v2.0 Email Intelligence + Template Editor (Phases 12-15) — SHIPPED 2026-02-22</summary>

- [x] Phase 12: Open & Click Tracking (2/2 plans) — completed 2026-02-22
- [x] Phase 13: Email Template Editor (3/3 plans) — completed 2026-02-22
- [x] Phase 14: Template ↔ Automation Linking (2/2 plans) — completed 2026-02-22
- [x] Phase 15: Email Performance Dashboard (2/2 plans) — completed 2026-02-22

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

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
v2.0: 12 → 13 → 14, 12 → 15 (complete)
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
| 12. Open & Click Tracking | v2.0 | 2/2 | Complete | 2026-02-22 |
| 13. Email Template Editor | v2.0 | 3/3 | Complete | 2026-02-22 |
| 14. Template ↔ Automation Linking | v2.0 | 2/2 | Complete | 2026-02-22 |
| 15. Email Performance Dashboard | v2.0 | 2/2 | Complete | 2026-02-22 |
| 16. OAuth 2.0 Authorization Flow | v3.0 | 0/? | Not started | - |
| 17. Multi-Tenant Data Isolation | v3.0 | 0/? | Not started | - |
| 18. Shopify Billing API | v3.0 | 0/? | Not started | - |
| 19. Webhook Auto-Registration + Sender Domain | v3.0 | 0/? | Not started | - |
| 20. App Store Compliance + Listing | v3.0 | 0/? | Not started | - |
