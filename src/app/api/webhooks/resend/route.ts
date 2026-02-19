// TODO: Add Resend webhook verification using svix package
// Resend uses svix for webhook signature verification.
// Install `svix` package and verify the `svix-id`, `svix-timestamp`, `svix-signature` headers.
// Known gap: requests are not verified yet — validated only with Zod schema.

import { z } from 'zod'
import { inngest } from '@/inngest/client'

// ─── Zod schema for Resend webhook payload ────────────────────────────────────

const resendWebhookSchema = z.object({
  type: z.string(),
  data: z
    .object({
      email_id: z.string().optional(),
      from: z.string().optional(),
      to: z.union([z.string(), z.array(z.string())]).optional(),
      bounce_type: z.string().optional(), // 'hard' or 'soft' for email.bounced events
    })
    .passthrough(),
})

// ─── POST handler ─────────────────────────────────────────────────────────────

/**
 * Resend webhook ingestion endpoint.
 *
 * Receives bounce and complaint events from Resend and dispatches to Inngest
 * for async processing (same pattern as the Shopify webhook endpoint).
 *
 * Events handled downstream in processResendWebhook:
 *   - email.bounced  → hard bounce → suppressions table + marketing_opted_out = true
 *   - email.complained → treat as unsubscribe → suppressions + marketing_opted_out
 *
 * NOTE: Webhook signature verification is NOT implemented yet.
 * See TODO at top of file for svix integration instructions.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const parsed = resendWebhookSchema.safeParse(body)
  if (!parsed.success) {
    console.warn('[resend-webhook] Invalid payload shape:', parsed.error.issues)
    return new Response('Bad Request', { status: 400 })
  }

  // Dispatch to Inngest for async processing (same pattern as Shopify webhooks)
  await inngest.send({
    name: 'resend/webhook.received',
    data: parsed.data,
  })

  return new Response('OK', { status: 200 })
}
