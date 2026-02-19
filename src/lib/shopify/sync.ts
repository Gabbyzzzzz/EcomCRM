import { shopifyClient } from './client'
import {
  BULK_CUSTOMERS_QUERY,
  BULK_ORDERS_QUERY,
  SINGLE_CUSTOMER_QUERY,
  SINGLE_ORDER_QUERY,
} from './queries'
import type { ShopifyCustomer, ShopifyOrder } from './types'
import {
  createSyncLog,
  updateSyncLog,
  upsertCustomer,
  upsertOrder,
  getLatestSyncLog,
  getFailedSyncWithCursor,
} from '@/lib/db/queries'
import Decimal from 'decimal.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKPOINT_BATCH_SIZE = 100 // save cursor to DB every N records

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkOperationRunResult {
  bulkOperationRunQuery: {
    bulkOperation: {
      id: string
      status: string
    } | null
    userErrors: Array<{
      field: string[]
      message: string
    }>
  }
}

interface GetCustomerResult {
  customer: ShopifyCustomer | null
}

interface GetOrderResult {
  order: ShopifyOrder | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a full name from firstName/lastName, falling back to email.
 */
function buildName(
  firstName: string | null,
  lastName: string | null,
  email: string | null
): string | null {
  const parts = [firstName, lastName].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return email ?? null
}

/**
 * Map a raw Shopify JSONL line (customer) into upsertCustomer args.
 * Money fields always go through Decimal (SHOP-07).
 */
function mapCustomerLine(raw: ShopifyCustomer) {
  // amountSpent.amount is a string from Shopify — never parseFloat
  const totalSpent = new Decimal(raw.amountSpent?.amount ?? '0').toString()

  // numberOfOrders is an UnsignedInt64 serialized as a string
  const orderCount = parseInt(raw.numberOfOrders ?? '0', 10)
  const avgOrderValue =
    orderCount > 0
      ? new Decimal(totalSpent).div(orderCount).toFixed(4)
      : new Decimal('0').toFixed(4)

  return {
    shopifyId: raw.id,
    name: buildName(raw.firstName, raw.lastName, raw.email),
    email: raw.email,
    phone: raw.phone,
    tags: raw.tags,
    totalSpent,
    orderCount,
    avgOrderValue,
    firstOrderAt: null, // not available in bulk export; populated incrementally
    lastOrderAt: null,
    shopifyUpdatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
  }
}

/**
 * Map a raw Shopify JSONL line (order) into upsertOrder args.
 * Money fields always go through Decimal (SHOP-07).
 */
function mapOrderLine(raw: ShopifyOrder) {
  // totalPriceSet.shopMoney.amount is a string from Shopify — never parseFloat
  const totalPrice = new Decimal(
    raw.totalPriceSet?.shopMoney?.amount ?? '0'
  ).toString()

  // Extract line items for jsonb storage
  const lineItems = raw.lineItems?.edges?.map((e) => ({
    title: e.node.title,
    quantity: e.node.quantity,
    // variant.price is a Money scalar (plain decimal string)
    price: e.node.variant?.price
      ? new Decimal(e.node.variant.price).toString()
      : null,
  })) ?? []

  return {
    shopifyId: raw.id,
    customerId: null as string | null, // resolved after customer upsert
    shopifyCustomerId: raw.customer?.id ?? null, // Shopify GID for linking
    totalPrice,
    lineItems,
    financialStatus: raw.displayFinancialStatus?.toLowerCase() ?? null,
    shopifyCreatedAt: raw.createdAt ? new Date(raw.createdAt) : null,
    shopifyUpdatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
  }
}

// ─── Full sync: start ─────────────────────────────────────────────────────────

/**
 * Start a full bulk sync.
 *
 * Resume logic (checkpoint-based):
 * 1. Check for a failed syncLog with a non-null cursor for this shop.
 * 2. If found: resume from that checkpoint (update status back to 'running').
 * 3. If not found: start fresh — run bulkOperationRunQuery and store the operation id.
 *
 * Completion is handled asynchronously via the bulk_operations/finish webhook (SHOP-03).
 */
export async function startFullSync(
  shopId: string
): Promise<{ syncLogId: string; bulkOperationId: string | null; resumed: boolean }> {
  // ── Step 1: Check for a resumable failed sync ──────────────────────────────
  const failedSync = await getFailedSyncWithCursor(shopId)

  if (failedSync) {
    console.log(
      `[sync] Resuming failed sync ${failedSync.id} from cursor ${failedSync.cursor}`
    )
    await updateSyncLog(failedSync.id, { status: 'running' })
    return {
      syncLogId: failedSync.id,
      bulkOperationId: failedSync.bulkOperationId,
      resumed: true,
    }
  }

  // ── Step 2: Start a fresh bulk operation ──────────────────────────────────
  const syncLog = await createSyncLog(shopId, 'full')
  await updateSyncLog(syncLog.id, { status: 'running' })

  // Kick off the bulk customer export. Shopify will call our
  // bulk_operations/finish webhook when the JSONL file is ready.
  const result = await shopifyClient.query<BulkOperationRunResult>(
    BULK_CUSTOMERS_QUERY
  )

  const bulkOperation = result.bulkOperationRunQuery.bulkOperation

  if (!bulkOperation) {
    const errors = result.bulkOperationRunQuery.userErrors
      .map((e) => e.message)
      .join(', ')
    await updateSyncLog(syncLog.id, {
      status: 'failed',
      errorMessage: `bulkOperationRunQuery failed: ${errors}`,
    })
    throw new Error(`Failed to start bulk operation: ${errors}`)
  }

  await updateSyncLog(syncLog.id, {
    bulkOperationId: bulkOperation.id,
  })

  console.log(
    `[sync] Started bulk operation ${bulkOperation.id} for shop ${shopId}, syncLog ${syncLog.id}`
  )

  return {
    syncLogId: syncLog.id,
    bulkOperationId: bulkOperation.id,
    resumed: false,
  }
}

// ─── Full sync: process JSONL results ─────────────────────────────────────────

/**
 * Process the JSONL file from a completed bulk operation.
 *
 * Called from the Inngest handler for bulk_operations/finish webhook.
 *
 * Checkpoint-based resume (SHOP-03):
 * - After every CHECKPOINT_BATCH_SIZE records, stores the last-processed GID
 *   as the cursor in syncLog.
 * - If resumeCursor is provided (from a previously failed run), skips all
 *   lines until a line with a GID >= the cursor is reached.
 * - On error: saves error + current cursor to syncLog (status='failed') so
 *   the next startFullSync call can resume from this point.
 *
 * SHOP-08: Orders created before syncStartedAt are marked isHistorical=true.
 * SHOP-07: All money values go through Decimal — never parseFloat.
 */
export async function processFullSyncResults(
  syncLogId: string,
  shopId: string,
  jsonlUrl: string,
  syncStartedAt: Date,
  resumeCursor?: string
): Promise<void> {
  let customersCount = 0
  let ordersCount = 0
  let lineNumber = 0
  let currentCursor: string | undefined

  // Determine if we are in skip-mode (fast-forward to resume position)
  let skipping = resumeCursor != null

  try {
    // Fetch the JSONL file Shopify made available
    const response = await fetch(jsonlUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch JSONL file: ${response.status} ${response.statusText}`
      )
    }

    if (!response.body) {
      throw new Error('No body in JSONL response')
    }

    // Stream the response line by line using a TextDecoder
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining content in the buffer
        if (buffer.trim()) {
          await processJsonlLine(buffer.trim())
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Split on newlines and process each complete line
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) segment in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        lineNumber++

        // ── Skip-mode: fast-forward to resume cursor ───────────────────────
        if (skipping) {
          // Parse just the id to check cursor position
          let parsed: { id?: string } | undefined
          try {
            parsed = JSON.parse(trimmed) as { id?: string }
          } catch {
            // Skip malformed lines too
            continue
          }
          if (parsed?.id === resumeCursor) {
            // Found the cursor line — stop skipping (process this line normally)
            skipping = false
          } else {
            continue // still skipping
          }
        }

        await processJsonlLine(trimmed)
      }
    }

    // Final update — mark as completed
    await updateSyncLog(syncLogId, {
      status: 'completed',
      completedAt: new Date(),
      customersCount,
      ordersCount,
      cursor: currentCursor,
    })

    console.log(
      `[sync] Completed syncLog ${syncLogId}: ${customersCount} customers, ${ordersCount} orders`
    )
  } catch (error) {
    // Save error + current cursor so next run can resume from here
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error(`[sync] Failed syncLog ${syncLogId}:`, error)

    await updateSyncLog(syncLogId, {
      status: 'failed',
      errorMessage,
      cursor: currentCursor,
      customersCount,
      ordersCount,
    })

    throw error
  }

  // ── Inner: process a single JSONL line ────────────────────────────────────
  async function processJsonlLine(line: string) {
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      console.warn(`[sync] Skipping malformed JSONL line ${lineNumber}`)
      return
    }

    const record = parsed as Record<string, unknown>

    // Shopify bulk JSONL: each line has an "id" field in GID format
    // e.g. "gid://shopify/Customer/123" or "gid://shopify/Order/456"
    const id = record.id as string | undefined
    if (!id) return

    if (id.includes('/Customer/')) {
      const customer = record as unknown as ShopifyCustomer
      const data = mapCustomerLine(customer)
      await upsertCustomer(shopId, data)
      customersCount++
      currentCursor = id
    } else if (id.includes('/Order/')) {
      const order = record as unknown as ShopifyOrder
      const data = mapOrderLine(order)
      // SHOP-08: isHistorical = created before sync started
      const createdAt = data.shopifyCreatedAt
      const isHistorical = createdAt != null && createdAt < syncStartedAt
      await upsertOrder(
        shopId,
        {
          shopifyId: data.shopifyId,
          customerId: data.customerId,
          totalPrice: data.totalPrice,
          lineItems: data.lineItems,
          financialStatus: data.financialStatus,
          shopifyCreatedAt: data.shopifyCreatedAt,
          shopifyUpdatedAt: data.shopifyUpdatedAt,
        },
        isHistorical
      )
      ordersCount++
      currentCursor = id
    }

    // ── Checkpoint: persist cursor every CHECKPOINT_BATCH_SIZE records ──────
    const totalProcessed = customersCount + ordersCount
    if (totalProcessed > 0 && totalProcessed % CHECKPOINT_BATCH_SIZE === 0) {
      await updateSyncLog(syncLogId, {
        customersCount,
        ordersCount,
        cursor: currentCursor,
      })
      console.log(
        `[sync] Checkpoint saved at cursor ${currentCursor} (${totalProcessed} records)`
      )
    }
  }
}

// ─── Incremental sync ─────────────────────────────────────────────────────────

/**
 * Incremental sync: fetch customers and orders updated since the last completed sync.
 *
 * Uses the `updated_at:>` filter on the GraphQL query to only pull changed records.
 * Creates a syncLog of type 'incremental' and marks it completed when done.
 *
 * This runs on a schedule (every 6 hours) as a fallback in case webhooks are missed.
 */
export async function startIncrementalSync(shopId: string): Promise<void> {
  const syncLog = await createSyncLog(shopId, 'incremental')
  await updateSyncLog(syncLog.id, { status: 'running' })

  let customersCount = 0
  let ordersCount = 0

  try {
    // Get the timestamp of the last successful sync to use as the lower bound
    const latestSync = await getLatestSyncLog(shopId)
    const since = latestSync?.completedAt ?? new Date(0) // fallback: epoch (all time)

    const sinceISO = since.toISOString()
    console.log(`[sync] Incremental sync for shop ${shopId} since ${sinceISO}`)

    // ── Fetch updated customers ───────────────────────────────────────────────
    // NOTE: SINGLE_CUSTOMER_QUERY fetches one customer by id.
    // Incremental sync needs a list query with updated_at filter.
    const incrementalCustomersQuery = `
      query IncrementalCustomers($query: String!) {
        customers(query: $query, first: 250) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              numberOfOrders
              amountSpent {
                amount
                currencyCode
              }
              tags
              createdAt
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    // Paginate through all updated customers
    let hasNextPage = true
    let cursor: string | null = null

    while (hasNextPage) {
      const variables: Record<string, unknown> = {
        query: `updated_at:>'${sinceISO}'`,
      }
      if (cursor) variables.after = cursor

      type CustomersPage = {
        customers: {
          edges: Array<{ node: ShopifyCustomer }>
          pageInfo: { hasNextPage: boolean; endCursor: string }
        }
      }

      const gqlQuery: string = cursor
        ? incrementalCustomersQuery.replace(
            'customers(query: $query, first: 250)',
            'customers(query: $query, first: 250, after: $after)'
          )
        : incrementalCustomersQuery

      const result: CustomersPage = await shopifyClient.query<CustomersPage>(gqlQuery, variables)

      const edges = result.customers.edges
      for (const { node } of edges) {
        await upsertCustomer(shopId, mapCustomerLine(node))
        customersCount++
      }

      hasNextPage = result.customers.pageInfo.hasNextPage
      cursor = result.customers.pageInfo.endCursor
    }

    // ── Fetch updated orders ──────────────────────────────────────────────────
    const incrementalOrdersQuery = `
      query IncrementalOrders($query: String!) {
        orders(query: $query, first: 250) {
          edges {
            node {
              id
              name
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      price
                    }
                  }
                }
              }
              displayFinancialStatus
              createdAt
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    hasNextPage = true
    cursor = null

    while (hasNextPage) {
      const variables: Record<string, unknown> = {
        query: `updated_at:>'${sinceISO}'`,
      }
      if (cursor) variables.after = cursor

      type OrdersPage = {
        orders: {
          edges: Array<{ node: ShopifyOrder }>
          pageInfo: { hasNextPage: boolean; endCursor: string }
        }
      }

      const ordersGqlQuery: string = cursor
        ? incrementalOrdersQuery.replace(
            'orders(query: $query, first: 250)',
            'orders(query: $query, first: 250, after: $after)'
          )
        : incrementalOrdersQuery

      const result: OrdersPage = await shopifyClient.query<OrdersPage>(ordersGqlQuery, variables)

      const edges = result.orders.edges
      for (const { node } of edges) {
        const data = mapOrderLine(node)
        // Incremental orders are always NOT historical (realtime)
        await upsertOrder(
          shopId,
          {
            shopifyId: data.shopifyId,
            customerId: data.customerId,
            totalPrice: data.totalPrice,
            lineItems: data.lineItems,
            financialStatus: data.financialStatus,
            shopifyCreatedAt: data.shopifyCreatedAt,
            shopifyUpdatedAt: data.shopifyUpdatedAt,
          },
          false
        )
        ordersCount++
      }

      hasNextPage = result.orders.pageInfo.hasNextPage
      cursor = result.orders.pageInfo.endCursor
    }

    await updateSyncLog(syncLog.id, {
      status: 'completed',
      completedAt: new Date(),
      customersCount,
      ordersCount,
    })

    console.log(
      `[sync] Incremental sync complete: ${customersCount} customers, ${ordersCount} orders`
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    await updateSyncLog(syncLog.id, {
      status: 'failed',
      errorMessage,
      customersCount,
      ordersCount,
    })
    throw error
  }
}

// ─── Single-resource fetch helpers ────────────────────────────────────────────

/**
 * Fetch and upsert a single customer by Shopify GID.
 * Used by webhook handlers for customers/create and customers/update.
 */
export async function fetchAndUpsertCustomer(
  shopId: string,
  shopifyGid: string
): Promise<void> {
  const result = await shopifyClient.query<GetCustomerResult>(
    SINGLE_CUSTOMER_QUERY,
    { id: shopifyGid }
  )

  if (!result.customer) {
    console.warn(`[sync] Customer ${shopifyGid} not found in Shopify`)
    return
  }

  await upsertCustomer(shopId, mapCustomerLine(result.customer))
}

/**
 * Fetch and upsert a single order by Shopify GID.
 * Used by webhook handlers for orders/create and orders/updated.
 * Real-time webhook orders are always non-historical.
 */
export async function fetchAndUpsertOrder(
  shopId: string,
  shopifyGid: string
): Promise<void> {
  const result = await shopifyClient.query<GetOrderResult>(
    SINGLE_ORDER_QUERY,
    { id: shopifyGid }
  )

  if (!result.order) {
    console.warn(`[sync] Order ${shopifyGid} not found in Shopify`)
    return
  }

  const data = mapOrderLine(result.order)
  await upsertOrder(
    shopId,
    {
      shopifyId: data.shopifyId,
      customerId: data.customerId,
      totalPrice: data.totalPrice,
      lineItems: data.lineItems,
      financialStatus: data.financialStatus,
      shopifyCreatedAt: data.shopifyCreatedAt,
      shopifyUpdatedAt: data.shopifyUpdatedAt,
    },
    false // realtime webhooks are never historical
  )
}
