# Requirements: EcomCRM

**Defined:** 2026-02-19
**Core Value:** Shopify customers auto-segmented by RFM score, with triggered email flows that actually fire — a full CRM loop that Shopify, Klaviyo, and HubSpot each only half-solve.

---

## v1.0 Requirements (Complete)

All 50 requirements shipped in v1.0 (Phases 1–7). See MILESTONES.md for details.

- [x] FOUND-01 through FOUND-06 (Foundation) — Phase 1
- [x] SHOP-01 through SHOP-09 (Shopify Integration) — Phase 2
- [x] RFM-01 through RFM-06 (RFM Engine) — Phase 3
- [x] EMAIL-01 through EMAIL-06 (Email Infrastructure) — Phase 4
- [x] AUTO-01 through AUTO-07 (Automation Engine) — Phase 5
- [x] FLOW-01 through FLOW-05 (Preset Flows) — Phase 5
- [x] CRM-01 through CRM-04 (Customer CRM) — Phase 6
- [x] DASH-01 through DASH-05 (Dashboard) — Phase 6
- [x] AI-01 through AI-02 (AI Insights) — Phase 7

---

## v1.1 Requirements

### Pipeline & Reliability

- [ ] **PIPE-01**: Full webhook → Inngest → automation engine → email delivery chain debugged and verified working with a real Shopify order
- [ ] **PIPE-02**: All 5 preset flows (welcome, abandoned cart, repurchase, winback, VIP) can trigger correctly with real event data
- [ ] **PIPE-03**: Automation toggle state persists to database on toggle action (no reset on refresh)
- [ ] **PIPE-04**: Automation Active/Inactive badge syncs with toggle state (ON → Active, OFF → Inactive)

### Configuration UI

- [ ] **CFG-01**: User can edit automation delay value and unit (hours/days) on automation detail page
- [ ] **CFG-02**: User can edit trigger threshold (e.g., days_since_order threshold) on automation detail page
- [ ] **CFG-03**: User can edit discount code per automation flow
- [ ] **CFG-04**: User can edit email subject line and body text on automation detail page
- [ ] **CFG-05**: Edits save to existing trigger_config/action_config JSON columns with Save/Cancel buttons and success toast

### Email Customization

- [ ] **ECUST-01**: Live email preview on automation detail page shows rendered email with current edits
- [ ] **ECUST-02**: Customized content (subject, headline, body, CTA, discount) overrides default template values when automation sends

### Test Send

- [ ] **TSEND-01**: "Send Test Email" button on automation detail page delivers preview to user's own inbox
- [ ] **TSEND-02**: Test email uses currently customized content (not just defaults)

### UI Polish

- [ ] **POLISH-01**: Dashboard page has clean, professional appearance with proper loading and empty states
- [ ] **POLISH-02**: Customer list page has clean appearance with proper loading and empty states
- [ ] **POLISH-03**: Automation pages have clean appearance with proper loading and empty states

---

## v2 Requirements

### Email

- **EMAIL-V2-01**: Open pixel tracking (img pixel in email body)
- **EMAIL-V2-02**: Click tracking (link wrapping via redirect)
- **EMAIL-V2-03**: WYSIWYG / drag-and-drop template editor

### Automation

- **AUTO-V2-01**: SMS channel (TCPA/GDPR compliance, carrier integrations)
- **AUTO-V2-02**: A/B testing for flows and subject lines
- **AUTO-V2-03**: Visual drag-and-drop flow builder

### Platform

- **PLAT-V2-01**: Multi-store / multi-tenant UI (shop_id column already in schema)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Public App / OAuth Shopify flow | Custom App only — single store, no OAuth complexity needed |
| SMS channel | TCPA/GDPR compliance + carrier setup adds months; email proven first |
| Visual flow builder | Half-built = worse UX than preset forms; v3+ investment |
| WYSIWYG email editor | React Email + code produces better output; textarea editing sufficient for v1 |
| A/B testing | Stores with <10K contacts can't reach statistical significance |
| Reviews / loyalty points | Yotpo/Smile.io own this; competing is scope creep |
| Predictive CLV/churn ML | RFM + Claude narratives deliver 90% of value at 10% of complexity |
| Social media integration | Not CRM; points to Meta Ads Manager |
| Real-time chat / push notifications | Email is the channel; build it exceptionally first |
| Multi-tenant UI | schema ready (shop_id); UI deferred |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | — | Pending |
| PIPE-02 | — | Pending |
| PIPE-03 | — | Pending |
| PIPE-04 | — | Pending |
| CFG-01 | — | Pending |
| CFG-02 | — | Pending |
| CFG-03 | — | Pending |
| CFG-04 | — | Pending |
| CFG-05 | — | Pending |
| ECUST-01 | — | Pending |
| ECUST-02 | — | Pending |
| TSEND-01 | — | Pending |
| TSEND-02 | — | Pending |
| POLISH-01 | — | Pending |
| POLISH-02 | — | Pending |
| POLISH-03 | — | Pending |

**Coverage:**
- v1.1 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 (roadmap pending)

---
*Requirements defined: 2026-02-19*
*Last updated: 2026-02-21 after milestone v1.1 requirements defined*
