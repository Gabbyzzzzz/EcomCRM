import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { env } from '@/lib/env'
import { EmailCopyGenerator } from '@/components/email-copy-generator'
import { SendTestEmailButton } from '@/components/send-test-email-button'

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

// ─── Delay label ──────────────────────────────────────────────────────────────

function delayLabel(delayValue: number | null, delayUnit: string | null): string {
  if (!delayValue || !delayUnit) return 'No delay'
  return `${delayValue} ${delayUnit}`
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

  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
    .limit(1)

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

      {/* Configuration section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Configuration</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Trigger
            </dt>
            <dd className="text-sm">{triggerLabel(automation.triggerType, automation.triggerConfig)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Delay
            </dt>
            <dd className="text-sm">{delayLabel(automation.delayValue, automation.delayUnit)}</dd>
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
            <dd className="text-sm">{automation.emailTemplateId ?? 'N/A'}</dd>
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
      </div>

      {/* Send Test Email section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-1">Send Test Email</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Send a test version of this automation&apos;s email to any address
        </p>
        <SendTestEmailButton automationId={automation.id} />
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
