import Link from 'next/link'
import { listEmailTemplates } from '@/lib/db/queries'
import { env } from '@/lib/env'
import CreateTemplateButton from './_components/CreateTemplateButton'
import ImportTemplateButton from './_components/ImportTemplateButton'
import TemplateCardActions from './_components/TemplateCardActions'

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

function getColorForName(name: string): string {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 30) {
    return date.toLocaleDateString()
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else {
    return 'just now'
  }
}

export default async function EmailTemplatesPage() {
  const shopId = getShopId()
  const templates = await listEmailTemplates(shopId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage email templates for your automation flows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportTemplateButton />
          <CreateTemplateButton />
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No templates yet. Create your first template to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const color = getColorForName(template.name)
            const initial = template.name.charAt(0).toUpperCase()

            return (
              <div
                key={template.id}
                className="rounded-lg border bg-card flex flex-col overflow-hidden"
              >
                {/* Clickable area: thumbnail + name */}
                <Link href={`/emails/${template.id}/edit`} className="group flex flex-col">
                  <div
                    className="flex items-center justify-center group-hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: color, height: '120px' }}
                  >
                    <span className="text-4xl font-bold text-white">{initial}</span>
                  </div>
                  <div className="flex flex-col gap-1 px-4 pt-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium leading-tight group-hover:text-primary transition-colors">{template.name}</h2>
                      {template.isPreset && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Preset
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Edited {formatRelativeTime(new Date(template.updatedAt))}
                    </p>
                  </div>
                </Link>

                {/* Actions */}
                <div className="px-4 pb-4">
                  <TemplateCardActions
                    templateId={template.id}
                    templateName={template.name}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
