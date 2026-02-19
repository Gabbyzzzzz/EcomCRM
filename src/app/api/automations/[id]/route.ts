import { NextResponse } from 'next/server'
import { z } from 'zod'
import { setAutomationEnabled } from '@/lib/db/queries'

const patchSchema = z.object({
  enabled: z.boolean(),
})

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  await setAutomationEnabled(params.id, parsed.data.enabled)
  return NextResponse.json({ ok: true })
}
