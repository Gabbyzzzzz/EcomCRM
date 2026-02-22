import { redirect } from 'next/navigation'

export default async function EmailTemplateRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/emails/${id}/edit`)
}
