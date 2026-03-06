import { SyncStatusDetail } from '@/components/sync-status-detail'
import { SyncActions } from '@/components/sync-actions'
import { WebhookRegistration } from '@/components/webhook-registration'
import { Breadcrumb } from '@/components/breadcrumb'

export const metadata = {
  title: 'Sync Settings | EcomCRM',
}

export default function SyncSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Settings' },
        { label: 'Shopify Sync' },
      ]} />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Shopify Sync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your Shopify data sync status and trigger manual syncs.
        </p>
      </div>

      {/* Sync Status */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Sync Status</h2>
        <SyncStatusDetail />
      </section>

      {/* Sync Actions */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4">Sync Actions</h2>
        <SyncActions />
      </section>

      {/* Webhooks */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold mb-1">Shopify Webhooks</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Register webhooks so Shopify notifies EcomCRM of new orders and customer changes in real time.
        </p>
        <WebhookRegistration />
      </section>
    </div>
  )
}
