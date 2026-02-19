// /settings/sync — Sync settings and status page
// Server Component — renders static structure, delegates live state to client components
import { SyncStatusDetail } from '@/components/sync-status-detail'
import { SyncActions } from '@/components/sync-actions'

export const metadata = {
  title: 'Sync Settings | EcomCRM',
}

export default function SyncSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Shopify Sync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your Shopify data sync status and trigger manual syncs.
        </p>
      </div>

      {/* Sync Status section */}
      <section>
        <h2 className="text-base font-medium mb-4">Sync Status</h2>
        <SyncStatusDetail />
      </section>

      {/* Sync Actions section */}
      <section>
        <h2 className="text-base font-medium mb-4">Sync Actions</h2>
        <SyncActions />
      </section>
    </div>
  )
}
