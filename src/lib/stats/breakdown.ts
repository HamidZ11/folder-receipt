import { categoryOf } from './categories.ts';
import type { BreakdownSegment, Category, FileRecord } from './types.ts';

const MAX_SEGMENTS = 6;

/**
 * Bytes per category as integer percentages that sum to exactly 100.
 * - At most 6 segments: the 5 largest named categories plus Other.
 * - Every segment is ≥ 1% (so it's visible and has a legend entry).
 * - Largest-remainder rounding; Other is always last.
 */
export function computeBreakdown(files: readonly FileRecord[]): BreakdownSegment[] {
  const bytes = new Map<Category, number>();
  let total = 0;
  for (const f of files) {
    if (f.size <= 0) continue;
    const c = categoryOf(f);
    bytes.set(c, (bytes.get(c) ?? 0) + f.size);
    total += f.size;
  }
  if (total === 0) return [];

  let named = [...bytes.entries()]
    .filter(([c]) => c !== 'Other')
    .map(([category, b]) => ({ category, bytes: b }))
    .sort((a, b) => b.bytes - a.bytes);
  let other = bytes.get('Other') ?? 0;

  const room = other > 0 || named.length > MAX_SEGMENTS ? MAX_SEGMENTS - 1 : MAX_SEGMENTS;
  if (named.length > room) {
    for (const s of named.slice(room)) other += s.bytes;
    named = named.slice(0, room);
  }
  const segs = other > 0 ? [...named, { category: 'Other' as Category, bytes: other }] : named;

  const exact = segs.map((s) => (s.bytes / total) * 100);
  const pct = exact.map((e) => Math.max(1, Math.floor(e)));
  let diff = 100 - pct.reduce((a, b) => a + b, 0);

  if (diff > 0) {
    // Hand out the remaining points by largest remainder (ties: bigger segment first).
    const order = segs
      .map((_, i) => i)
      .sort((a, b) => exact[b]! - pct[b]! - (exact[a]! - pct[a]!) || segs[b]!.bytes - segs[a]!.bytes);
    for (let k = 0; diff > 0; k = (k + 1) % order.length, diff--) pct[order[k]!]!++;
  }
  while (diff < 0) {
    // The 1% floor overshot: take points back from the largest segments.
    let max = 0;
    for (let i = 1; i < pct.length; i++) if (pct[i]! > pct[max]!) max = i;
    pct[max]!--;
    diff++;
  }

  return segs.map((s, i) => ({ category: s.category, bytes: s.bytes, percent: pct[i]! }));
}
