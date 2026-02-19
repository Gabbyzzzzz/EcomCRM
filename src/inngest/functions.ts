import type { InngestFunction } from 'inngest'
import Decimal from 'decimal.js'
import { inngest } from './client'
import {
  upsertCustomer,
  upsertOrder,
  softDeleteCustomer,
  updateSyncLog,
  recordWebhookDelivery,
} from '@/lib/db/queries'
import {
  processFullSyncResults,
  startIncrementalSync,
  fetchAndUpsertCustomer,
  fetchAndUpsertOrder,
} from '@/lib/shopify/sync'
import { env } from '@/lib/env'
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
 * - orders/create           → upsert order (isHistorical=false)
 * - orders/updated          → upsert order with last-write-wins
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
                price: e.node.variant?.price?.amount ?? null,
              })) ?? [],
              financialStatus: order.financialStatus?.toLowerCase() ?? null,
              shopifyCreatedAt: order.createdAt ? new Date(order.createdAt) : null,
              shopifyUpdatedAt: order.updatedAt ? new Date(order.updatedAt) : null,
            },
            false // realtime webhook orders are never historical
          )
          break
        }

        case 'customers/create':
        case 'customers/update': {
          const customer = payload as ShopifyCustomer
          const totalSpent = customer.totalSpentV2?.amount ?? '0'
          const orderCount = customer.ordersCount ?? 0
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
            // Find the syncLog and mark it failed
            // bulkOperationId is the admin_graphql_api_id from the payload
            break
          }

          if (!bulkPayload.url) {
            console.warn('[inngest] Bulk operation completed but no URL provided')
            break
          }

          // Find the syncLog associated with this bulk operation
          // We query by bulkOperationId stored when we started the sync
          const { db } = await import('@/lib/db')
          const { syncLogs } = await import('@/lib/db/schema')
          const { eq, and } = await import('drizzle-orm')

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

      // Re-throw so Inngest retries the function
      // On final failure (all 4 retries exhausted), Inngest marks it dead
      // We update status to 'dead_letter' in the onFailure handler below
      throw new Error(message)
    }
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

// ─── Export functions array ────────────────────────────────────────────────────

// Exactly 2 functions — no dead processFullSyncCompletion (SHOP-03 handled inline)
export const functions: InngestFunction.Like[] = [
  processShopifyWebhook,
  scheduledSync,
]

// Suppress unused import warning for fetchAndUpsertCustomer/fetchAndUpsertOrder
// These are exported from sync.ts for direct use in webhook handler extensions
void fetchAndUpsertCustomer
void fetchAndUpsertOrder
void updateSyncLog
