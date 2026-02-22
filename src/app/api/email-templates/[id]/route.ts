import { NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/lib/env'
import {
  getEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
} from '@/lib/db/queries'

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

// UUID v4 regex for validation
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  html: z.string().optional(),
  designJson: z.unknown().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    const shopId = getShopId()
    const template = await getEmailTemplate(shopId, id)

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (err) {
    console.error('[GET /api/email-templates/[id]] error', err)
    return NextResponse.json({ error: 'Failed to get template' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    const body: unknown = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    await updateEmailTemplate(id, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/email-templates/[id]] error', err)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    await deleteEmailTemplate(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/email-templates/[id]] error', err)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    if (action === 'duplicate') {
      const shopId = getShopId()
      const copy = await duplicateEmailTemplate(shopId, id)

      if (!copy) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      return NextResponse.json(copy, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/email-templates/[id]] error', err)
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
  }
}
