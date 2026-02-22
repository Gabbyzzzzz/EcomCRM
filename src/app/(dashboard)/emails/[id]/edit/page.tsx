import { getEmailTemplate } from '@/lib/db/queries'
import { env } from '@/lib/env'
import { notFound } from 'next/navigation'
import { UnlayerEditor } from '@/components/email-editor/UnlayerEditor'

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
    <UnlayerEditor
      templateId={template.id}
      templateName={template.name}
      initialDesign={template.designJson as object | null}
    />
  )
}
