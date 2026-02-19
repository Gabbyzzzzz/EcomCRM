'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { SyncStatus, SyncHistoryEntry } from '@/app/api/sync/status/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}

function formatCount(n: number): string {
  return n.toLocaleString()
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString()
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="text-green-600 border-green-300"
        >
          Completed
        </Badge>
      )
    case 'running':
    case 'pending':
      return (
        <Badge
          variant="outline"
          className="text-blue-600 border-blue-300"
        >
          Running
        </Badge>
      )
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ─── SyncStatusDetail ─────────────────────────────────────────────────────────

/**
 * Detailed sync status component for the /settings/sync page.
 *
 * Fetches from /api/sync/status?history=true and displays:
 *   - Current sync status with live progress
 *   - Last successful sync timestamp and record counts
 *   - Dead letter count
 *   - Sync history table (last 10 runs)
 *
 * Polls every 10s (2s when running) to keep the view live.
 */
export function SyncStatusDetail() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status?history=true')
      if (!res.ok) return
      const data: SyncStatus = await res.json()
      setSyncStatus(data)
    } catch {
      // Silently ignore network errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = async () => {
      await fetchStatus()
      const isRunning =
        syncStatus?.status === 'running' ||
        syncStatus?.status === 'no_sync_yet'
      timeoutId = setTimeout(tick, isRunning ? 2000 : 10000)
    }

    timeoutId = setTimeout(tick, 10000)
    return () => clearTimeout(timeoutId)
  }, [fetchStatus, syncStatus?.status])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading sync status...
      </div>
    )
  }

  if (!syncStatus) {
    return (
      <div className="text-sm text-destructive py-4">
        Failed to load sync status.
      </div>
    )
  }

  const isRunning = syncStatus.status === 'running'
  const isStale =
    syncStatus.isStale ||
    syncStatus.status === 'failed' ||
    syncStatus.status === 'no_sync_yet'

  return (
    <div className="space-y-6">
      {/* ── Current Status ────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
        <div className="mt-0.5">
          {isRunning ? (
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          ) : isStale ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {isRunning
                ? 'Sync in progress'
                : isStale
                ? 'Sync stale or never completed'
                : 'Sync up to date'}
            </span>
            {statusBadge(syncStatus.status)}
          </div>

          {syncStatus.lastSyncAt && (
            <p className="text-sm text-muted-foreground">
              Last successful sync:{' '}
              <span className="text-foreground font-medium">
                {formatRelativeTime(syncStatus.lastSyncAt)}
              </span>{' '}
              ({formatDate(syncStatus.lastSyncAt)})
            </p>
          )}

          {syncStatus.status === 'no_sync_yet' && (
            <p className="text-sm text-muted-foreground">
              No sync has been completed yet.
            </p>
          )}

          {isRunning && (
            <p className="text-sm text-blue-600 mt-1">
              Syncing{' '}
              {syncStatus.customersCount > 0
                ? `${formatCount(syncStatus.customersCount)} customers, ${formatCount(syncStatus.ordersCount)} orders synced so far`
                : 'starting...'}
            </p>
          )}

          {!isRunning && syncStatus.status !== 'no_sync_yet' && (
            <p className="text-sm text-muted-foreground mt-1">
              Records synced:{' '}
              <span className="text-foreground">
                {formatCount(syncStatus.customersCount)} customers,{' '}
                {formatCount(syncStatus.ordersCount)} orders
              </span>
            </p>
          )}

          {syncStatus.status === 'failed' && syncStatus.errorMessage && (
            <p className="text-sm text-destructive mt-1 break-words">
              Error: {syncStatus.errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* ── Dead Letter Count ─────────────────────────────────────────── */}
      {syncStatus.deadLetterCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{syncStatus.deadLetterCount}</strong> webhook
            {syncStatus.deadLetterCount === 1 ? '' : 's'} in the dead letter
            queue — these failed to process and need investigation.
          </span>
        </div>
      )}

      {/* ── Sync History ──────────────────────────────────────────────── */}
      {syncStatus.history && syncStatus.history.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Sync History (last {syncStatus.history.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncStatus.history.map((entry: SyncHistoryEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="capitalize text-xs">
                      {entry.type}
                    </TableCell>
                    <TableCell>{statusBadge(entry.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.startedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.completedAt
                        ? formatRelativeTime(entry.completedAt)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatCount(entry.customersCount)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatCount(entry.ordersCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No sync history yet. Run your first sync to see results here.
        </div>
      )}
    </div>
  )
}
