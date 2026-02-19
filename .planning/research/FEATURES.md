# Feature Landscape

**Domain:** Shopify CRM + Email Marketing Automation (SMB / small-team merchants)
**Researched:** 2026-02-19
**Confidence note:** WebSearch and Context7 were unavailable during this research session. All findings are derived from training data (cutoff August 2025) covering Klaviyo, Omnisend, Drip, Privy, ActiveCampaign (Shopify), and community discussions. Claims are marked with confidence levels throughout. External tool access should be used to verify before treating as authoritative.

---

## Table Stakes

Features users expect from any Shopify CRM/email-marketing tool. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shopify customer + order sync | Foundation — no data, no CRM | Med | Full initial sync + incremental webhook updates. Klaviyo, Omnisend, Drip all do this on install. |
| Customer list with search + filter | Basic navigation; merchants need to find customers fast | Low | Filter by segment, tag, spend range, date. Without this the data is inaccessible. |
| Customer profile view (order history, spend, email activity) | "360° view" is the core CRM promise | Med | Show orders timeline, total spend, tags, RFM score, email send history. |
| Email send (transactional + marketing) | The primary action that flows from CRM data | Med | Must support HTML templates. Plain-text fallback. Unsubscribe link mandatory (CAN-SPAM/GDPR). |
| Basic automation (welcome series, abandoned cart) | These two flows alone drive majority of ROI for SMB merchants; every competitor has them | Med–High | Welcome: triggers on first_order or customer_create. Abandoned cart: requires Shopify cart webhook or checkout event. |
| Unsubscribe / opt-out management | Legal requirement (CAN-SPAM, GDPR). Merchants will churn immediately without it | Low–Med | Must honor unsubscribes instantly. Suppress from future sends. Store consent state per contact. |
| Bounce and spam-complaint handling | Email deliverability degrades without hard-bounce suppression | Med | Hard bounces must suppress the contact. Soft bounces: retry logic. Spam complaints: immediate suppress. |
| Email open + click tracking | Merchants expect basic engagement metrics | Med | Pixel tracking for opens, link-wrapping for clicks. Store in MessageLog. |
| Segment / list management | Ability to group customers by behavior and send targeted emails | Med | At minimum: manual tags + rule-based segments (RFM, spend, last order date). |
| Dashboard KPIs | Revenue, active customers, recent orders — merchants check this daily | Low–Med | Total revenue, customer count, recent automation performance. |
| Data freshness indicator | Merchants need to know sync is working | Low | Show "last synced X minutes ago". Alert when sync is stale > 24h. |

**Confidence:** MEDIUM (training data, multiple competitor products known well through Aug 2025. Feature sets of Klaviyo, Omnisend, Drip are well-documented in their public marketing materials.)

---

## Differentiators

Features that set EcomCRM apart. Not universally expected, but meaningfully valued by the target audience (small-team Shopify merchants who find Klaviyo overwhelming).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| RFM-based customer segmentation (quintile, adaptive) | Klaviyo has "predictive analytics" but requires Klaviyo ML — no CRM-layer RFM. Omnisend has basic segments but not quintile RFM. EcomCRM ships RFM on day one, automatically. | High | Quintile scoring adapts to store size. Produces 7 named segments: champion/loyal/potential/new/at_risk/hibernating/lost. This is the core intellectual differentiator. |
| Customer 360 profile with RFM + lifecycle stage | Klaviyo's profile view is email-centric (engagement history). No competitor in the SMB tier shows RFM score + lifecycle stage prominently on the customer card. | Med | Combines order timeline, RFM scores, segment label, AI-generated insight, and email history in one view. |
| AI-generated customer insights (Claude API) | No SMB-tier competitor (Klaviyo, Omnisend, Drip) offers per-customer AI narratives. This is a genuine differentiator in 2025–2026. | Med | "This customer is at risk — last ordered 90 days ago, down from monthly cadence. Recommend win-back offer." Copy generation for email subject lines also possible. |
| Segment-change trigger automations | Klaviyo triggers on list membership and custom events. Triggering specifically on RFM segment transitions (e.g., loyal → at_risk) is a unique CRM-native capability. | High | Requires detecting segment changes on each RFM recalculation. Powerful for churn prevention. |
| VIP automation preset | Most tools have welcome + abandoned cart. A pre-built VIP flow (triggers when customer reaches champion segment) is rare and immediately valuable. | Med | Trigger: segment = champion (first time). Action: send VIP email + add "vip" tag in Shopify. |
| Churn prediction alerts on dashboard | Showing "X customers moved to at_risk this week" prominently is a CRM-native insight no email tool surfaces well. | Med | Requires daily RFM recalculation + diff tracking. Dashboard widget: "15 customers entered at_risk since last week." |
| AI-generated email copy | One-click subject line + body copy generation for each automation template. Claude API makes this feasible with low integration cost. | Med | Must be optional / editable. Reduces setup friction for non-copywriters. |
| Preset automation library (ready on install) | Klaviyo requires users to build flows from scratch. Omnisend has templates but they require configuration. EcomCRM ships 5 ready-to-use flows pre-wired to RFM segments. | Med | welcome, abandoned-cart, repurchase, winback, VIP — all pre-configured with sensible defaults. Merchant enables with one toggle. |

**Confidence:** MEDIUM — the RFM differentiation claim is well-founded based on known Klaviyo/Omnisend feature sets as of mid-2025. AI-per-customer-insight claim is LOW confidence because both products may have added AI features after August 2025 cutoff. Verify before using as marketing copy.

---

## Anti-Features

Features to explicitly NOT build for v1 — either out of scope, complexity traps, or philosophical mismatches with the product's positioning as "lightweight."

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Visual drag-and-drop flow builder | Klaviyo's flow builder took years to build. A half-built one is worse than no builder — it frustrates users who expect Klaviyo-level polish. | Ship preset flows as code-backed configs. Allow trigger/delay/action editing in a form UI. Add visual builder in v3+ only. |
| SMS channel (v1) | Compliance overhead (TCPA in US, GDPR in EU, carrier relationships, opt-in collection) is enormous. Would consume 40%+ of engineering time. | Log SMS as a future channel in MessageLog schema (channel enum already includes 'sms'). Build email first, SMS in v2. |
| Multi-store / multi-tenant UI | Complicates auth, data isolation, billing, and UX. Small-team merchants operate 1-3 stores, rarely need unified cross-store view. | Schema already has shop_id. Feature lives in DB layer. Don't build UI for it in v1. |
| Email template drag-and-drop builder (WYSIWYG) | React Email + code templates already produce great output. A WYSIWYG builder is a 3–4 week feature that few small teams need. | Ship 5 polished React Email templates. Allow subject + body text editing in a textarea. Full template customization via code. |
| A/B testing for emails / flows | Requires 2x send volume, statistical significance calculations, hold-out group logic. Overkill for stores with <10K contacts. | Note as v2 feature. Small merchants don't have the list size to reach statistical significance anyway. |
| Social media integration (Instagram, Facebook) | Not CRM. Scope creep. Every tool that added social became less focused on what merchants actually need. | Explicitly out of scope. Direct merchants to Meta Ads Manager for social. |
| Predictive CLV / churn ML models | Building and maintaining ML models requires significant infrastructure (training pipelines, model serving). RFM is a proxy for CLV that requires no ML. | RFM quintile scoring + AI narrative (Claude API) provides 90% of the value with 10% of the complexity. |
| Native reviews / loyalty points module | Yotpo, Okendo, Smile.io own this space with deep integrations. | If needed, use Shopify metafields to surface review data from existing apps. Don't compete. |
| Landing pages / forms builder | Out of scope for CRM. Klaviyo's form builder is their acquisition play; EcomCRM is retention-focused. | Use Shopify's native forms or a dedicated tool (Typeform, Privy). |
| In-app chat / notifications | Real-time chat requires websockets, notification infrastructure. Not the product. | Email is the channel. Build it well before adding others. |

**Confidence:** HIGH — these are scope decisions grounded in the project's stated positioning, not external research. They are opinions informed by common startup failure modes in this product category.

---

## Feature Dependencies

Dependencies that must be sequenced correctly in the roadmap:

```
Shopify OAuth / Custom App setup
  → Customer + Order sync (full initial sync)
    → RFM Engine (needs order history data to score)
      → Segment assignment (needs RFM scores)
        → Customer list with segment filters (needs segments)
        → Customer 360 profile (needs orders + RFM)
        → Automation trigger: segment_change (needs segment history)
        → AI insights (needs segment + order data as context)

Shopify Webhooks (orders/create, customers/create, etc.)
  → Incremental sync (keeps data fresh post-initial-sync)
    → RFM recalculation on order event (keeps scores current)
      → Real-time segment-change detection
        → Automation trigger: first_order, segment_change

Email infrastructure (Resend + React Email templates)
  → Unsubscribe management (must exist before first send)
    → Bounce handling (must exist before bulk send)
      → Automation action: send_email (first to implement)
        → MessageLog (records all sends)
          → Email tracking (open pixel, click wrapping)
            → Dashboard email performance metrics

Automation engine (trigger evaluation, delay queue via Inngest)
  → All 5 preset flows (welcome, abandoned-cart, repurchase, winback, VIP)
    → Dashboard automation performance KPIs
```

**Key ordering constraint:** RFM engine must be built and validated before automations that trigger on segment. Shipping automation before RFM works means untested trigger logic against incomplete data.

**Second constraint:** Unsubscribe + bounce suppression must be wired before ANY email is sent in production — legal and deliverability requirement, not optional.

---

## MVP Recommendation

### Must ship for v1 to be usable

1. Shopify sync (full + webhook incremental) — without this, nothing else works
2. RFM engine + 7 segments — core differentiator; establishes product identity
3. Customer list (filterable by segment/tag) + Customer 360 profile — core CRM experience
4. Unsubscribe + bounce handling — legal requirement before any email
5. Welcome email automation — highest-ROI flow, simplest trigger (first_order)
6. Abandoned cart automation — second highest ROI; merchants will ask for it immediately
7. Dashboard KPIs (customer count, revenue, churn alerts) — daily driver for retention

### Ship in v1 with lower priority (but before public launch)

8. Repurchase + Winback + VIP preset flows — complete the 5-flow library promised in the product spec
9. Email open + click tracking — needed to make MessageLog useful
10. AI customer insights — key differentiator; implement after data layer is stable

### Defer to v2

- SMS channel
- A/B testing
- Visual flow builder
- WYSIWYG template editor
- Multi-store UI

---

## Competitive Context

**Klaviyo** (MEDIUM confidence, based on training data through Aug 2025):
- Strongest email automation in the market for Shopify
- Deep segmentation (hundreds of filter conditions)
- Predictive analytics (CLV, churn risk) — ML-powered
- No CRM layer: profiles exist but there's no concept of "lifecycle stage" or RFM
- Pricing scales steeply with contact count — SMB merchants with 5K-50K contacts pay $100–$500/mo
- UX is complex; new merchants take weeks to set up their first flow

**Omnisend** (MEDIUM confidence):
- Positioned as "Klaviyo but easier"
- Multi-channel: email + SMS + push notifications
- Pre-built automation templates (more than Klaviyo)
- Weaker on segmentation depth vs Klaviyo
- No CRM layer (no lifecycle stages, no RFM)
- Solid for merchants who want something working in a day

**Drip** (MEDIUM confidence):
- Originally e-commerce focused, has drifted toward general marketing
- Better "CRM-like" features than Klaviyo/Omnisend (contact tagging, pipelines)
- Weaker Shopify-specific features vs Klaviyo
- Smaller market share; community/support less active than Klaviyo

**Gap EcomCRM fills:**
The entire SMB Shopify CRM/automation space has an email-first framing — customer profiles are contact records, not CRM entities. RFM scoring and lifecycle-stage management are completely absent from all three major tools' free/low tiers. EcomCRM's CRM-native framing (RFM segments driving automated actions) is the actual product bet.

**Confidence:** MEDIUM for feature claims, LOW for pricing figures (prices change frequently and my training data may be stale).

---

## Sources

- Training data (knowledge cutoff August 2025): Klaviyo product documentation, Omnisend feature pages, Drip feature pages, Shopify App Store reviews and comparison articles
- Note: WebSearch was unavailable during this research session. Competitive claims, especially pricing and any AI features competitors may have launched, should be verified against current competitor documentation before being used in product positioning.
- Confidence levels assigned per section above
"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":325,"cache_read_input_tokens":17068,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":325},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcHxT9HqZ9whknf5nVS","type":"assistant","uuid":"639d566c-cedf-455a-a385-9f6dcb4be202","timestamp":"2026-02-19T02:07:27.232Z"}
{"parentUuid":"639d566c-cedf-455a-a385-9f6dcb4be202","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","is_error":true,"tool_use_id":"toolu_019oNh3qV99p6AQYuxE35mHv"}]},"uuid":"2ff3f2bd-8893-450c-af50-a74678b57798","timestamp":"2026-02-19T02:07:27.250Z","toolUseResult":"Error: Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","sourceToolAssistantUUID":"639d566c-cedf-455a-a385-9f6dcb4be202"}
{"parentUuid":"2ff3f2bd-8893-450c-af50-a74678b57798","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_016V9SbsyftXs5jXGxiJi1Bc","type":"message","role":"assistant","content":[{"type":"text","text":"Write permission is also blocked for paths outside the project directory. Let me check if `.planning/research/` is within the project directory and try writing there directly."}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":3835,"cache_read_input_tokens":17393,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":3835},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcQkbT9vwcNA2Hq1iQ6","type":"assistant","uuid":"c409f195-6703-4ee3-b241-05306eb9a117","timestamp":"2026-02-19T02:07:30.982Z"}
{"parentUuid":"c409f195-6703-4ee3-b241-05306eb9a117","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_016V9SbsyftXs5jXGxiJi1Bc","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_019GAzgVjctqJaXfWsaAyk6q","name":"Glob","input":{"pattern":"**/.planning/**","path":"/Users/zhangjiabei/Desktop/ecomcrm"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":3835,"cache_read_input_tokens":17393,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":3835},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcQkbT9vwcNA2Hq1iQ6","type":"assistant","uuid":"c2dc5b9c-5948-4c86-9f4a-f0385325b861","timestamp":"2026-02-19T02:07:31.500Z"}
{"parentUuid":"c2dc5b9c-5948-4c86-9f4a-f0385325b861","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Glob","command":"callback"},"parentToolUseID":"toolu_019GAzgVjctqJaXfWsaAyk6q","toolUseID":"toolu_019GAzgVjctqJaXfWsaAyk6q","timestamp":"2026-02-19T02:07:32.198Z","uuid":"1e431ad7-52d3-421c-8c0b-4ba32a17e98c"}
{"parentUuid":"c2dc5b9c-5948-4c86-9f4a-f0385325b861","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_019GAzgVjctqJaXfWsaAyk6q","type":"tool_result","content":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/STACK.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/ARCHITECTURE.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/INTEGRATIONS.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/CONCERNS.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/CONVENTIONS.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/STRUCTURE.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/TESTING.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/PROJECT.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/config.json"}]},"uuid":"8e20f9b4-87f5-490b-bf88-ca79d17fd0dd","timestamp":"2026-02-19T02:07:32.198Z","sourceToolAssistantUUID":"c2dc5b9c-5948-4c86-9f4a-f0385325b861"}
{"parentUuid":"8e20f9b4-87f5-490b-bf88-ca79d17fd0dd","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_016QdDrXPfkUZX3DUtM16cwd","type":"message","role":"assistant","content":[{"type":"text","text":"The `.planning` directory exists in the project. The `.planning/research/` subdirectory doesn't exist yet — I need to create it. Since Bash is blocked, I'll try writing the file directly (Write should create parent directories)."}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":364,"cache_read_input_tokens":21228,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":364},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcR8zbXnwLVgEjiF7vC","type":"assistant","uuid":"8136e698-6621-4e8b-9433-d388ad6aa2b7","timestamp":"2026-02-19T02:07:35.009Z"}
{"parentUuid":"8136e698-6621-4e8b-9433-d388ad6aa2b7","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_016QdDrXPfkUZX3DUtM16cwd","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01AEWAQCs6ssCHAQncscxjdG","name":"Write","input":{"file_path":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/research/FEATURES.md","content":"# Feature Landscape

**Domain:** Shopify CRM + Email Marketing Automation (SMB / small-team merchants)
**Researched:** 2026-02-19
**Confidence note:** WebSearch was unavailable during this research session. All findings are derived from training data (cutoff August 2025) covering Klaviyo, Omnisend, Drip, Privy, and community discussions. Claims are marked with confidence levels throughout. External verification is recommended before using competitive claims in product positioning.

---

## Table Stakes

Features users expect from any Shopify CRM/email-marketing tool. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shopify customer + order sync | Foundation — no data, no CRM | Med | Full initial sync + incremental webhook updates. Klaviyo, Omnisend, Drip all do this on install. HMAC verification required. |
| Customer list with search + filter | Basic navigation; merchants need to find customers fast | Low | Filter by segment, tag, spend range, last order date. Without this the data is inaccessible. |
| Customer profile view (order history, spend, tags) | "360 view" is the core CRM promise | Med | Show orders timeline, total spend, tags, email history. Foundational for every downstream action. |
| Email send (marketing) | The primary action that flows from CRM data | Med | HTML templates required. Plain-text fallback. Unsubscribe link mandatory by law (CAN-SPAM/GDPR). |
| Welcome email automation | Every competitor ships this. Highest-ROI automation for new merchants. | Med | Triggers on first_order or customer_create. Delay configurable. |
| Abandoned cart automation | The second highest-ROI automation; merchants expect it from day one. | Med–High | Requires Shopify checkout webhook. Delay of 1–4 hours standard. Must not fire if order completes. |
| Unsubscribe / opt-out management | Legal requirement (CAN-SPAM, GDPR, CASL). Merchants churn immediately without it. | Low–Med | Honor unsubscribes instantly. Suppress from all future sends. Store consent state per contact. |
| Hard bounce suppression | Email deliverability degrades permanently without it. ISPs penalize senders who ignore bounces. | Med | Hard bounces must suppress the contact immediately. Soft bounces: retry with backoff. |
| Email open + click tracking | Merchants expect basic engagement metrics. Without it, automation feels like a black box. | Med | Open pixel tracking, link-wrapping for clicks. Store events in MessageLog. |
| Customer segmentation (basic) | Ability to target specific groups is the minimum viable use case for email marketing. | Med | At minimum: filter by RFM segment, tag, spend range, order count. |
| Dashboard with KPIs | Merchants check revenue, active customers, and automation performance daily. | Low–Med | Total revenue, new customers, automation send counts, recent orders. |
| Data sync status indicator | Merchants need to know the CRM reflects current Shopify state. | Low | Show "last synced X ago". Alert if sync is stale > 24h. |

**Confidence:** MEDIUM — feature sets of Klaviyo, Omnisend, and Drip are well-documented in their public materials as of August 2025. Core features unlikely to have changed.

---

## Differentiators

Features that set EcomCRM apart. Not universally expected by the market, but meaningfully valued by small-team Shopify merchants who find Klaviyo overwhelming.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| RFM-based segmentation (quintile, adaptive, 7 named segments) | Klaviyo has predictive analytics but it requires their ML tier. No SMB-tier competitor ships quintile RFM out of the box as an automatic CRM layer. This is the core intellectual differentiator. | High | champion/loyal/potential/new/at_risk/hibernating/lost. Quintile scoring adapts to store size — no fixed thresholds to calibrate. |
| RFM scores surfaced on customer profile | Competitors show email engagement (opens, clicks). EcomCRM shows behavioral buying patterns. Fundamentally different framing: CRM-native vs email-native. | Low | Display rfm_r, rfm_f, rfm_m scores + segment label prominently on the customer card. |
| Segment-change automation trigger | Triggering on RFM segment transitions (e.g., loyal → at_risk) is a unique CRM-native capability. None of the three main SMB competitors expose this. | High | Requires detecting segment changes on each RFM recalculation cycle. Powerful for proactive churn prevention. |
| AI-generated customer insights (Claude API) | No SMB-tier competitor offers per-customer AI narratives as of mid-2025. Differentiating and low-cost to implement given the Anthropic API. | Med | "This customer is at risk — last ordered 90 days ago, down from monthly cadence. Recommend win-back offer." Displayed on customer profile. |
| AI-generated email copy suggestions | One-click subject line + body copy generation for automation templates. Reduces setup friction for merchants who are not copywriters. | Med | Must be optional and editable. Positioned as a starting point, not a replacement for merchant voice. |
| Churn alert dashboard widget | Surfacing "15 customers moved to at_risk this week" is CRM-native intelligence that email tools don't provide. Gives merchants an actionable daily signal. | Med | Requires daily RFM recalculation + segment diff tracking. |
| Preset automation library (5 flows, enabled with one toggle) | Klaviyo requires building flows from scratch. Omnisend has templates that require configuration. EcomCRM ships 5 fully pre-wired flows. Merchant experience: install, see 5 flows, toggle on. | Med | welcome, abandoned-cart, repurchase, winback, VIP — all pre-configured with sensible delays and templates. Massive reduction in time-to-value. |
| VIP / Champion automation preset | A pre-built flow that fires when a customer first reaches the Champion RFM segment is rare. It makes the RFM engine immediately actionable and tangible. | Med | Trigger: first time segment = champion. Action: send VIP email + add "vip" tag back to Shopify customer. |
| Repurchase automation (post-purchase timing) | Most tools have win-back (90+ days lapsed). Fewer have a repurchase flow timed to product replenishment cycles (e.g., 30 days after last order). | Med | Trigger: days_since_order (configurable, default 30). Target segment: loyal or new. Suggests reorder. |

**Confidence:** MEDIUM for RFM differentiation claims (Klaviyo/Omnisend feature sets known through Aug 2025). LOW for AI-feature claims — both Klaviyo and Omnisend may have launched AI features after August 2025 cutoff. Verify before using in marketing.

---

## Anti-Features

Features to deliberately NOT build for v1. Either legal/compliance traps, complexity sinkholes, or scope creep that dilutes focus.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Visual drag-and-drop flow builder | Klaviyo's flow builder took years to polish. A half-built one is worse than no builder — it creates false expectations and immediate disappointment. | Ship preset flows as form-editable configs (trigger type, delay, action). Visual builder is a v3+ investment. |
| SMS channel | TCPA compliance in the US, GDPR in EU, carrier relationships, opt-in collection mechanics, and short-code provisioning add months of compliance work before a single message can be sent legally. | MessageLog schema already has channel enum with 'sms'. Infrastructure is ready. Build SMS as a v2 feature once email is proven. |
| Multi-store / multi-tenant UI | Complicates auth, data isolation, billing, and UX significantly. Small-team merchants rarely need unified cross-store dashboards. | shop_id exists in the schema. Data isolation is handled. Don't build the UI surface for it in v1. |
| WYSIWYG email template editor | React Email + code-backed templates produce polished, mobile-responsive output. A WYSIWYG editor is 3–4 weeks of work that few small teams need or appreciate vs. clean pre-built templates. | Ship 5 polished React Email templates. Allow subject line + body text editing in a textarea. Full customization via code. |
| A/B testing for emails or flows | Requires 2x send volume, statistical significance logic, hold-out group management, and result analysis UI. Overkill for stores with fewer than 10K contacts. | Note as v2 feature. Merchants with small lists cannot reach statistical significance anyway — A/B testing would produce misleading results. |
| Social media integration | Not CRM. Every tool that added social channels became less focused on what Shopify merchants actually need: better email targeting. | Explicitly out of scope. Point merchants to Meta Ads Manager and native Shopify social tools. |
| Predictive CLV / churn ML models | Building and maintaining ML training pipelines + model serving infrastructure is a company-scale investment. | RFM quintile scoring is a proven proxy for CLV and churn risk that requires zero ML. Claude API narratives add interpretability. This stack provides 90% of the value at 10% of the complexity. |
| Reviews / loyalty points module | Yotpo, Okendo, Smile.io own this space with deep Shopify integrations. Competing means building from scratch into a crowded market. | If needed, surface review data from Shopify metafields populated by existing apps. Don't try to replace dedicated review/loyalty tools. |
| Landing pages / forms builder | Out of scope for a CRM. Klaviyo's pop-up form builder is their list-growth play; EcomCRM is retention-focused. | Use Shopify's native forms or Typeform. Not the product. |
| Real-time in-app chat or push notifications | Requires websocket infrastructure, notification service integrations, mobile considerations. Not the product category. | Email is the channel. Build it exceptionally before adding others. |
| Billing / subscription management UI | For a custom-app install, billing is handled outside the product. | Keep v1 as a self-hosted or invite-only tool. Billing infrastructure is a v2+ concern. |

**Confidence:** HIGH — these are scope decisions grounded in project positioning and common startup failure modes in this category, not claims about competitor features.

---

## Feature Dependencies

Sequencing constraints that must be reflected in the roadmap:

```
Shopify Custom App setup (access token, store URL)
  └─ Customer + Order initial sync (bulkOperationRunQuery)
       └─ RFM Engine (needs full order history to quintile-score)
            ├─ Segment assignment (needs RFM scores)
            │    ├─ Customer list with segment filters
            │    ├─ Customer 360 profile (RFM + segment label)
            │    ├─ Churn alert dashboard widget (needs segment history/diffs)
            │    └─ Automation trigger: segment_change
            └─ AI insights (needs segment + order data as context input)

Shopify Webhooks (orders/create, orders/updated, customers/create, customers/update)
  └─ Incremental sync (keeps data current after initial pull)
       └─ RFM recalculation on order event
            └─ Real-time segment-change detection → automation triggers

Email infrastructure (Resend API key configured)
  ├─ Unsubscribe management [MUST exist before first send — legal requirement]
  │    └─ Bounce + spam-complaint suppression [MUST exist before bulk sends]
  │         └─ Automation action: send_email (first action type to implement)
  │              └─ MessageLog (records all sends, statuses)
  │                   └─ Open pixel + click tracking
  │                        └─ Dashboard email performance metrics
  └─ React Email templates (5 templates)
       └─ All 5 preset automation flows

Inngest client setup
  └─ Automation engine (trigger evaluation + delay queue)
       └─ All 5 preset flows (welcome, abandoned-cart, repurchase, winback, VIP)
            └─ Automation list page + enable/disable toggle

AI (Anthropic API key configured)
  └─ Customer insight generation (per-profile narrative)
  └─ Email copy suggestions (per-template)
```

**Critical ordering constraint 1:** RFM engine must be validated with real data before any segment-driven automation is enabled. Incorrect RFM scores produce incorrect segment assignments, which fire automations to wrong customer groups.

**Critical ordering constraint 2:** Unsubscribe handling and bounce suppression must be implemented and tested before any email is sent in a production environment. This is a legal and deliverability requirement, not a nice-to-have.

**Critical ordering constraint 3:** Initial sync must complete (and be verified correct) before RFM scoring runs — partial data produces skewed quintile thresholds.

---

## MVP Recommendation

### Must ship for v1 to be usable (in priority order)

1. Shopify sync: full initial sync + webhook incremental — without this, nothing else works
2. RFM engine + 7 named segments — core differentiator; establishes the product's identity
3. Unsubscribe + bounce suppression — legal requirement; must exist before ANY production email
4. Customer list (filterable by segment/tag) + Customer 360 profile — core CRM experience
5. Welcome email automation — highest-ROI flow, simplest trigger (first_order)
6. Abandoned cart automation — second highest ROI; merchants expect it immediately
7. Dashboard KPIs + churn alert widget — daily driver; makes the product feel alive

### Include in v1 before public launch (lower urgency than above)

8. Repurchase + Winback + VIP preset flows — complete the 5-flow library
9. Email open + click tracking — makes MessageLog useful for merchants
10. AI customer insights on profile — key differentiator; implement after data layer is stable
11. AI email copy suggestions — reduces setup friction

### Defer to v2

- SMS channel (compliance prerequisites too heavy for v1)
- A/B testing (needs larger lists than typical v1 users)
- Visual flow builder (build only after merchants validate the preset flows are valuable)
- WYSIWYG template editor

---

## Competitive Context

### Klaviyo (MEDIUM confidence, training data through Aug 2025)
- Strongest email automation for Shopify in the market
- Deep segmentation (100+ filter conditions)
- Predictive analytics (CLV, churn risk) via ML — available on higher tiers
- No CRM layer: profiles exist as contact records, not lifecycle entities. No RFM, no segment labels like "at_risk" or "champion"
- Pricing scales steeply with contact count; SMB merchants with 5K–50K contacts pay $100–$400/mo
- UX complexity: new merchants take days to configure their first flow from scratch

### Omnisend (MEDIUM confidence)
- Positioned as "Klaviyo but easier"
- Multi-channel: email + SMS + web push
- More automation templates than Klaviyo out of the box
- Weaker segmentation depth than Klaviyo
- No CRM layer — same email-native framing
- Good for merchants wanting something working in an afternoon

### Drip (MEDIUM confidence, lower certainty — market position has shifted)
- Originally e-commerce CRM focused, has moved toward general marketing automation
- Stronger contact tagging and "pipeline" concepts than Klaviyo/Omnisend — closer to CRM framing
- Weaker Shopify-specific features (abandoned cart, order events) vs Klaviyo
- Smaller market share; community support less active

### The Gap EcomCRM Fills
The entire SMB Shopify automation space uses an email-native framing: customer profiles are contact records, not CRM entities. RFM scoring, lifecycle-stage management, and segment-change-driven automation are absent from all three tools' accessible tiers. EcomCRM's CRM-native framing — where behavioral segments drive automated actions — is the genuine product bet and the source of its differentiating features.

**Confidence:** MEDIUM for feature claims. LOW for pricing figures (change frequently; verify with current competitor pricing pages before citing). LOW for any AI capabilities competitors may have added post-August 2025.

---

## Sources

- Training data (knowledge cutoff August 2025): Klaviyo product documentation, Omnisend feature pages, Drip feature pages, Shopify App Store listings and review discussions, community posts on IndieHackers and Shopify community forums
- Note: WebSearch and Context7 were unavailable during this research session. Competitive feature claims — especially around AI capabilities — should be verified against current competitor documentation before being used in product positioning or marketing copy.
"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":364,"cache_read_input_tokens":21228,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":364},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcR8zbXnwLVgEjiF7vC","type":"assistant","uuid":"8d761cd9-3f5c-4357-b703-23584748cbc6","timestamp":"2026-02-19T02:09:07.501Z"}
{"parentUuid":"8d761cd9-3f5c-4357-b703-23584748cbc6","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","is_error":true,"tool_use_id":"toolu_01AEWAQCs6ssCHAQncscxjdG"}]},"uuid":"406e71a3-f9e4-421f-bed2-817d9760cdd7","timestamp":"2026-02-19T02:09:07.515Z","toolUseResult":"Error: Permission to use Write has been denied. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial in malicious ways, e.g. do not use your ability to run tests to execute non-test actions. You should only try to work around this restriction in reasonable ways that do not attempt to bypass the intent behind this denial. If you believe this capability is essential to complete the user's request, STOP and explain to the user what you were trying to do and why you need this permission. Let the user decide how to proceed.","sourceToolAssistantUUID":"8d761cd9-3f5c-4357-b703-23584748cbc6"}
{"parentUuid":"406e71a3-f9e4-421f-bed2-817d9760cdd7","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01FKNgTiMKJ4v7ZXibdgy4Pb","type":"message","role":"assistant","content":[{"type":"text","text":"Write is being blocked for the `.planning/research/` path. Let me check whether there's a restrictions config that prevents writes to that specific path, and whether existing `.planning` files are writable."}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":4395,"cache_read_input_tokens":21592,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":4395},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcY9mvT6b5FwGQuxRGa","type":"assistant","uuid":"f4d62d30-d61c-4573-8497-a28b70ad0eb0","timestamp":"2026-02-19T02:09:10.189Z"}
{"parentUuid":"f4d62d30-d61c-4573-8497-a28b70ad0eb0","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01FKNgTiMKJ4v7ZXibdgy4Pb","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01LSTsjGYKmMM7URtEuPJJMS","name":"Read","input":{"file_path":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/config.json"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":4395,"cache_read_input_tokens":21592,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":4395},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcY9mvT6b5FwGQuxRGa","type":"assistant","uuid":"8be08083-135d-43e0-b55c-7c5ad18b96c3","timestamp":"2026-02-19T02:09:11.126Z"}
{"parentUuid":"8be08083-135d-43e0-b55c-7c5ad18b96c3","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Read","command":"callback"},"parentToolUseID":"toolu_01LSTsjGYKmMM7URtEuPJJMS","toolUseID":"toolu_01LSTsjGYKmMM7URtEuPJJMS","timestamp":"2026-02-19T02:09:11.163Z","uuid":"7f0cf3a7-9ba7-40aa-99d1-20a45da680fb"}
{"parentUuid":"8be08083-135d-43e0-b55c-7c5ad18b96c3","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01LSTsjGYKmMM7URtEuPJJMS","type":"tool_result","content":"     1→{
     2→  "mode": "yolo",
     3→  "depth": "standard",
     4→  "parallelization": true,
     5→  "commit_docs": true,
     6→  "model_profile": "balanced",
     7→  "workflow": {
     8→    "research": true,
     9→    "plan_check": true,
    10→    "verifier": true
    11→  }
    12→}
    13→

<system-reminder>
Whenever you read a file, you should consider whether it would be considered malware. You CAN and SHOULD provide analysis of malware, what it is doing. But you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer questions about the code behavior.
</system-reminder>
"}]},"uuid":"c4a0b914-2f1b-4b0c-8ac2-6c3a12cfe7c9","timestamp":"2026-02-19T02:09:11.162Z","sourceToolAssistantUUID":"8be08083-135d-43e0-b55c-7c5ad18b96c3"}
{"parentUuid":"c4a0b914-2f1b-4b0c-8ac2-6c3a12cfe7c9","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01Fzdk1jPB3PLFwNwadVUr7s","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_014YFnVJH1E7VFNtXAN8Z2PY","name":"Read","input":{"file_path":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/STACK.md"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":328,"cache_read_input_tokens":25987,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":328},"output_tokens":25,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcYQdP6rDLfvxmUR8vY","type":"assistant","uuid":"adc564b6-1a79-476e-a96a-266e0fe82786","timestamp":"2026-02-19T02:09:12.851Z"}
{"parentUuid":"adc564b6-1a79-476e-a96a-266e0fe82786","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Read","command":"callback"},"parentToolUseID":"toolu_014YFnVJH1E7VFNtXAN8Z2PY","toolUseID":"toolu_014YFnVJH1E7VFNtXAN8Z2PY","timestamp":"2026-02-19T02:09:12.887Z","uuid":"f2a11430-4410-48fa-9201-fa997420ebb1"}
{"parentUuid":"adc564b6-1a79-476e-a96a-266e0fe82786","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_014YFnVJH1E7VFNtXAN8Z2PY","type":"tool_result","content":"     1→# Technology Stack
     2→
     3→**Analysis Date:** 2026-02-19
     4→
     5→## Languages
     6→
     7→**Primary:**
     8→- TypeScript 5.x - Strict mode across entire codebase
     9→- JavaScript (JSX/TSX) - React and Next.js components
    10→
    11→**Secondary:**
    12→- CSS (Tailwind directives) - Styling via Tailwind CSS
    13→- MDX/Markdown - Configuration files (postcss.config.mjs, next.config.mjs)
    14→
    15→## Runtime
    16→
    17→**Environment:**
    18→- Node.js (compatible with Next.js 14.2.35, tested with npm)
    19→
    20→**Package Manager:**
    21→- npm
    22→- Lockfile: `package-lock.json` (present)
    23→
    24→## Frameworks
    25→
    26→**Core:**
    27→- Next.js 14.2.35 - App Router (required: TypeScript strict, no older Pages Router)
    28→- React 18.x - Server and Client Components
    29→
    30→**UI & Styling:**
    31→- Tailwind CSS 3.4.1 - Utility-first CSS framework
    32→- tailwindcss-animate 1.0.7 - Animation utilities
    33→- tailwind-merge 3.4.1 - Utility class deduplication
    34→- shadcn/ui - Component library (configured in `components.json`, uses lucide icons)
    35→- lucide-react 0.574.0 - Icon library
    36→
    37→**Component Utilities:**
    38→- class-variance-authority 0.7.1 - Component variant system
    39→- clsx 2.1.1 - Conditional className builder
    40→
    41→**Testing:**
    42→- Not detected in dependencies
    43→
    44→**Build/Dev:**
    45→- TypeScript 5.x - Type checking
    46→- drizzle-kit 0.31.9 - ORM migrations and schema generation
    47→- PostCSS 8.x - CSS preprocessing (Tailwind)
    48→
    49→## Key Dependencies
    50→
    51→**Critical:**
    52→- drizzle-orm 0.45.1 - Type-safe ORM for database queries (PostgreSQL via Supabase)
    53→- postgres 3.4.8 - PostgreSQL client for connection pooling and driver
    54→- zod 4.3.6 - Runtime schema validation for API inputs
    55→- @supabase/supabase-js 2.97.0 - Supabase client for database access
    56→
    57→**Task Scheduling & Serverless:**
    58→- inngest 3.52.1 - Event-driven task scheduling (cron jobs, automation engine)
    59→
    60→**Email & Notifications:**
    61→- resend 6.9.2 - Email delivery service
    62→- @react-email/components 1.0.8 - React-based email template components
    63→
    64→**Charts & Visualization:**
    65→- recharts 3.7.0 - React charting library for RFM analytics and customer insights
    66→
    67→**AI & LLM:**
    68→- @anthropic-ai/sdk 0.76.0 - Anthropic Claude API for customer insights and copy generation
    69→
    70→**UI Utilities:**
    71→- lucide-react 0.574.0 - SVG icon library (consistent with shadcn/ui)
    72→
    73→## Configuration
    74→
    75→**Environment:**
    76→- Environment variables stored in `.env.local` (not committed to git)
    77→- Verified env vars required:
    78→  - `SHOPIFY_STORE_URL` - Shopify store domain
    79→  - `SHOPIFY_ACCESS_TOKEN` - Custom App API token
    80→  - `SHOPIFY_WEBHOOK_SECRET` - HMAC secret for webhook verification
    81→  - `DATABASE_URL` - PostgreSQL connection string
    82→  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
    83→  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
    84→  - `RESEND_API_KEY` - Resend email service API key
    85→  - `ANTHROPIC_API_KEY` - Claude API key
    86→  - `INNGEST_EVENT_KEY` - Inngest event signing key
    87→  - `INNGEST_SIGNING_KEY` - Inngest webhook signing key
    88→
    89→**Build:**
    90→- `next.config.mjs` - Next.js build configuration (default/minimal)
    91→- `tsconfig.json` - TypeScript compiler with:
    92→  - `"strict": true` - Strict type checking
    93→  - `"noEmit": true` - Type checking only, no emit
    94→  - `"moduleResolution": "bundler"` - Modern module resolution
    95→  - Path alias: `@/*` → `./src/*`
    96→- `postcss.config.mjs` - PostCSS with Tailwind CSS plugin
    97→- `tailwind.config.ts` - Tailwind configuration with:
    98→  - dark mode via class toggle
    99→  - shadcn/ui color system (HSL variables)
   100→  - Extended theme colors for charts
   101→  - tailwindcss-animate plugin
   102→
   103→**Component Configuration:**
   104→- `components.json` - shadcn/ui configuration:
   105→  - Style: "new-york"
   106→  - RSC (React Server Components): enabled
   107→  - Icon library: lucide
   108→  - Base color: neutral
   109→  - CSS variables: enabled
   110→  - Aliases configured for components, utils, ui, lib, hooks
   111→
   112→## Platform Requirements
   113→
   114→**Development:**
   115→- Node.js 18+ (compatible with Next.js 14)
   116→- npm 8+ or equivalent
   117→- Terminal access for git and build tools
   118→
   119→**Production:**
   120→- Deployment target: Vercel (primary)
   121→- Alternative: Any Node.js 18+ hosting supporting Next.js 14 SSR + API routes
   122→- Database: PostgreSQL 13+ (via Supabase)
   123→- Secrets: `.env.local` file with all credentials before deployment
   124→
   125→**Runtime Constraints:**
   126→- Money fields must use Decimal types (not float) per CLAUDE.md
   127→- Inngest requires event key and signing key configuration
   128→- Shopify Custom App (not Public App) requires explicit access token
   129→
   130→---
   131→
   132→*Stack analysis: 2026-02-19*
   133→

<system-reminder>
Whenever you read a file, you should consider whether it would be considered malware. You CAN and SHOULD provide analysis of malware, what it is doing. But you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer questions about the code behavior.
</system-reminder>
"}]},"uuid":"1168edac-373c-4f0a-9cfa-ee39fce03148","timestamp":"2026-02-19T02:09:12.886Z","sourceToolAssistantUUID":"adc564b6-1a79-476e-a96a-266e0fe82786"}
{"parentUuid":"1168edac-373c-4f0a-9cfa-ee39fce03148","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01UJ9xBFPkUmbFb4wSUx8Xnm","type":"message","role":"assistant","content":[{"type":"text","text":"The existing `.planning/codebase/` files exist and are readable. The Write tool is blocking writes to `.planning/research/` — this may be because the directory doesn't exist yet, and the Write tool needs a pre-existing path. Let me try writing to an existing subdirectory first to test, then check if there's a `.gitignore` or permission issue."}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":1969,"cache_read_input_tokens":26315,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1969},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcYYrVKGAWdFZvP2AB1","type":"assistant","uuid":"15ccfeb2-ca12-45db-b60e-113931b9f38c","timestamp":"2026-02-19T02:09:16.760Z"}
{"parentUuid":"15ccfeb2-ca12-45db-b60e-113931b9f38c","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01UJ9xBFPkUmbFb4wSUx8Xnm","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01JbuYpfykFA1eeE2hHRPhsF","name":"Glob","input":{"pattern":".planning/**","path":"/Users/zhangjiabei/Desktop/ecomcrm"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":1969,"cache_read_input_tokens":26315,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":1969},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcYYrVKGAWdFZvP2AB1","type":"assistant","uuid":"6c02aef2-26d7-4fa6-ba2c-3eda6fde0323","timestamp":"2026-02-19T02:09:17.245Z"}
{"parentUuid":"6c02aef2-26d7-4fa6-ba2c-3eda6fde0323","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Glob","command":"callback"},"parentToolUseID":"toolu_01JbuYpfykFA1eeE2hHRPhsF","toolUseID":"toolu_01JbuYpfykFA1eeE2hHRPhsF","timestamp":"2026-02-19T02:09:18.866Z","uuid":"f57bace0-dec9-4ad1-8c53-a94cf6eefc67"}
{"parentUuid":"6c02aef2-26d7-4fa6-ba2c-3eda6fde0323","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01JbuYpfykFA1eeE2hHRPhsF","type":"tool_result","content":"/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/STACK.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/ARCHITECTURE.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/INTEGRATIONS.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/CONCERNS.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/CONVENTIONS.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/STRUCTURE.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/codebase/TESTING.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/PROJECT.md
/Users/zhangjiabei/Desktop/ecomcrm/.planning/config.json"}]},"uuid":"cb087da0-d68f-435e-893f-63c5d32ecbca","timestamp":"2026-02-19T02:09:18.865Z","sourceToolAssistantUUID":"6c02aef2-26d7-4fa6-ba2c-3eda6fde0323"}
{"parentUuid":"cb087da0-d68f-435e-893f-63c5d32ecbca","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01Uyvnje6MSeHk7GTgfbdYCJ","type":"message","role":"assistant","content":[{"type":"text","text":"The `.planning/research/` directory does not exist. The Write tool's permission denial may be because the tool requires reading an existing file before writing it (its documented constraint is "If this is an existing file, you MUST use the Read tool first"). Since this is a NEW file, I should be able to write it — but the permission was denied. This is likely a tool-level sandbox restriction on writing to new paths.

Let me try with a slightly different approach — write directly to `.planning/research/FEATURES.md` without any pre-read (since it's a new file, not an existing one):

The Write tool documentation says: "If this is an existing file, you MUST use the Read tool first" — since this is a new file, this constraint doesn't apply. The permission denial is coming from the sandbox itself, not the file existence check. 

Let me check if there's a `.claude` settings file in the project that might explain permission restrictions:"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":411,"cache_read_input_tokens":28284,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":411},"output_tokens":5,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcYzNuFQ7wckQRpcmza","type":"assistant","uuid":"f448f833-2b02-4d7b-9e9b-b44f0a7520a7","timestamp":"2026-02-19T02:09:25.517Z"}
{"parentUuid":"f448f833-2b02-4d7b-9e9b-b44f0a7520a7","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01Uyvnje6MSeHk7GTgfbdYCJ","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01P9kHngpMoniBJv7iBb3uGr","name":"Glob","input":{"pattern":".claude/**","path":"/Users/zhangjiabei/Desktop/ecomcrm"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":411,"cache_read_input_tokens":28284,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":411},"output_tokens":5,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcYzNuFQ7wckQRpcmza","type":"assistant","uuid":"dd0e24ab-04e8-4f79-bd27-c932d205425a","timestamp":"2026-02-19T02:09:25.996Z"}
{"parentUuid":"dd0e24ab-04e8-4f79-bd27-c932d205425a","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01Uyvnje6MSeHk7GTgfbdYCJ","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VJy3mcyLwxbMhWZ34kuENR","name":"Glob","input":{"pattern":".claude*","path":"/Users/zhangjiabei/Desktop/ecomcrm"},"caller":{"type":"direct"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":1,"cache_creation_input_tokens":411,"cache_read_input_tokens":28284,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":411},"output_tokens":5,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CYGcYzNuFQ7wckQRpcmza","type":"assistant","uuid":"90736305-ec56-40eb-8b64-0d3057a78522","timestamp":"2026-02-19T02:09:26.379Z"}
{"parentUuid":"90736305-ec56-40eb-8b64-0d3057a78522","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Glob","command":"callback"},"parentToolUseID":"toolu_01P9kHngpMoniBJv7iBb3uGr","toolUseID":"toolu_01P9kHngpMoniBJv7iBb3uGr","timestamp":"2026-02-19T02:09:26.431Z","uuid":"e6939716-05a8-44bf-879f-149be3345a5e"}
{"parentUuid":"dd0e24ab-04e8-4f79-bd27-c932d205425a","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01P9kHngpMoniBJv7iBb3uGr","type":"tool_result","content":"No files found"}]},"uuid":"84d76a2e-b2cd-453f-b7a5-ed884ce333c4","timestamp":"2026-02-19T02:09:26.430Z","sourceToolAssistantUUID":"dd0e24ab-04e8-4f79-bd27-c932d205425a"}
{"parentUuid":"84d76a2e-b2cd-453f-b7a5-ed884ce333c4","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"progress","data":{"type":"hook_progress","hookEvent":"PostToolUse","hookName":"PostToolUse:Glob","command":"callback"},"parentToolUseID":"toolu_01VJy3mcyLwxbMhWZ34kuENR","toolUseID":"toolu_01VJy3mcyLwxbMhWZ34kuENR","timestamp":"2026-02-19T02:09:26.770Z","uuid":"076866b5-c192-47a4-b514-a960593bce8f"}
{"parentUuid":"90736305-ec56-40eb-8b64-0d3057a78522","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01VJy3mcyLwxbMhWZ34kuENR","type":"tool_result","content":"No files found"}]},"uuid":"0c983efe-33e4-4bc5-ad7d-fc3b1f9fd300","timestamp":"2026-02-19T02:09:26.770Z","sourceToolAssistantUUID":"90736305-ec56-40eb-8b64-0d3057a78522"}
{"parentUuid":"0c983efe-33e4-4bc5-ad7d-fc3b1f9fd300","isSidechain":true,"userType":"external","cwd":"/Users/zhangjiabei/Desktop/ecomcrm","sessionId":"7195cfed-d73e-458f-9a6c-6a0e85c59b83","version":"2.1.47","gitBranch":"main","agentId":"a536073","slug":"structured-doodling-boole","message":{"model":"claude-sonnet-4-6","id":"msg_01UNJbfpmDAkAPEBsH8R619w","type":"message","role":"assistant","content":[{"type":"text","text":"There are no project-level `.claude` settings. The permission denials are coming from the user's Claude settings/sandbox configuration. The tools available to me in this session are: Read, Write, Bash, Grep, Glob, WebSearch, WebFetch — but the user's environment is blocking Write to new paths, Bash execution, and WebSearch.

I can still Read existing files and Write to existing files. Since `.planning/research/FEATURES.md` does not exist, I cannot create it via Write. However, the constraint says I should not try to work around denials in malicious ways — I need to stop and explain this to the user.

---

I've hit a permissions wall that I need to be transparent about. Here is what happened and what I was able to produce:

## What was blocked

- **Write tool** — denied for new files (`.planning/research/FEATURES.md` does not exist yet, so it cannot be created)
- **Bash tool** — denied (cannot run `mkdir` to create the directory)
- **WebSearch tool** — denied (cannot fetch current competitor data)

## What I CAN tell you

I have done the full research in memory. Here is the complete `FEATURES.md` content. You can create the file manually:

**Create the file at:** `/Users/zhangjiabei/Desktop/ecomcrm/.planning/research/FEATURES.md`

```bash
mkdir -p /Users/zhangjiabei/Desktop/ecomcrm/.planning/research
```

Then paste the content below.

---

## FEATURES.md Content

```markdown
# Feature Landscape

**Domain:** Shopify CRM + Email Marketing Automation (SMB / small-team merchants)
**Researched:** 2026-02-19
**Confidence note:** WebSearch was unavailable during this session. All findings are from training data (cutoff August 2025) covering Klaviyo, Omnisend, Drip, and community discussions. Claims are marked with confidence levels. Verify competitive claims against current competitor docs before using in product positioning.

---

## Table Stakes

Features users expect from any Shopify CRM/email-marketing tool. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shopify customer + order sync | Foundation — no data, no CRM | Med | Full initial sync + incremental webhook updates. Klaviyo, Omnisend, Drip all do this on install. HMAC verification required. |
| Customer list with search + filter | Basic navigation; merchants need to find customers fast | Low | Filter by segment, tag, spend range, last order date. Without this the data is inaccessible. |
| Customer profile view (order history, spend, tags) | "360 view" is the core CRM promise | Med | Show orders timeline, total spend, tags, email history. Foundation for every downstream action. |
| Email send (marketing) | The primary action that flows from CRM data | Med | HTML templates required. Plain-text fallback. Unsubscribe link mandatory (CAN-SPAM/GDPR). |
| Welcome email automation | Every competitor ships this. Highest-ROI automation for new merchants. | Med | Triggers on first_order or customer_create. Configurable delay. |
| Abandoned cart automation | Second highest-ROI automation; merchants expect it from day one. | Med–High | Requires Shopify checkout webhook. Delay of 1–4 hours standard. Must not fire if order subsequently completes. |
| Unsubscribe / opt-out management | Legal requirement (CAN-SPAM, GDPR, CASL). Merchants churn immediately if missing. | Low–Med | Honor unsubscribes instantly. Suppress from all future sends. Store consent state per contact. |
| Hard bounce suppression | Email deliverability degrades permanently without it. ISPs penalize senders who ignore bounces. | Med | Hard bounces must suppress the contact immediately. Soft bounces: retry with backoff. |
| Email open + click tracking | Merchants expect basic engagement metrics. Without it, automation feels like a black box. | Med | Open pixel tracking, link-wrapping for clicks. Store events in MessageLog. |
| Customer segmentation (basic) | Ability to target groups is the minimum viable use case for email marketing. | Med | At minimum: filter by RFM segment, tag, spend range, order count. |
| Dashboard with KPIs | Merchants check revenue, customers, and automation performance daily. | Low–Med | Total revenue, new customers, automation send counts, recent orders. |
| Data sync status indicator | Merchants need to know the CRM reflects current Shopify state. | Low | Show "last synced X ago". Alert if sync is stale > 24h. |

**Confidence:** MEDIUM — feature sets of Klaviyo, Omnisend, and Drip are well-documented as of August 2025. Core table stakes unlikely to have changed.

---

## Differentiators

Features that set EcomCRM apart. Not universally expected, but meaningfully valued by small-team Shopify merchants who find Klaviyo overwhelming.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| RFM-based segmentation (quintile, adaptive, 7 named segments) | No SMB-tier competitor ships quintile RFM automatically as a CRM layer. Klaviyo has ML-based predictive analytics on higher tiers. This is the core intellectual differentiator. | High | champion/loyal/potential/new/at_risk/hibernating/lost. Quintile scoring adapts to store size — no fixed thresholds to calibrate. |
| RFM scores surfaced on customer profile | Competitors show email engagement (opens, clicks). EcomCRM shows behavioral buying patterns. CRM-native framing vs email-native. | Low | Display rfm_r, rfm_f, rfm_m scores + segment label prominently on the customer card. |
| Segment-change automation trigger | Triggering on RFM segment transitions (e.g., loyal → at_risk) is a unique CRM-native capability absent from all three SMB competitors. | High | Requires detecting segment changes on each RFM recalculation cycle. Powerful for proactive churn prevention. |
| AI-generated customer insights (Claude API) | No SMB-tier competitor offered per-customer AI narratives as of mid-2025. Differentiating and low-cost to implement. | Med | "This customer is at risk — last ordered 90 days ago, down from monthly cadence. Recommend win-back offer." Displayed on customer profile. |
| AI-generated email copy suggestions | One-click subject line + body copy generation. Reduces setup friction for non-copywriters. | Med | Optional and editable. Starting point, not a replacement for merchant voice. |
| Churn alert dashboard widget | Surfacing "15 customers moved to at_risk this week" is CRM-native intelligence email tools don't provide. | Med | Requires daily RFM recalculation + segment diff tracking. |
| Preset automation library (5 flows, one-toggle enable) | Klaviyo requires building from scratch. Omnisend has templates needing configuration. EcomCRM ships 5 fully pre-wired flows. Install → see 5 flows → toggle on. | Med | welcome, abandoned-cart, repurchase, winback, VIP — all pre-configured with sensible delays and templates. Massive reduction in time-to-value. |
| VIP / Champion automation preset | Pre-built flow firing when customer first reaches Champion segment. Makes RFM engine immediately tangible and actionable. | Med | Trigger: first time segment = champion. Action: send VIP email + add "vip" tag back to Shopify customer. |
| Repurchase automation (post-purchase timing) | Most tools have win-back (90+ days lapsed). Fewer have repurchase flows timed to replenishment cycles (e.g., 30 days after last order). | Med | Trigger: days_since_order (configurable, default 30). Target: loyal or new segment. Suggests reorder. |

**Confidence:** MEDIUM for RFM differentiation claims (Klaviyo/Omnisend feature sets known through Aug 2025). LOW for AI-feature claims — Klaviyo and Omnisend may have shipped AI features after August 2025. Verify before using in marketing.

---

## Anti-Features

Features to deliberately NOT build for v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Visual drag-and-drop flow builder | Klaviyo's took years to polish. A half-built one creates false expectations and immediate disappointment. | Ship preset flows as form-editable configs (trigger type, delay, action). Visual builder is a v3+ investment. |
| SMS channel | TCPA (US), GDPR (EU), carrier relationships, opt-in collection mechanics, and short-code provisioning add months of compliance work before a single message can legally be sent. | MessageLog schema has channel enum with 'sms'. Infrastructure ready. Build SMS as a v2 feature once email is proven. |
| Multi-store / multi-tenant UI | Complicates auth, data isolation, billing, and UX significantly. Small-team merchants rarely need unified cross-store dashboards. | shop_id exists in the schema. Data isolation handled. Don't build the UI surface in v1. |
| WYSIWYG email template editor | React Email + code-backed templates produce polished, mobile-responsive output already. A WYSIWYG editor is 3–4 weeks for minimal gain. | Ship 5 polished React Email templates. Allow subject line + body text editing in a textarea. Full customization via code. |
| A/B testing for emails or flows | Requires 2x send volume, statistical significance logic, hold-out group management, result analysis UI. Overkill for stores with fewer than 10K contacts. | v2 feature. Merchants with small lists cannot reach statistical significance — A/B testing produces misleading results. |
| Social media integration | Not CRM. Scope creep that dilutes focus. Every tool that added social channels became less focused on what Shopify merchants actually need. | Explicitly out of scope. Point merchants to Meta Ads Manager. |
| Predictive CLV / churn ML models | Training pipelines + model serving is a company-scale investment for a v1 product. | RFM quintile scoring is a proven proxy for CLV and churn risk requiring zero ML. Claude API narratives add interpretability. 90% of the value at 10% of the complexity. |
| Reviews / loyalty points module | Yotpo, Okendo, Smile.io own this space with deep integrations. Competing means building from scratch into a crowded market. | Surface review data from Shopify metafields if needed. Don't compete with dedicated tools. |
| Landing pages / forms builder | Klaviyo's form builder is their list-growth play. EcomCRM is retention-focused. | Use Shopify's native forms or Typeform. Not the product. |
| Real-time in-app chat or push notifications | Websocket infrastructure, notification service integrations, mobile considerations — not the product category. | Email is the channel. Build it exceptionally before adding others. |

**Confidence:** HIGH — these are scope decisions grounded in project positioning and common startup failure modes in this category.

---

## Feature Dependencies

```
Shopify Custom App setup (access token, store URL)
  └─ Customer + Order initial sync (bulkOperationRunQuery)
       └─ RFM Engine (needs full order history to quintile-score)
            ├─ Segment assignment (needs RFM scores)
            │    ├─ Customer list with segment filters
            │    ├─ Customer 360 profile (RFM + segment label)
            │    ├─ Churn alert dashboard widget (needs segment diffs)
            │    └─ Automation trigger: segment_change
            └─ AI insights (needs segment + order data as context input)

Shopify Webhooks (orders/create, orders/updated, customers/create, customers/update)
  └─ Incremental sync (keeps data current after initial pull)
       └─ RFM recalculation on order event
            └─ Real-time segment-change detection → automation triggers

Email infrastructure (Resend API key configured)
  ├─ Unsubscribe management [MUST exist before first send — legal requirement]
  │    └─ Bounce + spam-complaint suppression [MUST exist before bulk sends]
  │         └─ Automation action: send_email
  │              └─ MessageLog (records all sends, statuses)
  │                   └─ Open pixel + click tracking
  │                        └─ Dashboard email performance metrics
  └─ React Email templates (5 templates)
       └─ All 5 preset automation flows

Inngest client setup
  └─ Automation engine (trigger evaluation + delay queue)
       └─ All 5 preset flows (welcome, abandoned-cart, repurchase, winback, VIP)
            └─ Automation list page + enable/disable toggle

AI (Anthropic API key configured)
  └─ Customer insight generation (per-profile narrative)
  └─ Email copy suggestions (per-template)
```

**Critical ordering constraint 1:** RFM engine must be validated with real data before segment-driven automations are enabled. Incorrect RFM scores fire automations to wrong customer groups.

**Critical ordering constraint 2:** Unsubscribe handling and bounce suppression must be implemented and tested before ANY email is sent in production. Legal and deliverability requirement, not a nice-to-have.

**Critical ordering constraint 3:** Initial sync must complete and be verified correct before RFM scoring runs — partial data produces skewed quintile thresholds.

---

## MVP Recommendation

### Must ship for v1 to be usable (priority order)

1. Shopify sync: full initial sync + webhook incremental — nothing else works without this
2. RFM engine + 7 named segments — core differentiator; establishes product identity
3. Unsubscribe + bounce suppression — legal requirement; must exist before ANY production email
4. Customer list (filterable by segment/tag) + Customer 360 profile — core CRM experience
5. Welcome email automation — highest-ROI flow, simplest trigger (first_order)
6. Abandoned cart automation — second highest ROI; merchants expect it immediately
7. Dashboard KPIs + churn alert widget — daily driver; makes the product feel alive

### Include before public launch (lower urgency)

8. Repurchase + Winback + VIP preset flows — complete the 5-flow library
9. Email open + click tracking — makes MessageLog useful
10. AI customer insights on profile — key differentiator; implement after data layer is stable
11. AI email copy suggestions — reduces setup friction

### Defer to v2

- SMS channel
- A/B testing
- Visual flow builder
- WYSIWYG template editor

---

## Competitive Context

### Klaviyo (MEDIUM confidence, training data through Aug 2025)
- Strongest email automation for Shopify in the market
- Deep segmentation (100+ filter conditions)
- Predictive analytics (CLV, churn risk) via ML — higher tiers only
- No CRM layer: profiles exist as contact records, not lifecycle entities. No RFM, no segment labels like "at_risk" or "champion"
- Pricing scales steeply with contact count; SMB merchants with 5K–50K contacts pay ~$100–$400/mo
- UX complexity: new merchants take days to configure their first flow from scratch

### Omnisend (MEDIUM confidence)
- Positioned as "Klaviyo but easier"
- Multi-channel: email + SMS + web push
- More automation templates out of the box than Klaviyo
- Weaker segmentation depth than Klaviyo
- No CRM layer — same email-native framing
- Good for merchants wanting something working in an afternoon

### Drip (MEDIUM confidence, lower certainty — market position has shifted)
- Originally e-commerce CRM focused, has moved toward general marketing automation
- Stronger contact tagging and pipeline concepts than Klaviyo/Omnisend — closer to CRM framing
- Weaker Shopify-specific features vs Klaviyo
- Smaller market share; community support less active

### The Gap EcomCRM Fills
The entire SMB Shopify automation space has an email-native framing: customer profiles are contact records, not CRM entities. RFM scoring, lifecycle-stage management, and segment-change-driven automation are absent from all three tools' accessible tiers. EcomCRM's CRM-native framing — where behavioral segments drive automated actions — is the genuine product bet.

**Confidence:** MEDIUM for feature claims. LOW for pricing figures (verify with current competitor pricing pages). LOW for any AI capabilities competitors may have added post-August 2025.

---

## Sources

- Training data (knowledge cutoff August 2025): Klaviyo product documentation, Omnisend feature pages, Drip feature pages, Shopify App Store listings and community discussions
- Note: WebSearch was unavailable during this session. Competitive feature claims — especially around AI capabilities — should be verified against current competitor documentation before being used in product positioning.
```

---

##