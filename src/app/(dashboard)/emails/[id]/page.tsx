import { notFound } from 'next/navigation'
import Link from 'next/link'

const TEMPLATES: Record<string, { name: string; description: string; trigger: string }> = {
  welcome: {
    name: 'Welcome',
    description: 'Sent when a customer places their first order.',
    trigger: 'First order placed',
  },
  winback: {
    name: 'Win-back',
    description: 'Re-engages customers who haven\'t ordered in 90+ days.',
    trigger: 'Days since last order',
  },
  vip: {
    name: 'VIP',
    description: 'Rewards customers who reach the Champion segment.',
    trigger: 'Segment → champion',
  },
  repurchase: {
    name: 'Repurchase',
    description: 'Encourages repeat purchases with personalised suggestions.',
    trigger: 'Segment → loyal / potential',
  },
  'abandoned-cart': {
    name: 'Abandoned Cart',
    description: 'Recovers carts left more than 1 hour without checkout.',
    trigger: 'Cart abandoned',
  },
}

export default async function EmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const template = TEMPLATES[id]

  if (!template) notFound()

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <Link
          href="/emails"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Email Templates
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground shrink-0">
          Trigger: {template.trigger}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="rounded-lg border overflow-hidden bg-muted">
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-card text-xs text-muted-foreground">
          <span>Preview</span>
          <span className="text-xs opacity-50">— rendered with placeholder data</span>
        </div>
        <iframe
          src={`/api/emails/${id}/preview`}
          className="w-full border-none"
          style={{ height: '700px' }}
          title={`${template.name} email preview`}
        />
      </div>
    </div>
  )
}
