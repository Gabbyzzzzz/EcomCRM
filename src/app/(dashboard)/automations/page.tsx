import Link from 'next/link'
import { getAutomationListWithRates, listEmailTemplatesForDropdown } from '@/lib/db/queries'
import { env } from '@/lib/env'
import { AutomationToggle } from '@/components/automation-toggle'
import { SeedAutomationsButton } from '@/components/seed-automations-button'
import CreateFlowButton from './_components/CreateFlowButton'

export const metadata = {
  title: 'Automations | EcomCRM',
}

// ─── Human-readable trigger labels ───────────────────────────────────────────

function triggerLabel(
  triggerType: string,
  triggerConfig: unknown
): string {
  const config = triggerConfig as { days?: number; toSegment?: string } | null
  switch (triggerType) {
    case 'first_order':
      return 'First order placed'
    case 'segment_change':
      return `Segment changes to ${config?.toSegment ?? 'champion'}`
    case 'days_since_order':
      return `${config?.days ?? 0} days since last order`
    case 'cart_abandoned':
      return 'Cart abandoned'
    case 'tag_added':
      return 'Tag added'
    default:
      return triggerType
  }
}

// ─── Delay display ────────────────────────────────────────────────────────────

function delayLabel(delayValue: number | null, delayUnit: string | null): string {
  if (!delayValue || !delayUnit) return '—'
  return `${delayValue} ${delayUnit}`
}

// ─── AutomationsPage — Server Component ──────────────────────────────────────

export default async function AutomationsPage() {
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
  const [automationList, templateOptions] = await Promise.all([
    getAutomationListWithRates(shopId),
    listEmailTemplatesForDropdown(shopId),
  ])

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preset email flows that fire automatically on customer events
          </p>
        </div>
        <CreateFlowButton templateOptions={templateOptions} />
      </div>

      {/* Empty state */}
      {automationList.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h2 className="text-lg font-medium mb-2">No automation flows configured</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Seed the 5 preset flows to get started with automated email marketing.
          </p>
          <SeedAutomationsButton />
        </div>
      ) : (
        /* Automations table */
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Flow Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Trigger
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Delay
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Action
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Open Rate
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Click Rate
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Last Run
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Toggle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {automationList.map((automation) => (
                <tr
                  key={automation.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/automations/${automation.id}`}
                      className="hover:underline text-primary"
                    >
                      {automation.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {triggerLabel(automation.triggerType, automation.triggerConfig)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {delayLabel(automation.delayValue, automation.delayUnit)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {automation.actionType.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {automation.openRate > 0 ? `${automation.openRate}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {automation.clickRate > 0 ? `${automation.clickRate}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        automation.enabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {automation.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {automation.lastRunAt
                      ? new Date(automation.lastRunAt).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <AutomationToggle
                      id={automation.id}
                      enabled={automation.enabled}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
