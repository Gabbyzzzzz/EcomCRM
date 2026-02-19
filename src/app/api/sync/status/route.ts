import { getLatestSyncLog } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { syncLogs, webhookDeliveries } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { eq, desc } from 'drizzle-orm'

// ─── Shop ID derivation ───────────────────────────────────────────────────────

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncStatus {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'no_sync_yet'
  lastSyncAt: string | null
  isStale: boolean
  customersCount: number
  ordersCount: number
  deadLetterCount: number
  progress?: {
    current: number
    total: number
  }
  errorMessage?: string | null
  history?: SyncHistoryEntry[]
}

export interface SyncHistoryEntry {
  id: string
  type: string
  status: string
  startedAt: string
  completedAt: string | null
  customersCount: number
  ordersCount: number
  errorMessage: string | null
}

// ─── GET handler — sync status ────────────────────────────────────────────────

/**
 * Return the current sync status and metadata.
 *
 * Response: { status, lastSyncAt, isStale, customersCount, ordersCount, deadLetterCount, progress? }
 *
 * Query params:
 *   ?history=true  — also include the last 10 sync_logs in response
 *
 * Polling cadence (client-side):
 *   - Every 10s when idle / completed
 *   - Every 2s when status='running'
 */
export async function GET(request: Request): Promise<Response> {
  const shopId = getShopId()
  const url = new URL(request.url)
  const includeHistory = url.searchParams.get('history') === 'true'

  try {
    // Get the most recent sync log
    const latestLog = await getLatestSyncLog(shopId)

    // Count dead letter webhook deliveries
    const deadLetterRows = await db
      .select({ id: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'dead_letter'))

    const deadLetterCount = deadLetterRows.length

    // Determine stale status
    // isStale = true if no sync has ever completed, OR if the last completion was >24h ago
    const now = Date.now()
    let isStale = true
    let lastSyncAt: string | null = null

    if (latestLog) {
      if (latestLog.status === 'completed' && latestLog.completedAt) {
        lastSyncAt = latestLog.completedAt.toISOString()
        const msSinceCompletion = now - latestLog.completedAt.getTime()
        isStale = msSinceCompletion > STALE_THRESHOLD_MS
      } else if (latestLog.status === 'running') {
        // If there's an earlier completed log, use that for lastSyncAt
        // For now: isStale stays based on lack of recent completion
        isStale = true
      }
    }

    // Build status
    let status: SyncStatus['status'] = 'no_sync_yet'
    if (latestLog) {
      if (
        latestLog.status === 'running' ||
        latestLog.status === 'pending'
      ) {
        status = 'running'
      } else if (latestLog.status === 'completed') {
        status = 'completed'
      } else if (latestLog.status === 'failed') {
        status = 'failed'
      } else {
        status = 'idle'
      }
    }

    const response: SyncStatus = {
      status,
      lastSyncAt,
      isStale,
      customersCount: latestLog?.customersCount ?? 0,
      ordersCount: latestLog?.ordersCount ?? 0,
      deadLetterCount,
      errorMessage: latestLog?.errorMessage ?? null,
    }

    // Add progress info if sync is currently running
    if (status === 'running' && latestLog) {
      const current =
        (latestLog.customersCount ?? 0) + (latestLog.ordersCount ?? 0)
      // total is unknown during bulk ops — provide current as a progress indicator
      response.progress = {
        current,
        total: current, // updated as records arrive; client shows "X synced" without a denominator
      }
    }

    // Optionally include sync history
    if (includeHistory) {
      const historyRows = await db
        .select()
        .from(syncLogs)
        .where(eq(syncLogs.shopId, shopId))
        .orderBy(desc(syncLogs.startedAt))
        .limit(10)

      response.history = historyRows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        customersCount: row.customersCount ?? 0,
        ordersCount: row.ordersCount ?? 0,
        errorMessage: row.errorMessage ?? null,
      }))
    }

    return Response.json(response)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch sync status'
    console.error('[sync/status] GET error:', error)
    return Response.json({ error: message }, { status: 500 })
  }
}
