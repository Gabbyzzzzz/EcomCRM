import { vi } from 'vitest'

// Mock env module to avoid requiring real environment variables in tests
vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    SHOPIFY_STORE_URL: 'https://test.myshopify.com',
    SHOPIFY_CLIENT_ID: 'test-client-id',
    SHOPIFY_CLIENT_SECRET: 'test-client-secret',
    SHOPIFY_WEBHOOK_SECRET: 'test-webhook-secret',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_NAME: 'Test Store',
    RESEND_FROM_EMAIL: 'test@example.com',
    APP_URL: 'http://localhost:3000',
    GOOGLE_GENERATIVE_AI_API_KEY: 'test-google-key',
    INNGEST_EVENT_KEY: 'test-inngest-key',
    INNGEST_SIGNING_KEY: 'test-inngest-signing-key',
  },
}))

// Mock db module to avoid requiring a real database connection
vi.mock('@/lib/db', () => ({
  db: {},
}))
