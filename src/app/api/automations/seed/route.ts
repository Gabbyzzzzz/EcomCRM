import { NextResponse } from 'next/server'
import { PRESET_AUTOMATIONS } from '@/lib/automation/presets'
import { upsertAutomation } from '@/lib/db/queries'
import { env } from '@/lib/env'

export async function POST() {
  const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
  const results = []
  for (const preset of PRESET_AUTOMATIONS) {
    const row = await upsertAutomation(shopId, {
      ...preset,
      triggerConfig: preset.triggerConfig ?? null,
      actionConfig: preset.actionConfig ?? null,
    })
    results.push({ id: row.id, name: row.name })
  }
  return NextResponse.json({ seeded: results.length, automations: results })
}
