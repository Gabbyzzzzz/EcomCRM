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
  updateAutomationLastRun,
  getCustomerByInternalId,
  getRecentMessageLog,
} from '@/lib/db/queries'
import {
  processFullSyncResults,
  startIncrementalSync,
  fetchAndUpsertCustomer,
  fetchAndUpsertOrder,
} from '@/lib/shopify/sync'
import { recalculateAllRfmScores } from '@/lib/rfm/engine'
import { fetchEnabledAutomationsByTrigger } from '@/lib/automation/engine'
import { executeEmailAction, executeTagAction } from '@/lib/automation/actions'
import { env } from '@/lib/env'
import { db } from '@/lib/db'
import { customers as customersTable, syncLogs, orders as ordersTable } from '@/lib/db/schema'
import { eq, and, gte, lte, isNull, isNotNull } from 'drizzle-orm'
import type { BulkOperationWebhookPayload } from '@/lib/shopify/types'
import type { ShopifyCustomer, ShopifyOrder } from '@/lib/shopify/types'

// ─── REST webhook payload types ───────────────────────────────────────────────
// Shopify REST webhooks use snake_case flat JSON — different from the GraphQL
// types (ShopifyOrder / ShopifyCustomer) used for API responses.

interface RestWebhookOrder {
  id: number | string
  total_price: string
  financial_status: string
  created_at: string
  updated_at: string
  customer?: {
    id: number | string
  } | null
  line_items?: Array<{
    title: string
    quantity: number
    price: string
  }>
}

interface RestWebhookCustomer {
  id: number | string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  total_spent: string
  orders_count: number
  tags: string
  created_at: string
  updated_at: string
}

// ─── REST → GraphQL normalizers ───────────────────────────────────────────────
// Shopify sends webhook POST bodies in REST API format (snake_case, numeric IDs).
// Our internal types (ShopifyOrder, ShopifyCustomer) use GraphQL format.
// These normalizers bridge the gap so downstream code works without changes.
//
// Normalization smoke test — Order:
// Input (REST):  { id: 123, total_price: "99.00", customer: { id: 456 },
//                  financial_status: "paid", created_at: "2024-01-01T00:00:00Z",
//                  line_items: [{ title: "Widget", quantity: 1, price: "99.00" }] }
// Output (normalized): {
//   id: "gid://shopify/Order/123",
//   totalPriceSet: { shopMoney: { amount: "99.00", currencyCode: "USD" } },
//   customer: { id: "gid://shopify/Customer/456" },
//   displayFinancialStatus: "PAID",
//   createdAt: "2024-01-01T00:00:00Z",
//   updatedAt: "...",
//   lineItems: { edges: [{ node: { title: "Widget", quantity: 1, variant: { price: "99.00" } } }] }
// }
//
// Normalization smoke test — Customer:
// Input (REST):  { id: 789, first_name: "Jane", last_name: "Doe", email: "jane@example.com",
//                  total_spent: "150.00", orders_count: 3, tags: "vip,loyal", updated_at: "..." }
// Output (normalized): {
//   id: "gid://shopify/Customer/789",
//   firstName: "Jane", lastName: "Doe", email: "jane@example.com",
//   amountSpent: { amount: "150.00", currencyCode: "USD" },
//   numberOfOrders: "3", tags: ["vip", "loyal"], updatedAt: "..."
// }

function normalizeRestOrder(raw: RestWebhookOrder): ShopifyOrder {
  const numericId = String(raw.id)
  const gid = numericId.startsWith('gid://') ? numericId : `gid://shopify/Order/${numericId}`

  let customerGid: string | null = null
  if (raw.customer?.id != null) {
    const cid = String(raw.customer.id)
    customerGid = cid.startsWith('gid://') ? cid : `gid://shopify/Customer/${cid}`
  }

  return {
    id: gid,
    name: `#${numericId}`,
    totalPriceSet: {
      shopMoney: {
        amount: raw.total_price ?? '0',
        currencyCode: 'USD',
      },
    },
    customer: customerGid ? { id: customerGid } : null,
    lineItems: {
      edges: (raw.line_items ?? []).map((item) => ({
        node: {
          title: item.title,
          quantity: item.quantity,
          variant: { price: item.price },
        },
      })),
    },
    displayFinancialStatus: (raw.financial_status ?? '').toUpperCase(),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function normalizeRestCustomer(raw: RestWebhookCustomer): ShopifyCustomer {
  const numericId = String(raw.id)
  const gid = numericId.startsWith('gid://') ? numericId : `gid://shopify/Customer/${numericId}`

  // REST API sends tags as a comma-separated string; GraphQL returns string[]
  const tags = raw.tags
    ? raw.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  return {
    id: gid,
    firstName: raw.first_name ?? null,
    lastName: raw.last_name ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    numberOfOrders: String(raw.orders_count ?? 0),
    amountSpent: {
      amount: raw.total_spent ?? '0',
      currencyCode: 'USD',
    },
    tags,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

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
          // [pipeline] Normalize REST webhook payload → ShopifyOrder (GraphQL format).
          // Shopify sends REST format (snake_case, numeric IDs) for webhook POST bodies.
          // normalizeRestOrder maps to our internal ShopifyOrder type.
          const order = normalizeRestOrder(payload as RestWebhookOrder)
          console.log(`[pipeline] orders handler: normalized order GID=${order.id}, customer GID=${order.customer?.id ?? 'none'}`)

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
            // [pipeline] Looking up customer by GID (normalized from REST numeric id)
            console.log(`[pipeline] Fetching customer row for GID=${order.customer.id}`)
            const [customerRow] = await db
              .select({ id: customersTable.id, orderCount: customersTable.orderCount })
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

              // AUTO-01: Emit automation/first_order for first-time orders only.
              // Re-fetch customer row after counter update to get the updated orderCount.
              // Only emit for orders/create topic (not orders/updated) — webhook orders
              // are always isHistorical=false, so no additional guard needed.
              if (topic === 'orders/create') {
                const [updatedCustomer] = await db
                  .select({ orderCount: customersTable.orderCount })
                  .from(customersTable)
                  .where(eq(customersTable.id, customerRow.id))
                  .limit(1)

                if (updatedCustomer?.orderCount === 1) {
                  try {
                    // [pipeline] Emitting automation/first_order for customer=${customerRow.id}
                    console.log(`[pipeline] Emitting automation/first_order for customerId=${customerRow.id}`)
                    await inngest.send({
                      name: 'automation/first_order',
                      data: {
                        shopId,
                        customerId: customerRow.id,
                        shopifyCustomerId: order.customer.id,
                        eventTimestamp: new Date().toISOString(),
                      },
                    })
                  } catch (emitErr) {
                    // Event emission failure must not break webhook processing
                    console.error('[inngest] Failed to emit automation/first_order:', emitErr)
                  }
                }
              }
            } else {
              console.warn(`[pipeline] No customer found for GID=${order.customer.id} — counter update skipped`)
            }
          }
          break
        }

        case 'customers/create':
        case 'customers/update': {
          // [pipeline] Normalize REST webhook payload → ShopifyCustomer (GraphQL format).
          // REST sends snake_case fields (first_name, total_spent, orders_count, tags as CSV string).
          // normalizeRestCustomer maps to our internal ShopifyCustomer type.
          const customer = normalizeRestCustomer(payload as RestWebhookCustomer)
          console.log(`[pipeline] customers handler: normalized customer GID=${customer.id}, email=${customer.email ?? 'none'}`)

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

    // Step 2: Emit segment_change events for each changed customer.
    // eventTimestamp is stable for this recalculation run — generated ONCE before the
    // loop and reused for all events, ensuring idempotency keys in executeEmailAction
    // are consistent across Inngest retries (CRITICAL — do NOT generate per-event).
    if (segmentChanges.length > 0) {
      await step.run('emit-segment-changes', async () => {
        const recalcTimestamp = new Date().toISOString()
        // Batch send all segment change events
        await inngest.send(
          segmentChanges.map((change) => ({
            name: 'rfm/segment.changed' as const,
            data: {
              shopId,
              customerId: change.customerId,
              oldSegment: change.oldSegment,
              newSegment: change.newSegment,
              eventTimestamp: recalcTimestamp,
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

// ─── Function 6: processFirstOrder ───────────────────────────────────────────

/**
 * Triggered by 'automation/first_order' event, emitted from processShopifyWebhook
 * when a customer places their first order (orderCount === 1, isHistorical=false).
 *
 * For each enabled first_order automation:
 * 1. Sleeps for the configured delay (e.g. 1h for Welcome Flow)
 * 2. Sends the configured email template
 */
export const processFirstOrder = inngest.createFunction(
  { id: 'process-first-order', retries: 3 },
  { event: 'automation/first_order' },
  async ({ event, step }) => {
    const { shopId, customerId, eventTimestamp } = event.data as {
      shopId: string
      customerId: string
      shopifyCustomerId: string
      eventTimestamp: string
    }

    console.log(`[pipeline] processFirstOrder: shopId=${shopId} customerId=${customerId}`)

    const automations = await step.run('fetch-automations', async () => {
      const results = await fetchEnabledAutomationsByTrigger(shopId, 'first_order')
      console.log(`[pipeline] processFirstOrder: found ${results.length} enabled first_order automations for shopId=${shopId}`)
      if (results.length === 0) {
        console.warn(`[pipeline] processFirstOrder: NO enabled automations found — email will NOT be sent. Check: 1) automations table has rows with triggerType='first_order' 2) enabled=true 3) shopId matches '${shopId}'`)
      } else {
        results.forEach((a) => console.log(`[pipeline]   automation: id=${a.id} name=${a.name} enabled=${a.enabled} template=${a.emailTemplateId}`))
      }
      return results
    })

    for (const automation of automations) {
      if (automation.delayValue && automation.delayUnit) {
        const sleepFor = `${automation.delayValue}${automation.delayUnit === 'hours' ? 'h' : 'd'}`
        await step.sleep(`delay-${automation.id}`, sleepFor)
      }
      await step.run(`execute-${automation.id}`, async () => {
        // [pipeline] executeEmailAction: shopId=${shopId} customerId=${customerId} template=${automation.emailTemplateId ?? 'welcome'}
        console.log(`[pipeline] processFirstOrder: executing automation=${automation.id} template=${automation.emailTemplateId ?? 'welcome'} for customer=${customerId}`)
        await executeEmailAction({
          shopId,
          customerId,
          automationId: automation.id,
          emailTemplateId: automation.emailTemplateId ?? 'welcome',
          eventTimestamp,
        })
        await updateAutomationLastRun(automation.id, new Date())
      })
    }
  }
)

// ─── Function 7: processSegmentChange ────────────────────────────────────────

/**
 * Triggered by 'rfm/segment.changed' event, emitted by dailyRfmRecalculation
 * when a customer's segment label changes.
 *
 * For each enabled segment_change automation:
 * - Only fires when transitioning TO the configured segment (exact match on toSegment)
 * - No delay (delayValue is null for VIP flow)
 * - Sends the email template
 * - If actionConfig.alsoAddTag exists, adds the tag to Shopify (best-effort)
 *
 * CRITICAL: eventTimestamp is read from event.data — NOT generated with new Date().
 * On Inngest retry, a locally-generated timestamp would produce a new idempotency key,
 * allowing duplicate sends. The emitter generates a stable timestamp for the whole run.
 */
export const processSegmentChange = inngest.createFunction(
  { id: 'process-segment-change', retries: 3 },
  { event: 'rfm/segment.changed' },
  async ({ event, step }) => {
    const { shopId, customerId, newSegment, eventTimestamp } = event.data as {
      shopId: string
      customerId: string
      oldSegment: string | null
      newSegment: string | null
      eventTimestamp: string
    }
    // eventTimestamp comes from event.data — do NOT generate with new Date() here

    console.log(`[pipeline] processSegmentChange: shopId=${shopId} customerId=${customerId} newSegment=${newSegment}`)

    const automations = await step.run('fetch-automations', async () => {
      const results = await fetchEnabledAutomationsByTrigger(shopId, 'segment_change')
      console.log(`[pipeline] processSegmentChange: found ${results.length} enabled segment_change automations for shopId=${shopId}`)
      if (results.length === 0) {
        console.warn(`[pipeline] processSegmentChange: NO enabled automations found — email will NOT be sent`)
      }
      return results
    })

    for (const automation of automations) {
      const config = automation.triggerConfig as { toSegment?: string } | null
      if (config?.toSegment !== newSegment) continue

      await step.run(`execute-${automation.id}`, async () => {
        // [pipeline] processSegmentChange: executing automation=${automation.id} template=${automation.emailTemplateId ?? 'vip'} for customer=${customerId} newSegment=${newSegment}
        console.log(`[pipeline] processSegmentChange: executing automation=${automation.id} for customer=${customerId} newSegment=${newSegment}`)
        await executeEmailAction({
          shopId,
          customerId,
          automationId: automation.id,
          emailTemplateId: automation.emailTemplateId ?? 'vip',
          eventTimestamp,
        })

        const actionConfig = automation.actionConfig as { alsoAddTag?: string } | null
        if (actionConfig?.alsoAddTag) {
          const customer = await getCustomerByInternalId(shopId, customerId)
          if (customer?.shopifyId) {
            await executeTagAction(shopId, customer.shopifyId, actionConfig.alsoAddTag, 'add')
          }
        }

        await updateAutomationLastRun(automation.id, new Date())
      })
    }
  }
)

// ─── Function 8: processCartAbandoned ────────────────────────────────────────

/**
 * Triggered by 'automation/cart_abandoned' event, emitted from the Shopify
 * checkouts/create webhook (Phase 6 concern, handled here proactively).
 *
 * For each enabled cart_abandoned automation:
 * 1. Waits for the configured delay (e.g. 2h for Abandoned Cart Recovery)
 * 2. Checks if the customer placed an order AFTER eventTimestamp
 * 3. If order found → cancel (customer already converted)
 * 4. If no order → send the email template
 */
export const processCartAbandoned = inngest.createFunction(
  { id: 'process-cart-abandoned', retries: 3 },
  { event: 'automation/cart_abandoned' },
  async ({ event, step }) => {
    const { shopId, customerId, eventTimestamp } = event.data as {
      shopId: string
      customerId: string
      shopifyCustomerId: string
      cartToken: string
      eventTimestamp: string
    }

    console.log(`[pipeline] processCartAbandoned: shopId=${shopId} customerId=${customerId}`)

    const automations = await step.run('fetch-automations', async () => {
      const results = await fetchEnabledAutomationsByTrigger(shopId, 'cart_abandoned')
      console.log(`[pipeline] processCartAbandoned: found ${results.length} enabled cart_abandoned automations for shopId=${shopId}`)
      if (results.length === 0) {
        console.warn(`[pipeline] processCartAbandoned: NO enabled automations found — email will NOT be sent`)
      }
      return results
    })

    for (const automation of automations) {
      if (automation.delayValue && automation.delayUnit) {
        const sleepFor = `${automation.delayValue}${automation.delayUnit === 'hours' ? 'h' : 'd'}`
        await step.sleep(`delay-${automation.id}`, sleepFor)
      }

      await step.run(`check-and-send-${automation.id}`, async () => {
        // Cancel if customer placed an order during the delay window
        const [orderSinceAbandonment] = await db
          .select({ id: ordersTable.id })
          .from(ordersTable)
          .where(
            and(
              eq(ordersTable.customerId, customerId),
              gte(ordersTable.shopifyCreatedAt, new Date(eventTimestamp)),
              eq(ordersTable.isHistorical, false)
            )
          )
          .limit(1)

        if (orderSinceAbandonment) {
          console.log(
            `[automation] Cart recovery cancelled — order placed for customer ${customerId}`
          )
          return
        }

        // [pipeline] processCartAbandoned: executing automation=${automation.id} template=${automation.emailTemplateId ?? 'abandoned-cart'} for customer=${customerId}
        console.log(`[pipeline] processCartAbandoned: executing automation=${automation.id} for customer=${customerId}`)
        await executeEmailAction({
          shopId,
          customerId,
          automationId: automation.id,
          emailTemplateId: automation.emailTemplateId ?? 'abandoned-cart',
          eventTimestamp,
        })
        await updateAutomationLastRun(automation.id, new Date())
      })
    }
  }
)

// ─── Function 9: checkDaysSinceOrder ──────────────────────────────────────────

/**
 * Daily cron at 3 AM UTC (after the 2 AM RFM recalculation).
 * Scans all active customers and fires repurchase and win-back emails for eligible ones.
 *
 * For each days_since_order automation:
 * 1. Reads triggerConfig.days and triggerConfig.segments
 * 2. Queries customers whose lastOrderAt <= cutoffDate (i.e. days ago)
 * 3. Filters by segment using evaluateSegmentFilter
 * 4. Guards against duplicate sends via getRecentMessageLog before each executeEmailAction
 * 5. Updates automation lastRunAt after all customers are processed
 *
 * NOTE: shopId comes from getShopId() — NOT event.data (cron triggers have no data object).
 *
 * [pipeline] days_since_order cron path AUDITED:
 * - fetchEnabledAutomationsByTrigger(shopId, 'days_since_order') returns both preset automations:
 *   "Repurchase Prompt" (days=30, segments=['loyal','new']) and
 *   "Win-Back Campaign" (days=90, segments=['at_risk','hibernating'])
 * - Each automation's triggerConfig.days is used to compute the cutoffDate correctly
 * - Segment filter applied inline (avoids JsonifyObject type incompatibility from step.run)
 * - Duplicate-send guard: getRecentMessageLog checked per customer before executeEmailAction
 * - executeEmailAction called directly → sendMarketingEmail → Resend API → message_logs insert
 * - updateAutomationLastRun called after all customers processed for each automation
 * - Cron wiring: { cron: '0 3 * * *' } fires after dailyRfmRecalculation { cron: '0 2 * * *' }
 * - This path is CONFIRMED CORRECT. The action execution path is also exercised
 *   in the test-trigger endpoint (src/app/api/automations/test-trigger/route.ts).
 */
export const checkDaysSinceOrder = inngest.createFunction(
  {
    id: 'check-days-since-order',
    retries: 2,
  },
  { cron: '0 3 * * *' }, // 3 AM UTC daily
  async ({ step }) => {
    const shopId = getShopId()

    const automationList = await step.run('fetch-automations', async () =>
      fetchEnabledAutomationsByTrigger(shopId, 'days_since_order')
    )

    for (const automation of automationList) {
      await step.run(`scan-customers-${automation.id}`, async () => {
        const config = automation.triggerConfig as { days?: number; segments?: string[] } | null
        const days = config?.days ?? 30
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        // dedupeWindowStart == cutoffDate: skip customers already sent this automation
        // within the past `days` days so we don't resend every cron run until they order.
        const dedupeWindowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const eligibleCustomers = await db
          .select({
            id: customersTable.id,
            lastOrderAt: customersTable.lastOrderAt,
            segment: customersTable.segment,
            shopifyId: customersTable.shopifyId,
          })
          .from(customersTable)
          .where(
            and(
              eq(customersTable.shopId, shopId),
              lte(customersTable.lastOrderAt, cutoffDate),
              isNotNull(customersTable.lastOrderAt),
              isNull(customersTable.deletedAt)
            )
          )

        let emailCount = 0

        for (const customer of eligibleCustomers) {
          // Apply segment filter from triggerConfig.segments (inline — avoids JsonifyObject type issue)
          const segmentList = config?.segments
          if (segmentList && segmentList.length > 0) {
            if (!customer.segment || !segmentList.includes(customer.segment)) {
              continue
            }
          }

          // Duplicate-send guard: skip if already sent within the dedupe window
          const alreadySent = await getRecentMessageLog(
            customer.id,
            automation.id,
            dedupeWindowStart
          )
          if (alreadySent) {
            console.log(
              `[automation] Skipping customer ${customer.id} — already sent automation ${automation.id} within window`
            )
            continue
          }

          await executeEmailAction({
            shopId,
            customerId: customer.id,
            automationId: automation.id,
            emailTemplateId: automation.emailTemplateId ?? 'repurchase',
            eventTimestamp: new Date().toISOString(),
          })
          emailCount++
        }

        await updateAutomationLastRun(automation.id, new Date())
        console.log(
          `[automation] checkDaysSinceOrder: automation ${automation.id} — ${emailCount} emails attempted`
        )
      })
    }
  }
)

// ─── Export functions array ────────────────────────────────────────────────────

// 9 functions: processShopifyWebhook, processShopifyWebhookFailure (dead-letter),
// scheduledSync, dailyRfmRecalculation, processResendWebhook,
// processFirstOrder, processSegmentChange, processCartAbandoned, checkDaysSinceOrder
export const functions: InngestFunction.Like[] = [
  processShopifyWebhook,
  processShopifyWebhookFailure,
  scheduledSync,
  dailyRfmRecalculation,
  processResendWebhook,
  processFirstOrder,
  processSegmentChange,
  processCartAbandoned,
  checkDaysSinceOrder,
]

// Suppress unused import warning for fetchAndUpsertCustomer/fetchAndUpsertOrder
// These are exported from sync.ts for direct use in webhook handler extensions
void fetchAndUpsertCustomer
void fetchAndUpsertOrder
