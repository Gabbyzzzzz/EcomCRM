import { getEmailTemplate } from '@/lib/db/queries'
import { env } from '@/lib/env'
import { notFound } from 'next/navigation'
import { UnlayerEditor } from '@/components/email-editor/UnlayerEditor'
import { Breadcrumb } from '@/components/breadcrumb'

export default async function EmailEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
  const template = await getEmailTemplate(shopId, id)
  if (!template) notFound()

  return (
    <div className="flex flex-col gap-4 h-full">
      <Breadcrumb items={[
        { label: 'Email Templates', href: '/emails' },
        { label: template.name },
      ]} />
      <div className="flex-1 min-h-0">
        <UnlayerEditor
          templateId={template.id}
          templateName={template.name}
          initialDesign={template.designJson as object | null}
          initialHtml={template.html}
        />
      </div>
    </div>
  )
}
