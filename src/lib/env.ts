import { z } from 'zod'

// Use z.string().min(1) for all env vars — avoids Zod 4.x deprecated method-form format validators
const envSchema = z.object({
  // Database — must use Supabase Transaction Mode Pooler (port 6543)
  DATABASE_URL: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Shopify OAuth app (Partners Dashboard — client credentials grant, tokens expire in 24h)
  SHOPIFY_STORE_URL: z.string().min(1),
  SHOPIFY_CLIENT_ID: z.string().min(1),
  SHOPIFY_CLIENT_SECRET: z.string().min(1),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1),

  // Resend (email sending)
  RESEND_API_KEY: z.string().min(1),

  // Anthropic (AI insights)
  ANTHROPIC_API_KEY: z.string().min(1),

  // Inngest (background jobs)
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('Missing or invalid environment variables:')
  console.error(result.error.flatten().fieldErrors)
  throw new Error('Environment validation failed. Check the logs above for missing variables.')
}

export const env = result.data
