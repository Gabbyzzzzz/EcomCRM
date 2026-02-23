import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { env } from '@/lib/env'
import { listEmailTemplates, createEmailTemplate } from '@/lib/db/queries'

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
})

export async function GET() {
  try {
    const shopId = getShopId()
    const templates = await listEmailTemplates(shopId)
    return NextResponse.json(templates)
  } catch (err) {
    console.error('[GET /api/email-templates] error', err)
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const shopId = getShopId()
    const body: unknown = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const template = await createEmailTemplate(shopId, { name: parsed.data.name })
    revalidatePath('/emails')
    return NextResponse.json(template, { status: 201 })
  } catch (err) {
    console.error('[POST /api/email-templates] error', err)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
