import { db } from '@/lib/db'
import { customers, orders, syncLogs, webhookDeliveries, suppressions, automations, messageLogs, emailClicks } from './schema'
import { eq, and, desc, isNotNull, lte, or, isNull, sql, gte, inArray } from 'drizzle-orm'
import Decimal from 'decimal.js'

// ─── AutomationRow type ───────────────────────────────────────────────────────
// Inferred directly from Drizzle schema to avoid circular imports with engine.ts
type AutomationRow = typeof automations.$inferSelect

// Type for inserting an automation row (minus auto-generated fields)
type AutomationInsert = typeof automations.$inferInsert

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
  shopifyCreatedAt?: Date | null   // Shopify customer registration date
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
      shopifyCreatedAt: data.shopifyCreatedAt ?? null,
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
        shopifyCreatedAt: data.shopifyCreatedAt ?? null,
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

// ─── Suppression queries ──────────────────────────────────────────────────────

/**
 * Check if an email address is in the suppressions table for this shop.
 * Returns true = email is suppressed (caller should not send).
 */
export async function checkSuppression(
  shopId: string,
  email: string
): Promise<boolean> {
  const [existing] = await db
    .select({ id: suppressions.id })
    .from(suppressions)
    .where(
      and(eq(suppressions.shopId, shopId), eq(suppressions.email, email))
    )
    .limit(1)

  return existing != null
}

/**
 * Insert an email into the suppressions table.
 * Uses onConflictDoNothing on the (shopId, email) unique index — safe to call multiple times.
 */
export async function insertSuppression(
  shopId: string,
  email: string,
  reason: 'hard_bounce' | 'unsubscribe' | 'manual'
): Promise<void> {
  await db
    .insert(suppressions)
    .values({ shopId, email, reason })
    .onConflictDoNothing()
}

/**
 * Remove an email from the suppressions table.
 * Used for re-subscribe / undo-unsubscribe flows.
 */
export async function removeSuppression(
  shopId: string,
  email: string
): Promise<void> {
  await db
    .delete(suppressions)
    .where(
      and(eq(suppressions.shopId, shopId), eq(suppressions.email, email))
    )
}

/**
 * Set the marketing_opted_out flag on a customer row.
 * Used by the unsubscribe page and compliance flows.
 */
export async function setMarketingOptedOut(
  shopId: string,
  customerInternalId: string,
  optedOut: boolean
): Promise<void> {
  await db
    .update(customers)
    .set({ marketingOptedOut: optedOut })
    .where(
      and(eq(customers.id, customerInternalId), eq(customers.shopId, shopId))
    )
}

/**
 * Get a customer by their internal UUID.
 * Needed by the send wrapper and unsubscribe page.
 */
export async function getCustomerByInternalId(
  shopId: string,
  customerInternalId: string
) {
  const [row] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerInternalId),
        eq(customers.shopId, shopId)
      )
    )
    .limit(1)

  return row ?? null
}

/**
 * Get a customer by their email address.
 * Needed by the Resend bounce webhook to look up the customer.
 */
export async function getCustomerByEmail(shopId: string, email: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.shopId, shopId), eq(customers.email, email)))
    .limit(1)

  return row ?? null
}

// ─── Customer counter recalculation ──────────────────────────────────────────

/**
 * Recalculate a single customer's aggregate order counters from the orders table.
 *
 * Uses SQL aggregation (COUNT, SUM, MIN, MAX) — no rows are loaded into JS for arithmetic.
 * Decimal is used for money arithmetic (avgOrderValue) — never parseFloat.
 *
 * Updates: order_count, total_spent, avg_order_value, first_order_at, last_order_at.
 */
export async function updateCustomerCountersFromOrders(
  shopId: string,
  customerInternalId: string
): Promise<void> {
  interface AggRow extends Record<string, unknown> {
    order_count: string | number
    total_spent: string | null
    first_order_at: Date | string | null
    last_order_at: Date | string | null
  }

  const rows = await db.execute<AggRow>(sql`
    SELECT
      COUNT(*)                        AS order_count,
      SUM(total_price::numeric)       AS total_spent,
      MIN(shopify_created_at)         AS first_order_at,
      MAX(shopify_created_at)         AS last_order_at
    FROM ${orders}
    WHERE customer_id = ${customerInternalId}::uuid
      AND shop_id     = ${shopId}
  `)

  const agg = rows[0]
  if (!agg) return

  const orderCount = Number(agg.order_count ?? 0)
  const totalSpentDecimal =
    agg.total_spent != null ? new Decimal(agg.total_spent) : new Decimal(0)
  const avgOrderValue =
    orderCount > 0 ? totalSpentDecimal.div(orderCount).toString() : '0'

  const firstOrderAt =
    agg.first_order_at != null ? new Date(agg.first_order_at as string) : null
  const lastOrderAt =
    agg.last_order_at != null ? new Date(agg.last_order_at as string) : null

  await db
    .update(customers)
    .set({
      orderCount,
      totalSpent: totalSpentDecimal.toString(),
      avgOrderValue,
      firstOrderAt,
      lastOrderAt,
    })
    .where(
      and(
        eq(customers.id, customerInternalId),
        eq(customers.shopId, shopId)
      )
    )
}

// ─── Automation queries ───────────────────────────────────────────────────────

/**
 * Fetch all enabled automations for a shop that match the given trigger type.
 * Same query as fetchEnabledAutomationsByTrigger in engine.ts — exported for
 * direct use in Inngest functions.
 */
export async function getEnabledAutomationsByTrigger(
  shopId: string,
  triggerType: 'first_order' | 'segment_change' | 'days_since_order' | 'tag_added' | 'cart_abandoned'
): Promise<AutomationRow[]> {
  return db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.shopId, shopId),
        eq(automations.enabled, true),
        eq(automations.triggerType, triggerType)
      )
    )
}

/**
 * Upsert an automation on (shopId, name).
 * Name is the stable preset identifier. On conflict updates all non-PK fields.
 * Returns the upserted row.
 */
export async function upsertAutomation(
  shopId: string,
  data: Omit<AutomationInsert, 'id' | 'shopId' | 'createdAt'>
): Promise<AutomationRow> {
  const [row] = await db
    .insert(automations)
    .values({
      shopId,
      ...data,
    })
    .onConflictDoUpdate({
      target: [automations.shopId, automations.name],
      set: {
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        delayValue: data.delayValue,
        delayUnit: data.delayUnit,
        actionType: data.actionType,
        actionConfig: data.actionConfig,
        emailTemplateId: data.emailTemplateId,
        enabled: data.enabled,
      },
    })
    .returning()

  return row
}

/**
 * List all automations for a shop, ordered by createdAt ascending.
 */
export async function listAutomations(shopId: string): Promise<AutomationRow[]> {
  return db
    .select()
    .from(automations)
    .where(eq(automations.shopId, shopId))
    .orderBy(automations.createdAt)
}

/**
 * Enable or disable a single automation by id.
 */
export async function setAutomationEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  await db
    .update(automations)
    .set({ enabled })
    .where(eq(automations.id, id))
}

/**
 * Update lastRunAt on an automation row.
 * Called by Inngest automation functions after each successful execution.
 */
export async function updateAutomationLastRun(
  id: string,
  lastRunAt: Date
): Promise<void> {
  await db
    .update(automations)
    .set({ lastRunAt })
    .where(eq(automations.id, id))
}

// ─── Message log queries ──────────────────────────────────────────────────────

/**
 * Returns true if a 'sent' MessageLog record exists for the given
 * (customerId, automationId) pair within the window starting at sinceDate.
 * Used to prevent re-sending days_since_order emails on every cron run.
 */
export async function getRecentMessageLog(
  customerId: string,
  automationId: string,
  sinceDate: Date
): Promise<boolean> {
  const [row] = await db
    .select({ id: messageLogs.id })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.customerId, customerId),
        eq(messageLogs.automationId, automationId),
        eq(messageLogs.status, 'sent'),
        gte(messageLogs.sentAt, sinceDate)
      )
    )
    .limit(1)
  return row !== undefined
}

// ─── Dashboard query functions ─────────────────────────────────────────────────

export interface DashboardKpis {
  totalCustomers: number
  totalRevenue: string
  newCustomers30d: number
  emailsSent30d: number
}

export interface SegmentDistributionItem {
  segment: string
  count: number
}

export interface RevenueOverTimeItem {
  date: string
  revenue: string
}

export interface ChurnAlertItem {
  id: string
  name: string | null
  email: string | null
  segment: string
}

export interface RecentMessageItem {
  id: string
  customerName: string | null
  subject: string | null
  status: string
  sentAt: Date | null
}

export interface RecentOrderItem {
  id: string
  customerName: string | null
  totalPrice: string | null
  createdAt: Date | null
}

export interface RecentActivity {
  messages: RecentMessageItem[]
  orders: RecentOrderItem[]
}

/**
 * Fetch 4 KPI values for the dashboard header cards.
 * Uses a single SQL query with subqueries for efficiency.
 */
export async function getDashboardKpis(shopId: string): Promise<DashboardKpis> {
  interface KpiRow extends Record<string, unknown> {
    total_customers: string | number
    total_revenue: string | null
    new_customers_30d: string | number
    emails_sent_30d: string | number
  }

  const rows = await db.execute<KpiRow>(sql`
    SELECT
      (SELECT COUNT(*) FROM ${customers} WHERE shop_id = ${shopId} AND deleted_at IS NULL)
        AS total_customers,
      (SELECT COALESCE(SUM(total_price::numeric), 0) FROM ${orders} WHERE shop_id = ${shopId})
        AS total_revenue,
      (SELECT COUNT(*) FROM ${customers}
        WHERE shop_id = ${shopId} AND deleted_at IS NULL AND shopify_created_at >= NOW() - INTERVAL '30 days')
        AS new_customers_30d,
      (SELECT COUNT(*) FROM ${messageLogs}
        WHERE shop_id = ${shopId} AND status = 'sent' AND sent_at >= NOW() - INTERVAL '30 days')
        AS emails_sent_30d
  `)

  const row = rows[0]
  return {
    totalCustomers: Number(row?.total_customers ?? 0),
    totalRevenue: row?.total_revenue != null ? new Decimal(row.total_revenue).toString() : '0',
    newCustomers30d: Number(row?.new_customers_30d ?? 0),
    emailsSent30d: Number(row?.emails_sent_30d ?? 0),
  }
}

/**
 * Fetch the count of customers per segment for the segment distribution chart.
 */
export async function getSegmentDistribution(shopId: string): Promise<SegmentDistributionItem[]> {
  interface SegRow extends Record<string, unknown> {
    segment: string
    count: string | number
  }

  const rows = await db.execute<SegRow>(sql`
    SELECT segment, COUNT(*) AS count
    FROM ${customers}
    WHERE shop_id = ${shopId} AND deleted_at IS NULL AND segment IS NOT NULL
    GROUP BY segment
  `)

  return rows.map((r) => ({
    segment: String(r.segment),
    count: Number(r.count),
  }))
}

/**
 * Fetch daily revenue totals for the last N days for the revenue over time chart.
 */
export async function getRevenueOverTime(
  shopId: string,
  days: number = 90
): Promise<RevenueOverTimeItem[]> {
  interface RevRow extends Record<string, unknown> {
    date: Date | string
    revenue: string | null
  }

  const rows = await db.execute<RevRow>(sql`
    SELECT
      DATE(shopify_created_at) AS date,
      SUM(total_price::numeric) AS revenue
    FROM ${orders}
    WHERE shop_id = ${shopId}
      AND shopify_created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY DATE(shopify_created_at)
    ORDER BY date ASC
  `)

  return rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
    revenue: r.revenue != null ? new Decimal(r.revenue).toString() : '0',
  }))
}

/**
 * Fetch customers in churn segments (at_risk, hibernating, lost) updated recently.
 * Uses shopifyUpdatedAt as a proxy for "recently moved to churn segment" since
 * the daily RFM cron updates customers when their segment changes.
 */
export async function getChurnAlerts(
  shopId: string,
  days: number = 7
): Promise<ChurnAlertItem[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      segment: customers.segment,
    })
    .from(customers)
    .where(
      and(
        eq(customers.shopId, shopId),
        inArray(customers.segment, ['at_risk', 'hibernating', 'lost']),
        gte(customers.shopifyUpdatedAt, cutoff),
        isNull(customers.deletedAt)
      )
    )
    .orderBy(desc(customers.shopifyUpdatedAt))
    .limit(20)

  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? null,
    email: r.email ?? null,
    segment: r.segment ?? '',
  }))
}

// ─── Customer 360 profile query functions ─────────────────────────────────────

/**
 * Fetch a single customer's full row by internal UUID.
 * Returns null if the customer does not exist or does not belong to this shop.
 */
export async function getCustomerProfile(shopId: string, customerId: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.shopId, shopId)))
    .limit(1)

  return row ?? null
}

/**
 * Fetch all orders for a customer, ordered by shopifyCreatedAt descending.
 * Returns all orders — no limit applied (typically <100 per customer).
 */
export async function getCustomerOrders(shopId: string, customerId: string) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, customerId), eq(orders.shopId, shopId)))
    .orderBy(desc(orders.shopifyCreatedAt))
}

/**
 * Fetch all message logs for a customer, joined with automations for automation name.
 * Returns rows ordered by sentAt descending with selected fields.
 */
export async function getCustomerMessages(shopId: string, customerId: string) {
  return db
    .select({
      id: messageLogs.id,
      automationName: automations.name,
      channel: messageLogs.channel,
      subject: messageLogs.subject,
      status: messageLogs.status,
      sentAt: messageLogs.sentAt,
      openedAt: messageLogs.openedAt,
      clickedAt: messageLogs.clickedAt,
    })
    .from(messageLogs)
    .leftJoin(automations, eq(messageLogs.automationId, automations.id))
    .where(and(eq(messageLogs.customerId, customerId), eq(messageLogs.shopId, shopId)))
    .orderBy(desc(messageLogs.sentAt))
}

/**
 * Fetch recent message log entries and orders for the activity feed.
 * Returns both arrays separately; the caller is responsible for merging and sorting.
 */
export async function getRecentActivity(
  shopId: string,
  limit: number = 20
): Promise<RecentActivity> {
  const [messageRows, orderRows] = await Promise.all([
    db
      .select({
        id: messageLogs.id,
        customerName: customers.name,
        subject: messageLogs.subject,
        status: messageLogs.status,
        sentAt: messageLogs.sentAt,
      })
      .from(messageLogs)
      .leftJoin(customers, eq(messageLogs.customerId, customers.id))
      .where(eq(messageLogs.shopId, shopId))
      .orderBy(desc(messageLogs.sentAt))
      .limit(limit),

    db
      .select({
        id: orders.id,
        customerName: customers.name,
        totalPrice: orders.totalPrice,
        createdAt: orders.shopifyCreatedAt,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.shopId, shopId))
      .orderBy(desc(orders.shopifyCreatedAt))
      .limit(limit),
  ])

  return {
    messages: messageRows.map((r) => ({
      id: r.id,
      customerName: r.customerName ?? null,
      subject: r.subject ?? null,
      status: r.status,
      sentAt: r.sentAt ?? null,
    })),
    orders: orderRows.map((r) => ({
      id: r.id,
      customerName: r.customerName ?? null,
      totalPrice: r.totalPrice ?? null,
      createdAt: r.createdAt ?? null,
    })),
  }
}

// ─── Automation email stats query ─────────────────────────────────────────────

export interface AutomationEmailStats {
  totalSent: number
  totalOpened: number
  totalClicked: number
  openRate: number    // 0-100 percentage
  clickRate: number   // 0-100 percentage
}

/**
 * Aggregate open and click stats for a single automation.
 * Uses SQL FILTER clause for efficient single-pass aggregation.
 * Returns 0 for all metrics when no messages have been sent.
 */
export async function getAutomationEmailStats(
  shopId: string,
  automationId: string
): Promise<AutomationEmailStats> {
  interface StatsRow extends Record<string, unknown> {
    total_sent: string | number
    total_opened: string | number
    total_clicked: string | number
  }

  const rows = await db.execute<StatsRow>(sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('sent', 'opened', 'clicked', 'converted')) AS total_sent,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS total_opened,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS total_clicked
    FROM ${messageLogs}
    WHERE shop_id = ${shopId}
      AND automation_id = ${automationId}::uuid
      AND status IN ('sent', 'opened', 'clicked', 'converted')
  `)

  const row = rows[0]
  const totalSent = Number(row?.total_sent ?? 0)
  const totalOpened = Number(row?.total_opened ?? 0)
  const totalClicked = Number(row?.total_clicked ?? 0)

  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
    clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
  }
}

// ─── Email tracking query functions ────────────────────────────────────────────

/**
 * Record that a message was opened (first open only — idempotent).
 * Updates opened_at and status only when opened_at IS NULL, so re-opens are no-ops.
 * Best-effort: errors are logged but never re-thrown.
 */
export async function recordEmailOpen(messageLogId: string): Promise<void> {
  try {
    await db
      .update(messageLogs)
      .set({ openedAt: new Date(), status: 'opened' })
      .where(and(eq(messageLogs.id, messageLogId), isNull(messageLogs.openedAt)))
  } catch (err) {
    console.error('[recordEmailOpen] failed to record open', { messageLogId, err })
  }
}

/**
 * Record that a link was clicked in an email.
 * Inserts a row into email_clicks for every click (multi-click tracking).
 * Also updates clicked_at and status on the parent message_logs row (first click only — idempotent).
 * Best-effort: errors are logged but never re-thrown.
 */
export async function recordEmailClick(
  shopId: string,
  messageLogId: string,
  linkUrl: string
): Promise<void> {
  try {
    await db.insert(emailClicks).values({ shopId, messageLogId, linkUrl })
    await db
      .update(messageLogs)
      .set({ clickedAt: new Date(), status: 'clicked' })
      .where(and(eq(messageLogs.id, messageLogId), isNull(messageLogs.clickedAt)))
  } catch (err) {
    console.error('[recordEmailClick] failed to record click', { shopId, messageLogId, linkUrl, err })
  }
}
