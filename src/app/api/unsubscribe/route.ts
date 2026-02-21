import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe'
import {
  setMarketingOptedOut,
  insertSuppression,
  removeSuppression,
  getCustomerByInternalId,
} from '@/lib/db/queries'
import { shopifyGraphQL } from '@/lib/shopify/client'
import { env } from '@/lib/env'

// ─── Shopify tag mutations ────────────────────────────────────────────────────

const ADD_TAGS_MUTATION = /* GraphQL */ `
  mutation addTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`

const REMOVE_TAGS_MUTATION = /* GraphQL */ `
  mutation removeTags($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      userErrors {
        field
        message
      }
    }
  }
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getShopId(): string {
  return new URL(env.SHOPIFY_STORE_URL).hostname
}

/**
 * Perform the unsubscribe action for a verified token.
 * Sets marketing_opted_out = true, inserts suppression, and adds 'unsubscribed' Shopify tag.
 */
async function performUnsubscribe(customerId: string, shopId: string): Promise<void> {
  await setMarketingOptedOut(shopId, customerId, true)

  const customer = await getCustomerByInternalId(shopId, customerId)
  if (customer?.email) {
    await insertSuppression(shopId, customer.email, 'unsubscribe')
  }

  // Sync 'unsubscribed' tag to Shopify
  if (customer?.shopifyId) {
    try {
      await shopifyGraphQL<{ tagsAdd: { userErrors: { field: string; message: string }[] } }>(
        ADD_TAGS_MUTATION,
        { id: customer.shopifyId, tags: ['unsubscribed'] }
      )
    } catch (err) {
      // Tag sync is best-effort — log but do not fail the unsubscribe
      console.error('[unsubscribe] Failed to add Shopify tag:', err)
    }
  }
}

/**
 * Reverse the unsubscribe: marketing_opted_out = false, remove suppression, remove Shopify tag.
 */
async function performResubscribe(customerId: string, shopId: string): Promise<void> {
  await setMarketingOptedOut(shopId, customerId, false)

  const customer = await getCustomerByInternalId(shopId, customerId)
  if (customer?.email) {
    await removeSuppression(shopId, customer.email)
  }

  // Remove 'unsubscribed' tag from Shopify
  if (customer?.shopifyId) {
    try {
      await shopifyGraphQL<{ tagsRemove: { userErrors: { field: string; message: string }[] } }>(
        REMOVE_TAGS_MUTATION,
        { id: customer.shopifyId, tags: ['unsubscribed'] }
      )
    } catch (err) {
      // Tag sync is best-effort — log but do not fail the resubscribe
      console.error('[unsubscribe] Failed to remove Shopify tag:', err)
    }
  }
}

// ─── GET handler — redirect-based unsubscribe (link click in email) ───────────

/**
 * GET /api/unsubscribe?token=xxx
 *
 * Called when a customer clicks the unsubscribe link in an email.
 * Verifies the token, performs unsubscribe, then redirects to the confirmation page.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return Response.redirect(`${env.APP_URL}/unsubscribe?error=invalid`)
  }

  const verified = verifyUnsubscribeToken(token)
  if (!verified) {
    return Response.redirect(`${env.APP_URL}/unsubscribe?error=invalid`)
  }

  const { customerId, shopId } = verified

  try {
    await performUnsubscribe(customerId, shopId)
  } catch (err) {
    console.error('[unsubscribe] GET handler error:', err)
    return Response.redirect(`${env.APP_URL}/unsubscribe?error=invalid`)
  }

  return Response.redirect(`${env.APP_URL}/unsubscribe?token=${token}&done=true`)
}

// ─── POST handler — one-click unsubscribe (RFC 8058) + resubscribe (undo) ─────

/**
 * POST /api/unsubscribe
 *
 * Handles two flows distinguished by the form-encoded body:
 *
 * 1. **One-click unsubscribe** (RFC 8058 / EMAIL-05):
 *    Body: `List-Unsubscribe=One-Click`
 *    Token comes from ?token= query param (included in the List-Unsubscribe header URL).
 *    Called by email clients supporting List-Unsubscribe-Post.
 *    Returns 200 OK (no redirect — email client does not follow redirects).
 *
 * 2. **Resubscribe / undo**:
 *    Body: `action=resubscribe&token=xxx`
 *    Reverses the unsubscribe: marketing_opted_out=false, suppression removed, Shopify tag removed.
 *    Redirects to /unsubscribe?token=xxx&resubscribed=true on success.
 */
export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const contentType = request.headers.get('content-type') ?? ''

  // Both flows use application/x-www-form-urlencoded
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return new Response('Bad Request', { status: 400 })
  }

  const bodyText = await request.text()
  const params = new URLSearchParams(bodyText)

  // ── Flow 1: One-click unsubscribe (RFC 8058) ──────────────────────────────
  if (params.get('List-Unsubscribe') === 'One-Click') {
    const token = url.searchParams.get('token')
    if (!token) {
      return new Response('Bad Request', { status: 400 })
    }

    const verified = verifyUnsubscribeToken(token)
    if (!verified) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { customerId, shopId } = verified

    try {
      await performUnsubscribe(customerId, shopId)
    } catch (err) {
      console.error('[unsubscribe] One-click handler error:', err)
      return new Response('Internal Server Error', { status: 500 })
    }

    return new Response('OK', { status: 200 })
  }

  // ── Flow 2: Resubscribe / undo from unsubscribe page ─────────────────────
  if (params.get('action') === 'resubscribe') {
    const token = params.get('token')
    if (!token) {
      return Response.redirect(`${env.APP_URL}/unsubscribe?error=invalid`)
    }

    const verified = verifyUnsubscribeToken(token)
    if (!verified) {
      return Response.redirect(`${env.APP_URL}/unsubscribe?error=invalid`)
    }

    const { customerId, shopId } = verified

    try {
      await performResubscribe(customerId, shopId)
    } catch (err) {
      console.error('[unsubscribe] Resubscribe handler error:', err)
      return Response.redirect(`${env.APP_URL}/unsubscribe?error=invalid`)
    }

    return Response.redirect(`${env.APP_URL}/unsubscribe?token=${token}&resubscribed=true`)
  }

  return new Response('Bad Request', { status: 400 })
}
