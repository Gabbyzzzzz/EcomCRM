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
  RESEND_FROM_NAME: z.string().min(1).optional().default('EcomCRM'),
  RESEND_FROM_EMAIL: z.string().min(1).optional().default('noreply@example.com'),
  RESEND_REPLY_TO: z.string().optional(),

  // App base URL (for unsubscribe links)
  APP_URL: z.string().min(1).optional().default('http://localhost:3000'),

  // AI Provider (Vercel AI SDK)
  // Primary provider: Google Gemini Flash (default)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  // Optional fallback: Anthropic Claude
  ANTHROPIC_API_KEY: z.string().optional(),
  // Switch provider: 'google' (default) or 'anthropic'
  AI_PROVIDER: z.enum(['google', 'anthropic']).default('google'),

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
