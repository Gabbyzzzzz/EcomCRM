# Phase 4: Email Infrastructure - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Transactional email infrastructure for the CRM: 5 React Email templates (welcome, abandoned-cart, repurchase, winback, VIP), Resend integration with idempotency, compliance headers, unsubscribe handling with Shopify tag sync, hard bounce suppression, and sender domain configuration. Creating or sending automation flows is out of scope (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Template design & tone
- Visual style: Clean branded HTML — logo, brand colors, clear sections. Not plain-text, not image-heavy.
- Tone: Professional & neutral — polished and brand-safe, appropriate for any merchant vertical.
- Content structure: Claude's discretion per template — adapt layout to what makes sense for each email type (welcome vs win-back have different optimal structures).
- Branding: Reserve a logo image URL slot + inject store name as text. Both sourced from env config. Merchant sets their logo later.

### Unsubscribe experience
- Mechanism: One-click unsubscribe — single request unsubscribes immediately (required for Gmail/Yahoo bulk sender compliance).
- Landing page: Simple Next.js page (e.g. `/unsubscribe?token=...`) confirming opted-out status.
- Re-subscribe: Offer an "undo" link on the unsubscribe confirmation page — one-step reversal if clicked immediately.
- Shopify sync: On unsubscribe, add `'unsubscribed'` tag to the customer's Shopify record via Admin API.

### Suppression & bounce behavior
- Hard bounces: One-strike permanent suppression — any hard bounce blocks the address immediately.
- Soft bounces: Do NOT trigger suppression — only hard bounces (permanent delivery failures) suppress.
- Suppression storage: Separate suppression table in the DB — distinguishes reason (bounce vs unsubscribe) and stores timestamp. `marketing_opted_out` flag on the customers table continues to gate sends.
- Blocked send behavior: Log the blocked attempt to `MessageLog` with status `'suppressed'` — visible in message history on the customer profile. Does not throw an error.

### Subdomain & sender identity
- Sending domain: Claude's discretion — use `marketing.{store-domain}` as the standard subdomain for marketing email. Document required DNS records.
- Sender name: Configurable via `RESEND_FROM_NAME` env var. Merchant sets their store name.
- Reply-to: Configurable via `RESEND_REPLY_TO` env var. If unset, defaults to noreply.
- DNS setup: Document required SPF, DKIM, DMARC records in `README.md` and `.env.local.example` as a setup checklist.

### Claude's Discretion
- Exact content structure per template (adapted to each email's purpose)
- Unsubscribe token format and signing strategy
- Suppression table schema design
- Whether `marketing_opted_out` and suppression table are checked in one query or sequentially
- Exact DNS record values in documentation

</decisions>

<specifics>
## Specific Ideas

- Unsubscribe page should show a clear "You've been unsubscribed" message with an undo link for immediate reversal — not just a blank confirmation.
- `MessageLog` status `'suppressed'` should make it clear why a message wasn't sent (distinguishable from `'sent'`, `'failed'`, etc.).
- Env vars needed: `RESEND_FROM_NAME`, `RESEND_REPLY_TO`, `RESEND_FROM_EMAIL` (the full sending address including subdomain).

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-email-infrastructure*
*Context gathered: 2026-02-19*
