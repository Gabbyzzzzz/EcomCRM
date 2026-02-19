import type { InngestFunction } from 'inngest'
import Decimal from 'decimal.js'
import { inngest } from './client'
import {
  upsertCustomer,
  upsertOrder,
  softDeleteCustomer,
  updateSyncLog,
  recordWebhookDelivery,
  updateWebhookDeliveryStatus,
  updateCustomerCountersFromOrders,
  insertSuppression,
  setMarketingOptedOut,
  getCustomerByEmail,
} from '@/lib/db/queries'
import {
  processFullSyncResults,
  startIncrementalSync,
  fetchAndUpsertCustomer,
  fetchAndUpsertOrder,
} from '@/lib/shopify/sync'
import { recalculateAllRfmScores } from '@/lib/rfm/engine'
import { env } from '@/lib/env'
import { db } from '@/lib/db'
import { customers as customersTable, syncLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { BulkOperationWebhookPayload } from '@/lib/shopify/types'
import type { ShopifyCustomer, ShopifyOrder } from '@/lib/shopify/types'

// ─── Shop ID helper ───────────────────────────────────────────────────────────

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

// ─── Event type definitions ───────────────────────────────────────────────────

type WebhookEventData = {
  shopId: string
  topic: string
  payload: unknown
  webhookId: string
}

// ─── Function 1: processShopifyWebhook ───────────────────────────────────────

/**
 * Processes all incoming Shopify webhook events dispatched from the webhook route.
 *
 * Topics handled:
 * - orders/create           → upsert order (isHistorical=false) + update customer counters
 * - orders/updated          → upsert order with last-write-wins + update customer counters
 * - customers/create        → upsert customer
 * - customers/update        → upsert customer with last-write-wins
 * - customers/delete        → soft-delete customer
 * - bulk_operations/finish  → find syncLog by bulkOperationId, process JSONL results
 *
 * NOTE: bulk_operations/finish is handled here in the switch-case (SHOP-03).
 * No separate processFullSyncCompletion function — that would be dead code.
 *
 * On all retries exhausted: update webhook_deliveries status to 'dead_letter'.
 */
export const processShopifyWebhook = inngest.createFunction(
  {
    id: 'process-shopify-webhook',
    retries: 4,
  },
  { event: 'shopify/webhook.received' },
  async ({ event }) => {
    const { shopId, topic, payload, webhookId } = event.data as WebhookEventData

    try {
      switch (topic) {
        case 'orders/create':
        case 'orders/updated': {
          // Payload is the Shopify order object (webhook format)
          const order = payload as ShopifyOrder
          await upsertOrder(
            shopId,
            {
              shopifyId: order.id,
              customerId: null, // resolved at query time if needed
              totalPrice: order.totalPriceSet?.shopMoney?.amount ?? null,
              lineItems: order.lineItems?.edges?.map((e) => ({
                title: e.node.title,
                quantity: e.node.quantity,
                price: e.node.variant?.price ?? null,
              })) ?? [],
              financialStatus: order.displayFinancialStatus?.toLowerCase() ?? null,
              shopifyCreatedAt: order.createdAt ? new Date(order.createdAt) : null,
              shopifyUpdatedAt: order.updatedAt ? new Date(order.updatedAt) : null,
            },
            false // realtime webhook orders are never historical
          )

          // RFM-04: Recalculate customer counters from orders table.
          // Updates order_count, total_spent, avg_order_value, first_order_at, last_order_at
          // for the affected customer. Full quintile recalculation runs in the daily cron only.
          if (order.customer?.id) {
            const [customerRow] = await db
              .select({ id: customersTable.id })
              .from(customersTable)
              .where(
                and(
                  eq(customersTable.shopId, shopId),
                  eq(customersTable.shopifyId, order.customer.id)
                )
              )
              .limit(1)

            if (customerRow) {
              await updateCustomerCountersFromOrders(shopId, customerRow.id)
            }
          }
          break
        }

        case 'customers/create':
        case 'customers/update': {
          const customer = payload as ShopifyCustomer
          const totalSpent = customer.amountSpent?.amount ?? '0'
          // numberOfOrders is an UnsignedInt64 serialized as a string
          const orderCount = parseInt(customer.numberOfOrders ?? '0', 10)
          // Use Decimal for all money arithmetic (SHOP-07 — never parseFloat)
          const avgOrderValue =
            orderCount > 0
              ? new Decimal(totalSpent).div(orderCount).toFixed(4)
              : '0.0000'

          // Build name from first/last
          const nameParts = [customer.firstName, customer.lastName].filter(Boolean)
          const name = nameParts.length > 0 ? nameParts.join(' ') : customer.email ?? null

          await upsertCustomer(shopId, {
            shopifyId: customer.id,
            name,
            email: customer.email,
            phone: customer.phone,
            tags: customer.tags,
            totalSpent,
            orderCount,
            avgOrderValue,
            firstOrderAt: null,
            lastOrderAt: null,
            shopifyUpdatedAt: customer.updatedAt ? new Date(customer.updatedAt) : null,
          })
          break
        }

        case 'customers/delete': {
          // Delete payload only contains admin_graphql_api_id
          const deletePayload = payload as { admin_graphql_api_id?: string; id?: string }
          const shopifyId = deletePayload.admin_graphql_api_id ?? `gid://shopify/Customer/${deletePayload.id ?? ''}`
          await softDeleteCustomer(shopId, shopifyId)
          break
        }

        case 'bulk_operations/finish': {
          // SHOP-03: Async bulk operation completion arrives as a webhook
          const bulkPayload = payload as BulkOperationWebhookPayload

          if (bulkPayload.status !== 'completed') {
            console.warn(
              `[inngest] Bulk operation finished with status ${bulkPayload.status}: ${bulkPayload.error_code ?? 'no error code'}`
            )
            // Find and mark the syncLog as failed so stale detection and resume logic work correctly
            const [failedSyncLog] = await db
              .select({ id: syncLogs.id })
              .from(syncLogs)
              .where(
                and(
                  eq(syncLogs.shopId, shopId),
                  eq(syncLogs.bulkOperationId, bulkPayload.admin_graphql_api_id)
                )
              )
              .limit(1)
            if (failedSyncLog) {
              await updateSyncLog(failedSyncLog.id, {
                status: 'failed',
                errorMessage: `Bulk operation ended with status: ${bulkPayload.status}${bulkPayload.error_code ? ` (${bulkPayload.error_code})` : ''}`,
                completedAt: new Date(),
              })
            }
            break
          }

          if (!bulkPayload.url) {
            console.warn('[inngest] Bulk operation completed but no URL provided')
            break
          }

          const [syncLog] = await db
            .select()
            .from(syncLogs)
            .where(
              and(
                eq(syncLogs.shopId, shopId),
                eq(syncLogs.bulkOperationId, bulkPayload.admin_graphql_api_id)
              )
            )
            .limit(1)

          if (!syncLog) {
            console.warn(
              `[inngest] No syncLog found for bulk operation ${bulkPayload.admin_graphql_api_id}`
            )
            break
          }

          // Process the JSONL results — this handles checkpoint-based resume internally
          await processFullSyncResults(
            syncLog.id,
            shopId,
            bulkPayload.url,
            syncLog.startedAt,
            syncLog.cursor ?? undefined
          )
          break
        }

        default:
          console.log(`[inngest] Unhandled webhook topic: ${topic}`)
      }

      // Mark webhook delivery as processed
      await recordWebhookDelivery(shopId, webhookId, topic, 'processed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[inngest] Webhook ${webhookId} (${topic}) failed:`, error)

      // Re-throw so Inngest retries the function.
      // Inngest retries up to 4 times; processShopifyWebhookFailure handles final dead-letter on exhaustion.
      throw new Error(message)
    }
  }
)

// ─── onFailure: dead-letter handler for processShopifyWebhook ─────────────────

/**
 * Called by Inngest after all retries for processShopifyWebhook are exhausted.
 * Updates the webhookDeliveries row to status='dead_letter' so the UI can surface it.
 */
export const processShopifyWebhookFailure = inngest.createFunction(
  {
    id: 'process-shopify-webhook-failure',
    retries: 0,
  },
  { event: 'inngest/function.failed' },
  async ({ event }) => {
    // Guard: only handle failures from the webhook processor, not scheduledSync or other functions
    if (event.data.function_id !== 'process-shopify-webhook') return

    const failedEvent = event.data.event as { data?: { shopId?: string; webhookId?: string; topic?: string } } | undefined
    const shopId = failedEvent?.data?.shopId
    const webhookId = failedEvent?.data?.webhookId
    const topic = failedEvent?.data?.topic ?? 'unknown'

    if (!shopId || !webhookId) {
      console.warn('[inngest] onFailure: missing shopId or webhookId in failed event data')
      return
    }

    console.warn(`[inngest] Dead-lettering webhook ${webhookId} (${topic}) for shop ${shopId}`)
    // Use updateWebhookDeliveryStatus (not recordWebhookDelivery) because the row already exists
    // as 'processing' — recordWebhookDelivery uses onConflictDoNothing and would silently skip.
    await updateWebhookDeliveryStatus(shopId, webhookId, 'dead_letter')
  }
)

// ─── Function 2: scheduledSync ────────────────────────────────────────────────

/**
 * Runs an incremental sync every 6 hours as a fallback.
 * Ensures data stays fresh even if real-time webhooks are missed or delayed.
 */
export const scheduledSync = inngest.createFunction(
  {
    id: 'scheduled-sync',
    retries: 2,
  },
  { cron: '0 */6 * * *' },
  async () => {
    const shopId = getShopId()
    console.log(`[inngest] Running scheduled incremental sync for shop ${shopId}`)
    await startIncrementalSync(shopId)
    console.log(`[inngest] Scheduled sync completed for shop ${shopId}`)
  }
)

// ─── Function 3: dailyRfmRecalculation ───────────────────────────────────────

/**
 * Runs a full RFM quintile recalculation for all active customers daily at 2 AM UTC.
 *
 * Steps:
 * 1. Call recalculateAllRfmScores to recompute NTILE scores and update the DB (RFM-05).
 * 2. Emit an 'rfm/segment.changed' event for each customer whose segment label changed.
 *
 * Segment change events are consumed by the Phase 5 automation engine to trigger
 * flows (e.g. win-back when champion → at_risk).
 *
 * Uses step.run() for Inngest checkpointing: if the function fails after scoring
 * but before event emission, Inngest will resume at the event-emission step on retry
 * without re-running the expensive NTILE query.
 */
export const dailyRfmRecalculation = inngest.createFunction(
  {
    id: 'daily-rfm-recalculation',
    retries: 2,
  },
  { cron: '0 2 * * *' }, // Run at 2 AM UTC daily
  async ({ step }) => {
    const shopId = getShopId()

    // Step 1: Recalculate all RFM scores (returns segment changes)
    const segmentChanges = await step.run('recalculate-rfm-scores', async () => {
      return await recalculateAllRfmScores(shopId)
    })

    // Step 2: Emit segment_change events for each changed customer
    if (segmentChanges.length > 0) {
      await step.run('emit-segment-changes', async () => {
        // Batch send all segment change events
        await inngest.send(
          segmentChanges.map((change) => ({
            name: 'rfm/segment.changed' as const,
            data: {
              shopId,
              customerId: change.customerId,
              oldSegment: change.oldSegment,
              newSegment: change.newSegment,
            },
          }))
        )
      })
    }

    console.log(
      `[inngest] Daily RFM recalculation complete: ${segmentChanges.length} segment changes`
    )
  }
)

// ─── Function 5: processResendWebhook ────────────────────────────────────────

/**
 * Processes Resend webhook events dispatched from the /api/webhooks/resend route.
 *
 * Events handled:
 * - email.bounced  → hard bounce only → insertSuppression('hard_bounce') + setMarketingOptedOut
 *                    soft bounces are transient; they are intentionally ignored (locked decision).
 * - email.complained → spam complaint, treated as unsubscribe →
 *                      insertSuppression('unsubscribe') + setMarketingOptedOut
 */
export const processResendWebhook = inngest.createFunction(
  { id: 'process-resend-webhook', retries: 3 },
  { event: 'resend/webhook.received' },
  async ({ event }) => {
    const { type, data } = event.data as { type: string; data: Record<string, unknown> }
    const shopId = getShopId()

    // Extract recipient email(s) — Resend sends 'to' as string or string[]
    const toField = data.to
    const emails: string[] = Array.isArray(toField)
      ? toField
      : typeof toField === 'string'
        ? [toField]
        : []

    switch (type) {
      case 'email.bounced': {
        const bounceType = data.bounce_type as string | undefined
        // Only suppress on HARD bounce — soft bounces are transient (per locked decision)
        if (bounceType === 'hard') {
          for (const email of emails) {
            await insertSuppression(shopId, email, 'hard_bounce')
            // Also set marketing_opted_out on the customer if they exist
            const customer = await getCustomerByEmail(shopId, email)
            if (customer) {
              await setMarketingOptedOut(shopId, customer.id, true)
            }
          }
        }
        break
      }

      case 'email.complained': {
        // Spam complaint — treat as unsubscribe (EMAIL-01 compliance)
        for (const email of emails) {
          await insertSuppression(shopId, email, 'unsubscribe')
          const customer = await getCustomerByEmail(shopId, email)
          if (customer) {
            await setMarketingOptedOut(shopId, customer.id, true)
          }
        }
        break
      }

      default:
        console.log(`[resend-webhook] Unhandled event type: ${type}`)
    }
  }
)

// ─── Export functions array ────────────────────────────────────────────────────

// 5 functions: processShopifyWebhook, processShopifyWebhookFailure (dead-letter), scheduledSync, dailyRfmRecalculation, processResendWebhook
export const functions: InngestFunction.Like[] = [
  processShopifyWebhook,
  processShopifyWebhookFailure,
  scheduledSync,
  dailyRfmRecalculation,
  processResendWebhook,
]

// Suppress unused import warning for fetchAndUpsertCustomer/fetchAndUpsertOrder
// These are exported from sync.ts for direct use in webhook handler extensions
void fetchAndUpsertCustomer
void fetchAndUpsertOrder
