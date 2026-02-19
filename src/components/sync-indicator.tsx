'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { SyncStatus } from '@/app/api/sync/status/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a UTC ISO string to a relative time string.
 * e.g. "5 minutes ago", "2 hours ago", "3 days ago"
 * No external dependency — pure arithmetic.
 */
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

// ─── SyncIndicator ────────────────────────────────────────────────────────────

/**
 * Compact nav sync indicator component.
 *
 * Three visual states per design spec:
 *   1. Idle (healthy)  — green CheckCircle2 + "Last synced X ago"
 *   2. Running         — spinning RefreshCw + live record counts (polls every 2s)
 *   3. Stale / Error   — red AlertCircle badge + red dot
 *
 * Auto-sync on first run: when lastSyncAt === null and component mounts,
 * automatically POSTs to /api/sync without user interaction.
 *
 * Completion toast: fires when status transitions from 'running' to 'completed',
 * showing "Sync complete: X customers, Y orders imported".
 */
export function SyncIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Track previous status to detect running→completed transition
  const prevStatusRef = useRef<string | null>(null)
  // Prevent multiple auto-triggers per mount
  const hasAutoTriggeredRef = useRef(false)
  // Track polling interval id
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Fetch status ────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status')
      if (!res.ok) return
      const data: SyncStatus = await res.json()

      setSyncStatus((prev) => {
        const prevStatus = prev?.status ?? null

        // Detect running → completed transition for success toast
        if (prevStatus === 'running' && data.status === 'completed') {
          toast.success(
            `Sync complete: ${formatCount(data.customersCount)} customers, ${formatCount(data.ordersCount)} orders imported`
          )
          setIsSyncing(false)
        }

        // Detect running → failed
        if (prevStatus === 'running' && data.status === 'failed') {
          toast.error(
            `Sync failed: ${data.errorMessage ?? 'Unknown error'}`
          )
          setIsSyncing(false)
        }

        prevStatusRef.current = data.status
        return data
      })
    } catch {
      // Silently ignore network errors during polling
    }
  }, [])

  // ─── Trigger sync ────────────────────────────────────────────────────────

  const triggerSync = useCallback(
    async (force = false) => {
      setIsSyncing(true)
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        })
        // Immediately fetch status to reflect running state
        await fetchStatus()
      } catch {
        setIsSyncing(false)
      }
    },
    [fetchStatus]
  )

  // ─── Polling with adaptive interval ──────────────────────────────────────

  useEffect(() => {
    // Initial fetch
    fetchStatus()

    const tick = async () => {
      await fetchStatus()
      // Reschedule with current status — need to read from ref
      const currentStatus = prevStatusRef.current
      const delay = currentStatus === 'running' ? 2000 : 10000
      intervalRef.current = setTimeout(tick, delay)
    }

    // Start polling
    intervalRef.current = setTimeout(tick, 10000)

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [fetchStatus])

  // ─── Auto-sync on first run ───────────────────────────────────────────────

  useEffect(() => {
    if (
      syncStatus !== null &&
      syncStatus.lastSyncAt === null &&
      syncStatus.status === 'no_sync_yet' &&
      !hasAutoTriggeredRef.current
    ) {
      hasAutoTriggeredRef.current = true
      triggerSync(false)
    }
  }, [syncStatus, triggerSync])

  // ─── Derived state ────────────────────────────────────────────────────────

  const isRunning =
    isSyncing || syncStatus?.status === 'running'
  const isStale =
    syncStatus?.isStale === true ||
    syncStatus?.status === 'failed' ||
    syncStatus?.status === 'no_sync_yet'

  // ─── Icon ─────────────────────────────────────────────────────────────────

  function NavIcon() {
    if (isRunning) {
      return (
        <span className="relative flex items-center gap-1.5 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          <span className="hidden sm:inline">Syncing...</span>
        </span>
      )
    }
    if (isStale) {
      return (
        <span className="relative flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="relative flex h-4 w-4 items-center justify-center">
            <AlertCircle className="h-4 w-4 text-red-500" />
            {/* Red dot badge per design decision */}
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="hidden sm:inline text-red-500">Sync stale</span>
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="hidden sm:inline">
          {syncStatus?.lastSyncAt
            ? formatRelativeTime(syncStatus.lastSyncAt)
            : 'Synced'}
        </span>
      </span>
    )
  }

  // ─── Popover content ─────────────────────────────────────────────────────

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
          aria-label="Sync status"
        >
          <NavIcon />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-4" align="end">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Shopify Sync</h3>
            {syncStatus?.status === 'no_sync_yet' ? (
              <Badge variant="secondary">Never synced</Badge>
            ) : isStale ? (
              <Badge variant="destructive">Stale</Badge>
            ) : isRunning ? (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                In progress
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-green-600 border-green-300"
              >
                Up to date
              </Badge>
            )}
          </div>

          {/* Status details */}
          <div className="text-xs text-muted-foreground space-y-1">
            {syncStatus?.lastSyncAt && (
              <div>
                Last synced:{' '}
                <span className="text-foreground font-medium">
                  {formatRelativeTime(syncStatus.lastSyncAt)}
                </span>
              </div>
            )}

            {isRunning && syncStatus && (
              <div className="text-blue-600 font-medium">
                Syncing{' '}
                {syncStatus.customersCount > 0
                  ? `${formatCount(syncStatus.customersCount)} customers, ${formatCount(syncStatus.ordersCount)} orders`
                  : 'in progress...'}
              </div>
            )}

            {!isRunning && syncStatus?.customersCount !== undefined && (
              <div>
                Records:{' '}
                <span className="text-foreground">
                  {formatCount(syncStatus.customersCount)} customers,{' '}
                  {formatCount(syncStatus.ordersCount)} orders
                </span>
              </div>
            )}

            {syncStatus?.deadLetterCount !== undefined &&
              syncStatus.deadLetterCount > 0 && (
                <div className="text-amber-600">
                  {syncStatus.deadLetterCount} dead letter webhook
                  {syncStatus.deadLetterCount === 1 ? '' : 's'}
                </div>
              )}

            {syncStatus?.status === 'failed' && syncStatus.errorMessage && (
              <div className="text-red-600 text-xs truncate" title={syncStatus.errorMessage}>
                Error: {syncStatus.errorMessage}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={isRunning}
              onClick={() => triggerSync(false)}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Sync Now
                </>
              )}
            </Button>
            <a
              href="/settings/sync"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Details
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
