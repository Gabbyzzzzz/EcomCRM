import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { recordEmailClick } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const url = searchParams.get('url')

  // Validate url — must start with http:// or https://
  const isValidUrl = Boolean(url && (url.startsWith('http://') || url.startsWith('https://')))
  const destinationUrl = isValidUrl ? url! : env.APP_URL

  // Record click only when both id and url are valid
  if (id && UUID_REGEX.test(id) && isValidUrl) {
    const shopId = new URL(env.SHOPIFY_STORE_URL).hostname
    await recordEmailClick(shopId, id, destinationUrl)
  }

  return NextResponse.redirect(destinationUrl, 302)
}
