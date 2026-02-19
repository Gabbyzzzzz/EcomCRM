import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { env } from '@/lib/env' // triggers validation on first db import

// CRITICAL: prepare: false required for Supabase Transaction mode pooler (port 6543)
// Without this: "prepared statements are not supported" errors under load
const client = postgres(env.DATABASE_URL, { prepare: false })

export const db = drizzle(client, { schema })
export type DB = typeof db
