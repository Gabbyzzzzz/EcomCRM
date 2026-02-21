import Link from 'next/link'

const TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome',
    description: 'Sent when a customer places their first order.',
    trigger: 'First order placed',
  },
  {
    id: 'winback',
    name: 'Win-back',
    description: 'Re-engages customers who haven\'t ordered in 90+ days.',
    trigger: 'Days since last order',
  },
  {
    id: 'vip',
    name: 'VIP',
    description: 'Rewards customers who reach the Champion segment.',
    trigger: 'Segment → champion',
  },
  {
    id: 'repurchase',
    name: 'Repurchase',
    description: 'Encourages repeat purchases with personalised suggestions.',
    trigger: 'Segment → loyal / potential',
  },
  {
    id: 'abandoned-cart',
    name: 'Abandoned Cart',
    description: 'Recovers carts left more than 1 hour without checkout.',
    trigger: 'Cart abandoned',
  },
]

export default function EmailTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          The 5 pre-built React Email templates used by the automation engine.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <Link
            key={t.id}
            href={`/emails/${t.id}`}
            className="rounded-lg border bg-card p-5 flex flex-col gap-3 hover:bg-accent transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium group-hover:text-accent-foreground">{t.name}</h2>
              <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground shrink-0">
                {t.id}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
            <div className="mt-auto pt-2 border-t">
              <span className="text-xs text-muted-foreground">Trigger: {t.trigger}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
