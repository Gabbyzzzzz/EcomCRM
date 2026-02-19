'use client'

import { useState } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'

// ─── SyncActions ──────────────────────────────────────────────────────────────

/**
 * Sync action controls for the /settings/sync page.
 *
 * - "Sync Now" button: triggers incremental sync (POST /api/sync)
 * - "Advanced" toggle (Collapsible): reveals "Force Full Sync" button
 * - Force Full Sync: AlertDialog confirmation → POST /api/sync { force: true }
 *
 * Per user decision: Force full sync is behind an Advanced toggle.
 * Per user decision: Confirmation dialog warns about re-importing all data.
 */
export function SyncActions() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isForceSyncing, setIsForceSyncing] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ─── Incremental sync ────────────────────────────────────────────

  async function handleSyncNow() {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })
      if (res.ok) {
        toast.success('Incremental sync started. Updates will appear shortly.')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(
          `Failed to start sync: ${data.error ?? 'Unknown error'}`
        )
      }
    } catch {
      toast.error('Failed to connect to the sync service.')
    } finally {
      setIsSyncing(false)
    }
  }

  // ─── Force full sync ─────────────────────────────────────────────

  async function handleForceFullSync() {
    setIsForceSyncing(true)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      if (res.ok) {
        toast.success(
          'Full sync started. All Shopify data will be re-imported.'
        )
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(
          `Failed to start full sync: ${data.error ?? 'Unknown error'}`
        )
      }
    } catch {
      toast.error('Failed to connect to the sync service.')
    } finally {
      setIsForceSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Incremental sync */}
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <div className="flex-1">
          <p className="text-sm font-medium">Sync Now</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Incrementally sync customers and orders updated since the last
            successful sync.
          </p>
        </div>
        <Button
          onClick={handleSyncNow}
          disabled={isSyncing || isForceSyncing}
          size="sm"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      {/* Advanced toggle with Force Full Sync */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                advancedOpen ? 'rotate-180' : ''
              }`}
            />
            Advanced
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3">
          <div className="flex items-center gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Force Full Sync
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Re-imports all data from Shopify from scratch. Use only if
                incremental sync is not working correctly.
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSyncing || isForceSyncing}
                  className="border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  {isForceSyncing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Force Full Sync'
                  )}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Force Full Sync?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will re-import all customer and order data from
                    Shopify. The process may take several minutes for large
                    stores. Only use this if incremental sync is not working
                    correctly.
                    <br />
                    <br />
                    Your existing CRM data (RFM scores, segments, tags) will
                    be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleForceFullSync}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
