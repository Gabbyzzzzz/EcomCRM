import { shopifyClient } from '@/lib/shopify/client'
import { processFullSyncResults } from '@/lib/shopify/sync'
import { updateSyncLog } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { syncLogs } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { env } from '@/lib/env'

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

interface BulkOperationStatusResult {
  currentBulkOperation: {
    id: string
    status: string
    errorCode: string | null
    objectCount: string
    url: string | null
  } | null
}

/**
 * POST /api/sync/process
 *
 * Dev/recovery endpoint: polls Shopify for the current bulk operation status
 * and, if COMPLETED, finds the matching syncLog and processes the JSONL directly —
 * bypassing the webhook+Inngest path.
 *
 * Useful when the Inngest dev server isn't running or the webhook wasn't delivered.
 */
export async function POST(): Promise<Response> {
  const shopId = getShopId()

  // 1. Find the running syncLog for this shop
  const [syncLog] = await db
    .select()
    .from(syncLogs)
    .where(and(eq(syncLogs.shopId, shopId), eq(syncLogs.status, 'running')))
    .orderBy(desc(syncLogs.startedAt))
    .limit(1)

  if (!syncLog) {
    return Response.json({ error: 'No running sync found' }, { status: 404 })
  }

  if (!syncLog.bulkOperationId) {
    return Response.json({ error: 'Running syncLog has no bulkOperationId' }, { status: 400 })
  }

  // 2. Check the Shopify bulk operation status
  const result = await shopifyClient.query<BulkOperationStatusResult>(`
    {
      currentBulkOperation {
        id
        status
        errorCode
        objectCount
        url
      }
    }
  `)

  const bulkOp = result.currentBulkOperation

  if (!bulkOp) {
    return Response.json({ error: 'No current bulk operation found on Shopify' }, { status: 404 })
  }

  if (bulkOp.id !== syncLog.bulkOperationId) {
    return Response.json({
      error: 'Shopify bulk operation ID does not match the running syncLog',
      shopifyId: bulkOp.id,
      syncLogId: syncLog.bulkOperationId,
    }, { status: 409 })
  }

  if (bulkOp.status !== 'COMPLETED') {
    return Response.json({
      message: `Bulk operation not ready yet (status: ${bulkOp.status})`,
      objectCount: bulkOp.objectCount,
    })
  }

  if (!bulkOp.url) {
    await updateSyncLog(syncLog.id, {
      status: 'failed',
      errorMessage: 'Bulk operation COMPLETED but Shopify returned no URL',
      completedAt: new Date(),
    })
    return Response.json({ error: 'Bulk operation has no JSONL URL' }, { status: 502 })
  }

  // 3. Process the JSONL directly
  await processFullSyncResults(
    syncLog.id,
    shopId,
    bulkOp.url,
    syncLog.startedAt,
    syncLog.cursor ?? undefined
  )

  return Response.json({
    message: 'Sync processed successfully',
    syncLogId: syncLog.id,
    objectCount: bulkOp.objectCount,
  })
}
