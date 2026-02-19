import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { customers } from '@/lib/db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerSegment =
  | 'champion'
  | 'loyal'
  | 'potential'
  | 'new'
  | 'at_risk'
  | 'hibernating'
  | 'lost'

export interface SegmentChange {
  customerId: string
  oldSegment: string | null
  newSegment: CustomerSegment
}

// ─── Segment mapping ──────────────────────────────────────────────────────────

/**
 * Maps an RFM score combination to a named segment.
 *
 * Priority order (evaluated top to bottom; first match wins):
 *   champion    – R>=4, F>=4, M>=4
 *   loyal       – R>=3, F>=3, M>=3
 *   new         – R>=4, F<=1  (high recency, very few orders)
 *   potential   – R>=3, any F/M (but not champion/loyal/new)
 *   at_risk     – R<=2, F>=2
 *   hibernating – R<=2, F<=2, M>=2
 *   lost        – everything else (default)
 */
export function mapRfmToSegment(r: number, f: number, m: number): CustomerSegment {
  if (r >= 4 && f >= 4 && m >= 4) return 'champion'
  if (r >= 3 && f >= 3 && m >= 3) return 'loyal'
  if (r >= 4 && f <= 1) return 'new'
  if (r >= 3) return 'potential'
  if (r <= 2 && f >= 2) return 'at_risk'
  if (r <= 2 && f <= 2 && m >= 2) return 'hibernating'
  return 'lost'
}

/**
 * A readonly record that documents the segment mapping rules.
 * The canonical logic lives in `mapRfmToSegment`; this object exists
 * for documentation and UI display purposes.
 */
export const SEGMENT_MAP: Readonly<Record<string, CustomerSegment>> = {
  'R>=4,F>=4,M>=4': 'champion',
  'R>=3,F>=3,M>=3': 'loyal',
  'R>=4,F<=1': 'new',
  'R>=3': 'potential',
  'R<=2,F>=2': 'at_risk',
  'R<=2,F<=2,M>=2': 'hibernating',
  default: 'lost',
} as const

// ─── Internal types ───────────────────────────────────────────────────────────

interface ScoreRow extends Record<string, unknown> {
  id: string
  rfm_r: string | number
  rfm_f: string | number
  rfm_m: string | number
  old_segment: CustomerSegment | null
}

interface CustomerUpdate {
  id: string
  rfmR: number
  rfmF: number
  rfmM: number
  newSegment: CustomerSegment
  oldSegment: CustomerSegment | null
}

// ─── RFM scoring ──────────────────────────────────────────────────────────────

/**
 * Recalculate RFM scores for every active customer in a shop.
 *
 * Scoring runs entirely in PostgreSQL using NTILE(5) window functions —
 * no customer rows are loaded into Node.js memory for sorting.
 *
 * NTILE assignment:
 *   R (Recency):   ORDER BY last_order_at ASC NULLS FIRST   → most recent = quintile 5
 *   F (Frequency): ORDER BY order_count   ASC NULLS FIRST   → most orders  = quintile 5
 *   M (Monetary):  ORDER BY total_spent   ASC NULLS FIRST   → most spent   = quintile 5
 *
 * Returns an array of SegmentChange entries for customers whose segment label
 * actually changed as a result of this recalculation.
 */
export async function recalculateAllRfmScores(shopId: string): Promise<SegmentChange[]> {
  // ── Step 1: compute NTILE scores in PostgreSQL ──────────────────────────────
  const rows = await db.execute<ScoreRow>(sql`
    SELECT
      id,
      NTILE(5) OVER (ORDER BY last_order_at ASC NULLS FIRST) AS rfm_r,
      NTILE(5) OVER (ORDER BY order_count   ASC NULLS FIRST) AS rfm_f,
      NTILE(5) OVER (ORDER BY total_spent::numeric ASC NULLS FIRST) AS rfm_m,
      segment AS old_segment
    FROM ${customers}
    WHERE shop_id = ${shopId}
      AND deleted_at IS NULL
  `)

  if (!rows || rows.length === 0) {
    return []
  }

  // ── Step 2: compute new segments in application memory ─────────────────────
  // (NTILE values already resolved by postgres; segment mapping is a pure function)
  const updates: CustomerUpdate[] = rows.map((row: ScoreRow) => ({
    id: row.id,
    rfmR: Number(row.rfm_r),
    rfmF: Number(row.rfm_f),
    rfmM: Number(row.rfm_m),
    newSegment: mapRfmToSegment(Number(row.rfm_r), Number(row.rfm_f), Number(row.rfm_m)),
    oldSegment: row.old_segment ?? null,
  }))

  // ── Step 3: batch-update customers in chunks of 100 ──────────────────────
  const CHUNK_SIZE = 100

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE)

    const ids = chunk.map((u) => u.id)
    const rfmRList = chunk.map((u) => u.rfmR)
    const rfmFList = chunk.map((u) => u.rfmF)
    const rfmMList = chunk.map((u) => u.rfmM)
    const segmentList = chunk.map((u) => u.newSegment)

    // Build a single UPDATE … FROM (VALUES …) statement per chunk.
    // sql.raw() is used for the literal arrays — values are internal ids/integers/enum strings
    // already validated and typed; no external input is passed through sql.raw().
    await db.execute(sql`
      UPDATE ${customers} AS c
      SET
        rfm_r   = v.rfm_r,
        rfm_f   = v.rfm_f,
        rfm_m   = v.rfm_m,
        segment = v.segment::customer_segment
      FROM (
        SELECT
          unnest(${sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(',')}]::uuid[]`)}      ) AS id,
          unnest(${sql.raw(`ARRAY[${rfmRList.join(',')}]::int[]`)}                          ) AS rfm_r,
          unnest(${sql.raw(`ARRAY[${rfmFList.join(',')}]::int[]`)}                          ) AS rfm_f,
          unnest(${sql.raw(`ARRAY[${rfmMList.join(',')}]::int[]`)}                          ) AS rfm_m,
          unnest(${sql.raw(`ARRAY[${segmentList.map((s) => `'${s}'`).join(',')}]::text[]`)} ) AS segment
      ) AS v
      WHERE c.id = v.id
    `)
  }

  // ── Step 4: collect segment changes ─────────────────────────────────────────
  const changes: SegmentChange[] = updates
    .filter((u) => u.oldSegment !== u.newSegment)
    .map((u) => ({
      customerId: u.id,
      oldSegment: u.oldSegment,
      newSegment: u.newSegment,
    }))

  return changes
}
