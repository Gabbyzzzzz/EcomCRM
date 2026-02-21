import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { generateEmailCopy } from '@/lib/ai/insights'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shopId = new URL(env.SHOPIFY_STORE_URL).hostname

    const [automation] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
      .limit(1)

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    const templateType = automation.emailTemplateId ?? 'welcome'
    const triggerConfig = automation.triggerConfig as { toSegment?: string } | null
    const segmentTarget = triggerConfig?.toSegment ?? automation.triggerType
    const automationName = automation.name

    const suggestions = await generateEmailCopy({
      templateType,
      segmentTarget,
      storeName: env.RESEND_FROM_NAME ?? 'EcomCRM',
      automationName,
    })

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('[generate-copy] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to generate copy suggestions' },
      { status: 500 }
    )
  }
}
