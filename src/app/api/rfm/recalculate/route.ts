import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { recalculateAllRfmScores } from '@/lib/rfm/engine'

/**
 * POST /api/rfm/recalculate
 *
 * Manually triggers a full RFM recalculation for the shop.
 * Runs the same NTILE(5) window function scoring used by the daily cron.
 * Returns the count of customers scored.
 */
export async function POST() {
  try {
    const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
    const changes = await recalculateAllRfmScores(shopId)
    return NextResponse.json({ ok: true, segmentChanges: changes.length })
  } catch (err) {
    console.error('[rfm/recalculate] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
