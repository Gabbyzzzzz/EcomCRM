import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { getAutomationEmailStats, getAutomationEmailTimeSeries, listEmailTemplatesForDropdown } from '@/lib/db/queries'
import { EmailCopyGenerator } from '@/components/email-copy-generator'
import { AutomationDetailClient } from '@/components/automation-detail-client'
import { EmailPerformanceChart } from '@/components/email-performance-chart'

// ─── Human-readable trigger label ─────────────────────────────────────────────

function triggerLabel(triggerType: string, triggerConfig: unknown): string {
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

// ─── Action label ─────────────────────────────────────────────────────────────

function actionLabel(actionType: string): string {
  return actionType.replace(/_/g, ' ')
}

// ─── AutomationDetailPage ─────────────────────────────────────────────────────

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

  const [automationRows, stats, templateOptions, timeSeries] = await Promise.all([
    db.select().from(automations).where(and(eq(automations.id, id), eq(automations.shopId, shopId))).limit(1),
    getAutomationEmailStats(shopId, id),
    listEmailTemplatesForDropdown(shopId),
    getAutomationEmailTimeSeries(shopId, id, 30),
  ])
  const automation = automationRows[0]

  if (!automation) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <Link
          href="/automations"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Automations
        </Link>
      </div>

      {/* Heading + status badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{automation.name}</h1>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            automation.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {automation.enabled ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Email Performance section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Email Performance</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Open rates may be inflated by Apple Mail Privacy Protection (MPP). Click rate is the more reliable metric.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.totalSent}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Opened</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.totalOpened}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Clicked</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.totalClicked}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Open Rate</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.openRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Click Rate</p>
            <p className="text-2xl font-semibold tabular-nums">{stats.clickRate}%</p>
          </div>
        </div>
      </div>

      {/* Configuration section — editable via AutomationDetailClient */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Configuration</h2>

        {/* Read-only metadata labels */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Trigger
            </dt>
            <dd className="text-sm">{triggerLabel(automation.triggerType, automation.triggerConfig)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Action
            </dt>
            <dd className="text-sm capitalize">{actionLabel(automation.actionType)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Email Template
            </dt>
            <dd className="text-sm">
              {automation.customTemplateHtml
                ? 'Custom (flow-specific)'
                : automation.linkedEmailTemplateId
                  ? (templateOptions.find((t) => t.id === automation.linkedEmailTemplateId)?.name ?? 'Linked template')
                  : (automation.emailTemplateId ?? 'N/A')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Last Run
            </dt>
            <dd className="text-sm">
              {automation.lastRunAt
                ? new Date(automation.lastRunAt).toLocaleString()
                : 'Never'}
            </dd>
          </div>
        </dl>

        {/* Editable configuration form + live preview — client component */}
        <AutomationDetailClient
          automationId={automation.id}
          triggerType={automation.triggerType}
          emailTemplateId={automation.emailTemplateId ?? null}
          initialDelayValue={automation.delayValue ?? null}
          initialDelayUnit={automation.delayUnit ?? null}
          initialTriggerConfig={(automation.triggerConfig as Record<string, unknown> | null) ?? null}
          initialActionConfig={(automation.actionConfig as Record<string, unknown> | null) ?? null}
          templateOptions={templateOptions}
          initialLinkedEmailTemplateId={automation.linkedEmailTemplateId ?? null}
          initialCustomTemplateHtml={automation.customTemplateHtml ?? null}
          initialCustomTemplateJson={(automation.customTemplateJson as object | null) ?? null}
        />
      </div>

      {/* Performance Over Time chart section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Performance Over Time</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Sends, opens, and clicks per day (last 30 days)
        </p>
        <EmailPerformanceChart data={timeSeries} />
      </div>

      {/* AI Email Copy Generator section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-1">AI Email Copy Generator</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Generate subject line and body copy suggestions using AI
        </p>
        <EmailCopyGenerator
          automationId={automation.id}
          emailTemplateId={automation.emailTemplateId ?? null}
        />
      </div>
    </div>
  )
}
