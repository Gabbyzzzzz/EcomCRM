/**
 * scripts/seed-demo.ts
 *
 * Generates realistic demo data for a pet supplies Shopify store.
 *
 * Run with:  npx tsx scripts/seed-demo.ts
 *
 * Uses DEMO_DATABASE_URL env var if set, falls back to DATABASE_URL.
 * Safe to re-run — clears all existing data for the demo shop first.
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql, eq } from 'drizzle-orm'
import {
  customers,
  orders,
  automations,
  messageLogs,
  emailClicks,
} from '../src/lib/db/schema'
import { PRESET_AUTOMATIONS } from '../src/lib/automation/presets'

// ─── Config ───────────────────────────────────────────────────────────────────

const SHOP_ID = '66pqxy-de.myshopify.com'

// ─── DB connection ────────────────────────────────────────────────────────────

const databaseUrl = process.env.DEMO_DATABASE_URL ?? process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('ERROR: Set DEMO_DATABASE_URL or DATABASE_URL env var.')
  process.exit(1)
}

const pgClient = postgres(databaseUrl, { prepare: false })
const db = drizzle(pgClient)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 0.99))
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function jitter(base: number, range: number): number {
  return base + randInt(-range, range)
}

// ─── Segment mapping (mirrors src/lib/rfm/engine.ts) ─────────────────────────

function mapRfmToSegment(r: number, f: number, m: number): string {
  if (r >= 4 && f >= 4 && m >= 4) return 'champion'
  if (r >= 3 && f >= 3 && m >= 3) return 'loyal'
  if (r >= 4 && f <= 1) return 'new'
  if (r >= 3) return 'potential'
  if (r <= 2 && f >= 2) return 'at_risk'
  if (r <= 2 && f <= 2 && m >= 2) return 'hibernating'
  return 'lost'
}

// ─── Static data ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James',
  'Isabella', 'Oliver', 'Mia', 'Benjamin', 'Charlotte', 'Elijah', 'Amelia',
  'Lucas', 'Harper', 'Mason', 'Evelyn', 'Logan', 'Abigail', 'Alexander',
  'Emily', 'Ethan', 'Elizabeth', 'Daniel', 'Sofia', 'Aiden', 'Madison',
  'Henry', 'Avery', 'Jackson', 'Ella', 'Sebastian', 'Scarlett', 'Jack',
  'Victoria', 'Owen', 'Aria', 'Samuel', 'Grace', 'Wyatt', 'Chloe', 'John',
  'Penelope', 'David', 'Layla', 'Carter', 'Riley', 'Jayden',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
]

const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']

const PET_PRODUCTS = [
  { name: 'Premium Dog Food 30lb', price: 49.99 },
  { name: 'Grain-Free Cat Food 12lb', price: 39.99 },
  { name: 'Organic Bird Seed Mix 5lb', price: 14.99 },
  { name: 'Tropical Fish Flakes 6oz', price: 12.99 },
  { name: 'Rabbit Pellets 10lb', price: 22.99 },
  { name: 'Dog Leash 6ft Reflective', price: 18.99 },
  { name: 'Adjustable Cat Collar', price: 11.99 },
  { name: 'Stainless Steel Pet Bowl Set', price: 15.99 },
  { name: 'Orthopedic Pet Bed Large', price: 79.99 },
  { name: 'Interactive Dog Toy Bundle', price: 29.99 },
  { name: 'Feather Wand Cat Toy Set', price: 9.99 },
  { name: 'Professional Grooming Kit', price: 34.99 },
  { name: 'Flea & Tick Treatment 3-Pack', price: 54.99 },
  { name: 'Soft-Sided Pet Carrier', price: 44.99 },
  { name: 'Puppy Training Treats 1lb', price: 16.99 },
  { name: 'Catnip Spray 4oz', price: 8.99 },
  { name: 'Dog Dental Chews 30-Pack', price: 24.99 },
  { name: 'Automatic Pet Feeder', price: 89.99 },
  { name: 'Pet Hair Remover Roller', price: 13.99 },
  { name: 'No-Pull Dog Harness', price: 32.99 },
] as const

// Email subjects matching the automation flows
const AUTOMATION_SUBJECTS: Record<string, string> = {
  'Welcome Flow': 'Welcome to PawSupply — your first order perks inside 🐾',
  'Abandoned Cart Recovery': 'You left something in your cart...',
  'Repurchase Prompt': "Time to stock up? Your pets are waiting 🐶",
  'Win-Back Campaign': "We miss you! Here's 15% off your next order",
  'VIP Welcome': "You're a VIP — exclusive access unlocked ✨",
}

const DEMO_URLS = [
  'https://pawsupply.example.com/collections/dogs',
  'https://pawsupply.example.com/collections/cats',
  'https://pawsupply.example.com/products/premium-dog-food',
  'https://pawsupply.example.com/discount/WINBACK15',
  'https://pawsupply.example.com/collections/vip',
]

// ─── Customer profiles ────────────────────────────────────────────────────────
//
// These profiles are designed to produce all 7 RFM segments after NTILE scoring.
//
// Recency buckets (sorted oldest → newest among 50 customers):
//   Lost       280-365d  → R1
//   Hibernating 165-270d → R1-R2
//   At-risk     90-155d  → R2-R3
//   Potential   60-80d   → R3
//   Loyal       22-55d   → R3-R4
//   New         5-18d    → R4-R5
//   Champion    2-12d    → R5

interface Profile {
  group: string
  count: number
  lastOrderDaysRange: [number, number]
  orderCount: [number, number]
  avgOrderValueRange: [number, number]
  tags: string[]
}

// ─── Profile design rationale ─────────────────────────────────────────────────
//
// With 50 customers and NTILE(5), each score bucket holds exactly 10.
// Groups are sized/ordered so all 7 segments appear after scoring.
//
// FREQUENCY sort (order_count ASC → score 5 = most orders):
//   F1 (pos  1-10): 10 × 1-order  → new(4)+hibernating(3)+lost(3)
//   F2 (pos 11-20): 10 × 2-order  → potential(10)
//   F3 (pos 21-30): 10 × 4-order  → at_risk (first 10 of 14)
//   F4 (pos 31-40):  4 × 4-order at_risk + 6 × 6-order loyal
//   F5 (pos 41-50):  2 × 6-order loyal + 8 × 8-order champion
//
// RECENCY sort (last_order_at ASC, oldest first → score 5 = most recent):
//   Recency order (oldest→newest): lost · hibernating · at_risk · loyal · potential · new · champion
//   lost(3)+hibernating(3)+at_risk(14) = 20 customers fill R1+R2
//   loyal(8) starts at position 21 → lands in R3  ← key: R=3 < 4, won't trigger champion
//   potential(10) starts at position 29 → R3(2)+R4(8)
//   new(4) starts at position 39 → R4(2)+R5(2)
//   champion(8) ends at position 50 → R5
//
// MONETARY sort (total_spent ASC → score 5 = highest):
//   Non-overlapping spend totals guarantee M scores:
//   lost $15-35, new $35-70, potential $80-110, at_risk $160-240,
//   hibernating $380-520 (single big purchase), loyal $540-780, champion $960-1360
//
// Expected segments:
//   champion    R5 F5 M5   → R≥4 F≥4 M≥4  ✓
//   loyal       R3 F4 M4   → R≥3 F≥3 M≥3  ✓  (R=3 < 4, never champion)
//   new         R4-5 F1 M1 → R≥4 F≤1      ✓
//   potential   R3-4 F2 M1-2→ R≥3, F<3    ✓
//   at_risk     R1-2 F3-4  → R≤2 F≥2      ✓
//   hibernating R1 F1 M4   → R≤2 F≤2 M≥2 ✓  (F1=1, escapes at_risk check)
//   lost        R1 F1 M1   → default       ✓

const PROFILES: Profile[] = [
  // 8 champions: 8 orders, very recent, high spend → R5 F5 M5
  {
    group: 'champion',
    count: 8,
    lastOrderDaysRange: [2, 12],
    orderCount: [8, 8],
    avgOrderValueRange: [120, 170],
    tags: ['vip', 'loyal'],
  },
  // 8 loyal: 6 orders, 65-100 days ago, good spend → R3 F4 M4
  // Placed OLDER than potential so they land in R3 (not R4), keeping R<4 → not champion
  {
    group: 'loyal',
    count: 8,
    lastOrderDaysRange: [65, 100],
    orderCount: [6, 6],
    avgOrderValueRange: [90, 130],
    tags: ['loyal'],
  },
  // 4 new: 1 order, very recent, low-med spend → R4-5 F1 M1
  {
    group: 'new',
    count: 4,
    lastOrderDaysRange: [5, 18],
    orderCount: [1, 1],
    avgOrderValueRange: [35, 70],
    tags: ['new'],
  },
  // 10 potential: 2 orders, 35-60 days ago, low spend → R3-4 F2 M1-2
  // More recent than loyal; low avgOrderValue keeps M<3 → not loyal
  {
    group: 'potential',
    count: 10,
    lastOrderDaysRange: [35, 60],
    orderCount: [2, 2],
    avgOrderValueRange: [40, 55],
    tags: [],
  },
  // 14 at_risk: 4 orders, 110-155 days ago, mid spend → R1-2 F3-4 M2-4
  // lost(3)+hibernating(3)+at_risk(14)=20 fills R1+R2, pushing loyal to R3
  {
    group: 'at_risk',
    count: 14,
    lastOrderDaysRange: [110, 155],
    orderCount: [4, 4],
    avgOrderValueRange: [40, 60],
    tags: [],
  },
  // 3 hibernating: 1 order, old, HIGH single-purchase spend → R1 F1 M4
  // F=1 (not ≥2) prevents at_risk classification; high M ensures M≥2 for hibernating
  {
    group: 'hibernating',
    count: 3,
    lastOrderDaysRange: [165, 270],
    orderCount: [1, 1],
    avgOrderValueRange: [380, 520],
    tags: [],
  },
  // 3 lost: 1 order, oldest, very low spend → R1 F1 M1
  {
    group: 'lost',
    count: 3,
    lastOrderDaysRange: [280, 365],
    orderCount: [1, 1],
    avgOrderValueRange: [15, 35],
    tags: [],
  },
]

// ─── Clear existing demo data ─────────────────────────────────────────────────

async function clearDemoData() {
  console.log(`Clearing existing demo data for shop: ${SHOP_ID}`)
  // FK order: email_clicks → message_logs → orders/automations → customers
  await db.execute(
    sql`DELETE FROM email_clicks WHERE shop_id = ${SHOP_ID}`
  )
  await db.execute(
    sql`DELETE FROM message_logs WHERE shop_id = ${SHOP_ID}`
  )
  await db.execute(
    sql`DELETE FROM orders WHERE shop_id = ${SHOP_ID}`
  )
  await db.execute(
    sql`DELETE FROM automations WHERE shop_id = ${SHOP_ID}`
  )
  await db.execute(
    sql`DELETE FROM customers WHERE shop_id = ${SHOP_ID}`
  )
  console.log('  Cleared.')
}

// ─── Seed customers + orders ──────────────────────────────────────────────────

async function seedCustomersAndOrders(): Promise<string[]> {
  console.log('\nSeeding customers and orders...')

  const insertedCustomerIds: string[] = []
  let shopifyCustId = 600_001
  let shopifyOrderId = 700_001

  for (const profile of PROFILES) {
    for (let i = 0; i < profile.count; i++) {
      const idx = insertedCustomerIds.length
      const firstName = FIRST_NAMES[idx % FIRST_NAMES.length]
      const lastName = LAST_NAMES[idx % LAST_NAMES.length]
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${shopifyCustId}@${pick(EMAIL_DOMAINS)}`

      const orderCount = randInt(profile.orderCount[0], profile.orderCount[1])
      const avgOV = rand(profile.avgOrderValueRange[0], profile.avgOrderValueRange[1])
      const totalSpent = (orderCount * avgOV).toFixed(4)

      const lastDaysAgo = randInt(profile.lastOrderDaysRange[0], profile.lastOrderDaysRange[1])
      const lastOrderAt = daysAgo(lastDaysAgo)

      // First order date: earlier than last order
      const firstOrderAt =
        orderCount === 1
          ? lastOrderAt
          : daysAgo(Math.min(lastDaysAgo + randInt(30, 120) * (orderCount - 1), 365))

      const shopifyCreatedAt = new Date(
        firstOrderAt.getTime() - randInt(1, 7) * 24 * 60 * 60 * 1000
      )

      const [customer] = await db
        .insert(customers)
        .values({
          shopId: SHOP_ID,
          shopifyId: `gid://shopify/Customer/${shopifyCustId++}`,
          name: `${firstName} ${lastName}`,
          email,
          totalSpent,
          orderCount,
          avgOrderValue: avgOV.toFixed(4),
          firstOrderAt,
          lastOrderAt,
          shopifyCreatedAt,
          shopifyUpdatedAt: new Date(),
          tags: profile.tags,
          marketingOptedOut: false,
        })
        .returning({ id: customers.id })

      insertedCustomerIds.push(customer.id)

      // Create orders for this customer
      for (let j = 0; j < orderCount; j++) {
        let orderDate: Date
        if (orderCount === 1) {
          orderDate = lastOrderAt
        } else {
          // Spread orders evenly from firstOrderAt → lastOrderAt
          const fraction = j / (orderCount - 1)
          const totalMs = lastOrderAt.getTime() - firstOrderAt.getTime()
          orderDate = new Date(firstOrderAt.getTime() + fraction * totalMs)
        }

        // 1-3 line items per order
        const itemCount = randInt(1, 3)
        const lineItems: Array<{ id: number; title: string; quantity: number; price: string }> = []
        let orderTotal = 0

        for (let k = 0; k < itemCount; k++) {
          const product = pick(PET_PRODUCTS)
          const quantity = randInt(1, 3)
          const price = product.price * rand(0.9, 1.1)
          lineItems.push({
            id: shopifyOrderId * 10 + k,
            title: product.name,
            quantity,
            price: price.toFixed(2),
          })
          orderTotal += price * quantity
        }

        await db.insert(orders).values({
          shopId: SHOP_ID,
          shopifyId: `gid://shopify/Order/${shopifyOrderId++}`,
          customerId: customer.id,
          totalPrice: orderTotal.toFixed(4),
          lineItems,
          financialStatus: 'paid',
          shopifyCreatedAt: orderDate,
          shopifyUpdatedAt: new Date(),
        })
      }
    }

    console.log(`  ${profile.group}: ${profile.count} customers seeded`)
  }

  console.log(`  Total customers: ${insertedCustomerIds.length}`)
  return insertedCustomerIds
}

// ─── Seed automations ─────────────────────────────────────────────────────────

async function seedAutomations(): Promise<string[]> {
  console.log('\nSeeding automations...')

  const automationIds: string[] = []

  for (const preset of PRESET_AUTOMATIONS) {
    const [row] = await db
      .insert(automations)
      .values({
        shopId: SHOP_ID,
        name: preset.name,
        triggerType: preset.triggerType,
        triggerConfig: preset.triggerConfig ?? {},
        delayValue: preset.delayValue ?? null,
        delayUnit: preset.delayUnit ?? null,
        actionType: preset.actionType,
        actionConfig: preset.actionConfig ?? {},
        emailTemplateId: preset.emailTemplateId,
        enabled: preset.enabled,
      })
      .onConflictDoUpdate({
        target: [automations.shopId, automations.name],
        set: { enabled: preset.enabled },
      })
      .returning({ id: automations.id })

    automationIds.push(row.id)
    console.log(`  [${preset.name}] seeded`)
  }

  return automationIds
}

// ─── Run RFM calculation ──────────────────────────────────────────────────────

async function recalculateRfm(): Promise<void> {
  console.log('\nRecalculating RFM scores...')

  // Step 1: clear scores for zero-purchase customers
  await db.execute(sql`
    UPDATE customers
    SET rfm_r = NULL, rfm_f = NULL, rfm_m = NULL, segment = NULL
    WHERE shop_id = ${SHOP_ID}
      AND deleted_at IS NULL
      AND (order_count = 0 OR order_count IS NULL)
  `)

  // Step 2: compute NTILE scores for purchasers
  type ScoreRow = { id: string; rfm_r: number; rfm_f: number; rfm_m: number }
  const rows = await db.execute<ScoreRow>(sql`
    SELECT
      id,
      NTILE(5) OVER (ORDER BY last_order_at    ASC NULLS FIRST) AS rfm_r,
      NTILE(5) OVER (ORDER BY order_count      ASC NULLS FIRST) AS rfm_f,
      NTILE(5) OVER (ORDER BY total_spent::numeric ASC NULLS FIRST) AS rfm_m
    FROM customers
    WHERE shop_id = ${SHOP_ID}
      AND deleted_at IS NULL
      AND order_count > 0
  `)

  if (!rows || rows.length === 0) {
    console.log('  No purchasers found.')
    return
  }

  // Step 3: compute segments and batch-update in chunks of 100
  const CHUNK_SIZE = 100
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)

    const ids = chunk.map((r) => r.id)
    const rfmRList = chunk.map((r) => Number(r.rfm_r))
    const rfmFList = chunk.map((r) => Number(r.rfm_f))
    const rfmMList = chunk.map((r) => Number(r.rfm_m))
    const segmentList = chunk.map((r) =>
      mapRfmToSegment(Number(r.rfm_r), Number(r.rfm_f), Number(r.rfm_m))
    )

    await db.execute(sql`
      UPDATE customers AS c
      SET
        rfm_r   = v.rfm_r,
        rfm_f   = v.rfm_f,
        rfm_m   = v.rfm_m,
        segment = v.segment::customer_segment
      FROM (
        SELECT
          unnest(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(',')}]::uuid[]`)}        ) AS id,
          unnest(${sql.raw(`ARRAY[${rfmRList.join(',')}]::int[]`)}                            ) AS rfm_r,
          unnest(${sql.raw(`ARRAY[${rfmFList.join(',')}]::int[]`)}                            ) AS rfm_f,
          unnest(${sql.raw(`ARRAY[${rfmMList.join(',')}]::int[]`)}                            ) AS rfm_m,
          unnest(${sql.raw(`ARRAY[${segmentList.map((s) => `'${s}'`).join(',')}]::text[]`)}  ) AS segment
      ) AS v
      WHERE c.id = v.id
    `)
  }

  // Step 4: show segment distribution
  type SegCount = { segment: string; count: number }
  const distribution = await db.execute<SegCount>(sql`
    SELECT segment, COUNT(*) AS count
    FROM customers
    WHERE shop_id = ${SHOP_ID} AND segment IS NOT NULL
    GROUP BY segment
    ORDER BY segment
  `)

  console.log('  Segment distribution:')
  for (const row of distribution) {
    console.log(`    ${row.segment.padEnd(14)} ${row.count}`)
  }
}

// ─── Seed message logs ────────────────────────────────────────────────────────

async function seedMessageLogs(
  customerIds: string[],
  automationIds: string[]
): Promise<string[]> {
  console.log('\nSeeding message logs (20 entries)...')

  const automationNames = PRESET_AUTOMATIONS.map((a) => a.name)
  const insertedIds: string[] = []

  for (let i = 0; i < 20; i++) {
    const customerId = pick(customerIds)
    const automationIdx = i % automationIds.length
    const automationId = automationIds[automationIdx]
    const automationName = automationNames[automationIdx]
    const subject = AUTOMATION_SUBJECTS[automationName] ?? 'Hello from PawSupply'

    // Distribution: ~30% sent, ~40% opened, ~30% clicked
    const roll = Math.random()
    let status: 'sent' | 'opened' | 'clicked'
    let openedAt: Date | null = null
    let clickedAt: Date | null = null

    const sentAt = daysAgo(randInt(1, 90))

    if (roll < 0.3) {
      status = 'sent'
    } else if (roll < 0.7) {
      status = 'opened'
      openedAt = new Date(sentAt.getTime() + randInt(1, 48) * 60 * 60 * 1000)
    } else {
      status = 'clicked'
      openedAt = new Date(sentAt.getTime() + randInt(1, 24) * 60 * 60 * 1000)
      clickedAt = new Date(openedAt.getTime() + randInt(1, 60) * 60 * 1000)
    }

    const [log] = await db
      .insert(messageLogs)
      .values({
        shopId: SHOP_ID,
        customerId,
        automationId,
        channel: 'email',
        subject,
        status,
        sentAt,
        openedAt,
        clickedAt,
      })
      .returning({ id: messageLogs.id })

    insertedIds.push(log.id)
  }

  const clickedCount = insertedIds.length
  console.log(`  Seeded 20 message logs`)
  return insertedIds
}

// ─── Seed email clicks ────────────────────────────────────────────────────────

async function seedEmailClicks(messageLogIds: string[]): Promise<void> {
  console.log('\nSeeding email clicks (5 entries)...')

  // Find message logs that have clicked status (we'll just use first 5 ids)
  // In practice, pick any 5 message log ids
  const candidates = messageLogIds.slice(0, Math.min(5, messageLogIds.length))

  for (const messageLogId of candidates) {
    await db.insert(emailClicks).values({
      shopId: SHOP_ID,
      messageLogId,
      linkUrl: pick(DEMO_URLS),
      clickedAt: daysAgo(randInt(1, 60)),
    })
  }

  console.log(`  Seeded ${candidates.length} email clicks`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('EcomCRM Demo Seed Script')
  console.log(`Shop: ${SHOP_ID}`)
  console.log('='.repeat(60))

  await clearDemoData()
  const customerIds = await seedCustomersAndOrders()
  const automationIds = await seedAutomations()
  await recalculateRfm()
  const messageLogIds = await seedMessageLogs(customerIds, automationIds)
  await seedEmailClicks(messageLogIds)

  // Summary
  const [customerCount] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM customers WHERE shop_id = ${SHOP_ID}`
  )
  const [orderCount] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM orders WHERE shop_id = ${SHOP_ID}`
  )
  const [automationCount] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM automations WHERE shop_id = ${SHOP_ID}`
  )
  const [msgLogCount] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM message_logs WHERE shop_id = ${SHOP_ID}`
  )
  const [clickCount] = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*)::text AS count FROM email_clicks WHERE shop_id = ${SHOP_ID}`
  )

  console.log('\n' + '='.repeat(60))
  console.log('Seed complete!')
  console.log(`  Customers:     ${customerCount.count}`)
  console.log(`  Orders:        ${orderCount.count}`)
  console.log(`  Automations:   ${automationCount.count}`)
  console.log(`  Message logs:  ${msgLogCount.count}`)
  console.log(`  Email clicks:  ${clickCount.count}`)
  console.log('='.repeat(60))

  await pgClient.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('\nSeed failed:', err)
  pgClient.end().finally(() => process.exit(1))
})
