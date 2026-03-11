import { describe, it, expect } from 'vitest'
import { mapRfmToSegment } from '../engine'

describe('mapRfmToSegment', () => {
  // ── Champion: R>=4, F>=4, M>=4 ──
  it('returns champion for high R, F, M', () => {
    expect(mapRfmToSegment(5, 5, 5)).toBe('champion')
    expect(mapRfmToSegment(4, 4, 4)).toBe('champion')
    expect(mapRfmToSegment(5, 4, 5)).toBe('champion')
  })

  // ── Loyal: R>=3, F>=3, M>=3 (but not champion) ──
  it('returns loyal for mid-high R, F, M', () => {
    expect(mapRfmToSegment(3, 3, 3)).toBe('loyal')
    expect(mapRfmToSegment(3, 4, 3)).toBe('loyal')
    expect(mapRfmToSegment(3, 3, 5)).toBe('loyal')
  })

  it('does not return loyal when any score qualifies as champion', () => {
    expect(mapRfmToSegment(4, 4, 4)).not.toBe('loyal')
  })

  // ── New: R>=4, F<=1 ──
  it('returns new for high recency but very low frequency', () => {
    expect(mapRfmToSegment(4, 1, 1)).toBe('new')
    expect(mapRfmToSegment(5, 1, 2)).toBe('new')
    expect(mapRfmToSegment(4, 1, 5)).toBe('new')
  })

  it('does not return new when frequency > 1', () => {
    expect(mapRfmToSegment(4, 2, 1)).not.toBe('new')
  })

  // ── Potential: R>=3 (not champion, loyal, or new) ──
  it('returns potential for R>=3 that does not match higher segments', () => {
    expect(mapRfmToSegment(3, 1, 1)).toBe('potential')
    expect(mapRfmToSegment(3, 2, 1)).toBe('potential')
    expect(mapRfmToSegment(4, 2, 1)).toBe('potential')
    expect(mapRfmToSegment(5, 3, 2)).toBe('potential')
  })

  // ── At Risk: R<=2, F>=2 ──
  it('returns at_risk for low recency but decent frequency', () => {
    expect(mapRfmToSegment(2, 2, 1)).toBe('at_risk')
    expect(mapRfmToSegment(1, 5, 1)).toBe('at_risk')
    expect(mapRfmToSegment(2, 3, 1)).toBe('at_risk')
  })

  // ── Hibernating: R<=2, F<=2, M>=2 ──
  it('returns hibernating for low R, low F, but decent M', () => {
    expect(mapRfmToSegment(1, 1, 2)).toBe('hibernating')
    expect(mapRfmToSegment(2, 1, 3)).toBe('hibernating')
    expect(mapRfmToSegment(2, 2, 5)).toBe('at_risk') // F>=2 → at_risk takes priority
  })

  // ── Lost: everything else ──
  it('returns lost for lowest scores', () => {
    expect(mapRfmToSegment(1, 1, 1)).toBe('lost')
    expect(mapRfmToSegment(2, 1, 1)).toBe('lost')
  })

  // ── Boundary cases ──
  it('handles exact boundary values correctly', () => {
    // R=3, F=2, M=2 → potential (R>=3 catches it)
    expect(mapRfmToSegment(3, 2, 2)).toBe('potential')

    // R=2, F=1, M=1 → lost
    expect(mapRfmToSegment(2, 1, 1)).toBe('lost')

    // R=2, F=2, M=2 → at_risk (R<=2, F>=2 fires before hibernating)
    expect(mapRfmToSegment(2, 2, 2)).toBe('at_risk')
  })

  // ── Priority order ──
  it('champion takes priority over loyal', () => {
    expect(mapRfmToSegment(4, 4, 4)).toBe('champion')
  })

  it('loyal takes priority over new', () => {
    // R=4, F=1 could be new, but R>=3, F>=3, M>=3 → loyal... except F=1 < 3
    // so this is actually new
    expect(mapRfmToSegment(4, 1, 3)).toBe('new')
  })

  it('at_risk takes priority over hibernating when F>=2', () => {
    expect(mapRfmToSegment(1, 2, 5)).toBe('at_risk')
  })
})
