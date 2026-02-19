import { z } from 'zod'
import { startFullSync, startIncrementalSync } from '@/lib/shopify/sync'
import { getLatestSyncLog } from '@/lib/db/queries'
import { env } from '@/lib/env'

// ─── Shop ID derivation ───────────────────────────────────────────────────────

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

// ─── Input schema ─────────────────────────────────────────────────────────────

const SyncRequestSchema = z.object({
  force: z.boolean().optional().default(false),
})

// ─── POST handler — trigger sync ──────────────────────────────────────────────

/**
 * Trigger a sync operation.
 *
 * If force=true: always run a full sync (bulkOperationRunQuery).
 * Otherwise: run an incremental sync (updated_at filter since last completed sync).
 *
 * Returns { syncLogId, status: 'started' }.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    const text = await request.text()
    body = text ? JSON.parse(text) : {}
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SyncRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { force } = parsed.data
  const shopId = getShopId()

  try {
    if (force) {
      const result = await startFullSync(shopId)
      return Response.json({
        syncLogId: result.syncLogId,
        bulkOperationId: result.bulkOperationId,
        resumed: result.resumed,
        status: 'started',
        type: 'full',
      })
    } else {
      await startIncrementalSync(shopId)
      const latestLog = await getLatestSyncLog(shopId)
      return Response.json({
        syncLogId: latestLog?.id ?? null,
        status: 'completed',
        type: 'incremental',
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    console.error('[sync] POST error:', error)
    return Response.json({ error: message }, { status: 500 })
  }
}

// ─── GET handler — sync status ────────────────────────────────────────────────

/**
 * Return the most recent sync log entry for this shop.
 * Includes status, counts, timestamps, and error info.
 */
export async function GET(): Promise<Response> {
  const shopId = getShopId()

  try {
    const log = await getLatestSyncLog(shopId)
    if (!log) {
      return Response.json({ status: 'no_sync_yet' })
    }
    return Response.json(log)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sync status'
    console.error('[sync] GET error:', error)
    return Response.json({ error: message }, { status: 500 })
  }
}
