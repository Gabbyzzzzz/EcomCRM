import { db } from '@/lib/db'
import { customers, orders, syncLogs, webhookDeliveries } from './schema'
import { eq, and, desc, isNotNull, lte, or, isNull } from 'drizzle-orm'
import Decimal from 'decimal.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerUpsertData {
  shopifyId: string
  name?: string | null
  email?: string | null
  phone?: string | null
  tags?: string[] | null
  totalSpent?: string | null       // raw amount string from Shopify
  orderCount?: number | null
  avgOrderValue?: string | null    // raw amount string from Shopify
  firstOrderAt?: Date | null
  lastOrderAt?: Date | null
  shopifyUpdatedAt?: Date | null
}

export interface OrderUpsertData {
  shopifyId: string
  customerId?: string | null       // internal UUID from customers table
  totalPrice?: string | null       // raw amount string from Shopify
  lineItems?: unknown | null
  financialStatus?: string | null
  shopifyCreatedAt?: Date | null
  shopifyUpdatedAt?: Date | null
}

// ─── Customer queries ─────────────────────────────────────────────────────────

/**
 * Upsert a customer on (shopId, shopifyId).
 *
 * Shopify-owned fields are always overwritten.
 * CRM fields (rfmR, rfmF, rfmM, segment, lifecycleStage) are preserved on conflict.
 * Last-write-wins: only updates if stored shopifyUpdatedAt is NULL or <= incoming value.
 *
 * Money values: always converted via Decimal — never parseFloat (SHOP-07).
 */
export async function upsertCustomer(shopId: string, data: CustomerUpsertData) {
  const totalSpent =
    data.totalSpent != null
      ? new Decimal(data.totalSpent).toString()
      : undefined

  const avgOrderValue =
    data.avgOrderValue != null
      ? new Decimal(data.avgOrderValue).toString()
      : undefined

  const [row] = await db
    .insert(customers)
    .values({
      shopId,
      shopifyId: data.shopifyId,
      name: data.name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      tags: data.tags ?? null,
      totalSpent: totalSpent ?? null,
      orderCount: data.orderCount ?? 0,
      avgOrderValue: avgOrderValue ?? null,
      firstOrderAt: data.firstOrderAt ?? null,
      lastOrderAt: data.lastOrderAt ?? null,
      shopifyUpdatedAt: data.shopifyUpdatedAt ?? null,
    })
    .onConflictDoUpdate({
      target: [customers.shopId, customers.shopifyId],
      // Preserve CRM fields (rfmR, rfmF, rfmM, segment, lifecycleStage) — only overwrite Shopify-owned columns.
      // Last-write-wins: skip update if incoming updatedAt is older than stored value.
      set: {
        name: data.name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        tags: data.tags ?? null,
        totalSpent: totalSpent ?? null,
        orderCount: data.orderCount ?? 0,
        avgOrderValue: avgOrderValue ?? null,
        firstOrderAt: data.firstOrderAt ?? null,
        lastOrderAt: data.lastOrderAt ?? null,
        shopifyUpdatedAt: data.shopifyUpdatedAt ?? null,
      },
      // Only apply update if stored shopifyUpdatedAt is NULL (never set) or <= incoming value.
      // This prevents older webhook replays from overwriting more recent data.
      setWhere: data.shopifyUpdatedAt
        ? or(
            isNull(customers.shopifyUpdatedAt),
            lte(customers.shopifyUpdatedAt, data.shopifyUpdatedAt)
          )
        : undefined,
    })
    .returning()

  return row
}

/**
 * Soft-delete a customer by setting deletedAt = now().
 * Triggered by customers/delete webhooks.
 */
export async function softDeleteCustomer(shopId: string, shopifyId: string) {
  await db
    .update(customers)
    .set({ deletedAt: new Date() })
    .where(and(eq(customers.shopId, shopId), eq(customers.shopifyId, shopifyId)))
}

// ─── Order queries ─────────────────────────────────────────────────────────────

/**
 * Upsert an order on (shopId, shopifyId).
 *
 * isHistorical: true for bulk-synced orders predating syncStartedAt, false for realtime webhooks.
 * Money values: always converted via Decimal — never parseFloat (SHOP-07).
 * Last-write-wins: only updates if stored shopifyUpdatedAt is NULL or <= incoming value.
 */
export async function upsertOrder(
  shopId: string,
  data: OrderUpsertData,
  isHistorical: boolean
) {
  const totalPrice =
    data.totalPrice != null
      ? new Decimal(data.totalPrice).toString()
      : undefined

  const financialStatus = data.financialStatus as
    | 'pending'
    | 'authorized'
    | 'paid'
    | 'refunded'
    | 'voided'
    | null
    | undefined

  const [row] = await db
    .insert(orders)
    .values({
      shopId,
      shopifyId: data.shopifyId,
      customerId: data.customerId ?? null,
      totalPrice: totalPrice ?? null,
      lineItems: data.lineItems ?? null,
      financialStatus: financialStatus ?? null,
      isHistorical,
      shopifyCreatedAt: data.shopifyCreatedAt ?? null,
      shopifyUpdatedAt: data.shopifyUpdatedAt ?? null,
    })
    .onConflictDoUpdate({
      target: [orders.shopId, orders.shopifyId],
      set: {
        customerId: data.customerId ?? null,
        totalPrice: totalPrice ?? null,
        lineItems: data.lineItems ?? null,
        financialStatus: financialStatus ?? null,
        isHistorical,
        shopifyUpdatedAt: data.shopifyUpdatedAt ?? null,
      },
      setWhere: data.shopifyUpdatedAt
        ? or(
            isNull(orders.shopifyUpdatedAt),
            lte(orders.shopifyUpdatedAt, data.shopifyUpdatedAt)
          )
        : undefined,
    })
    .returning()

  return row
}

// ─── Sync log queries ─────────────────────────────────────────────────────────

/**
 * Create a new sync log entry with status 'pending'.
 * Returns the created row (including auto-generated id).
 */
export async function createSyncLog(
  shopId: string,
  type: 'full' | 'incremental'
) {
  const [row] = await db
    .insert(syncLogs)
    .values({
      shopId,
      type,
      status: 'pending',
    })
    .returning()

  return row
}

/**
 * Update fields on a syncLog by id.
 * Used to track progress, store cursor checkpoints, and record completion.
 */
export async function updateSyncLog(
  id: string,
  updates: Partial<{
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    completedAt: Date
    customersCount: number
    ordersCount: number
    errorMessage: string
    cursor: string
    bulkOperationId: string
  }>
) {
  await db.update(syncLogs).set(updates).where(eq(syncLogs.id, id))
}

/**
 * Get the most recent syncLog for a shop, ordered by startedAt desc.
 */
export async function getLatestSyncLog(shopId: string) {
  const [row] = await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.shopId, shopId))
    .orderBy(desc(syncLogs.startedAt))
    .limit(1)

  return row ?? null
}

/**
 * Find the most recent failed syncLog with a non-null cursor for this shop.
 * Used by startFullSync to resume from checkpoint rather than restarting from scratch.
 */
export async function getFailedSyncWithCursor(shopId: string) {
  const [row] = await db
    .select()
    .from(syncLogs)
    .where(
      and(
        eq(syncLogs.shopId, shopId),
        eq(syncLogs.status, 'failed'),
        isNotNull(syncLogs.cursor)
      )
    )
    .orderBy(desc(syncLogs.startedAt))
    .limit(1)

  return row ?? null
}

// ─── Webhook delivery / idempotency queries ───────────────────────────────────

/**
 * Check if a webhook with this id has already been processed for this shop.
 * Returns true = already processed (caller should skip).
 */
export async function checkWebhookIdempotency(
  shopId: string,
  webhookId: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.shopId, shopId),
        eq(webhookDeliveries.webhookId, webhookId)
      )
    )
    .limit(1)

  return existing != null
}

/**
 * Record a webhook delivery for idempotency tracking.
 * On conflict (shopId, webhookId) does nothing — safe to call multiple times.
 */
export async function recordWebhookDelivery(
  shopId: string,
  webhookId: string,
  topic: string,
  status: string = 'processed'
) {
  await db
    .insert(webhookDeliveries)
    .values({
      shopId,
      webhookId,
      topic,
      status,
    })
    .onConflictDoNothing()
}

/**
 * Updates an existing webhookDeliveries row to a new status.
 * Used by the onFailure dead-letter handler where the row already exists as 'processing'.
 * Unlike recordWebhookDelivery (which uses onConflictDoNothing), this does a plain UPDATE.
 */
export async function updateWebhookDeliveryStatus(
  shopId: string,
  webhookId: string,
  status: 'processing' | 'processed' | 'failed' | 'dead_letter'
): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({ status })
    .where(
      and(
        eq(webhookDeliveries.shopId, shopId),
        eq(webhookDeliveries.webhookId, webhookId)
      )
    )
}
