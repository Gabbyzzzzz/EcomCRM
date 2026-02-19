# Phase 2: Shopify Integration - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Pull all Shopify customer and order data into the database via bulk operation (initial sync), then keep it current via real-time webhooks (orders/create, orders/updated, customers/create, customers/update). Covers rate limiting, HMAC verification, idempotency, and sync status visibility. RFM scoring and automation triggers are downstream phases.

</domain>

<decisions>
## Implementation Decisions

### Initial sync behavior
- Trigger: Auto on first run (when no data exists yet), manual "Sync Now" button after that
- Progress feedback: Live count — "Synced 1,234 / 5,000 customers" updating in real-time during the bulk operation
- Completion: Success toast with summary — "Sync complete: 5,234 customers, 12,891 orders imported"
- Failure recovery: Checkpoint-based resume — track last successful cursor, retry resumes from where it left off (not from scratch)

### Sync status visibility
- Location: Compact indicator in the main nav (always visible) + full sync details on settings/integrations page
- Stale-sync alert (24h without sync): Red dot / badge on the nav sync indicator — no banner, no modal
- "Sync Now" button: In the nav — quick access always available from anywhere in the app
- Running state: Nav indicator becomes a spinner while sync is in progress — clearly distinct from idle

### Webhook failure handling
- Processing failures: Inngest retries automatically (silent) — no user alert unless all retries exhausted
- Exhausted retries (dead letter): Shown as a separate count on the settings/sync page — user can see permanently failed events
- Out-of-order webhooks: Upsert with last-write-wins based on Shopify's `updated_at` timestamp — no queue/delay logic
- HMAC verification failures: Log to server logs only — not surfaced in UI, silently return 401

### Data conflict / re-sync behavior
- Existing customer on re-sync: Selective merge — Shopify fields (name, email, order_count, total_spent, etc.) are overwritten by Shopify; CRM-added data preserved
- Shopify-deleted customers: Soft-delete with a flag — retain in DB but hide from active customer lists and exclude from automations
- Historical vs live orders: Cutover timestamp approach — any order with `created_at` before the first sync's `sync_started_at` is treated as historical; automations skip historical orders
- Re-sync scope: Incremental by default (fetch changes since last `updated_at` cursor); "Force full sync" option available for recovery scenarios

### Claude's Discretion
- Exact spinner/animation style for the nav sync indicator
- Settings/sync page layout and information hierarchy
- Specific retry count for Inngest webhook functions (3-5 attempts)
- Dead-letter queue data model (table vs log vs in-memory)
- Exact field list distinguishing "Shopify fields" vs "CRM fields" in the selective merge logic

</decisions>

<specifics>
## Specific Ideas

- The sync progress counter ("Synced 1,234 / 5,000 customers") should update in real-time — user should see it incrementing, not just a final number
- The nav sync indicator should serve triple duty: idle state, in-progress spinner, and stale/error badge — single widget with three visual states
- "Force full sync" is a recovery/debugging tool, not the normal workflow — it can live behind an "Advanced" toggle or similar to avoid accidental use

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-shopify-integration*
*Context gathered: 2026-02-19*
