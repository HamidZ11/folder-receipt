import { describe, expect, it } from 'vitest';
import { computeBreakdown } from './breakdown.ts';
import { rec, seeded } from './test-helpers.ts';
import { CATEGORIES, type FileRecord } from './types.ts';

const EXT: Record<(typeof CATEGORIES)[number], string> = {
  Videos: 'mov',
  Images: 'png',
  Audio: 'mp3',
  Documents: 'pdf',
  Archives: 'zip',
  Installers: 'dmg',
  Apps: 'app',
  Other: 'xyz',
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('computeBreakdown', () => {
  it('empty or zero-byte folder → no bar', () => {
    expect(computeBreakdown([])).toEqual([]);
    expect(computeBreakdown([rec('a.txt', 0)])).toEqual([]);
  });

  it('single category → 100%', () => {
    expect(computeBreakdown([rec('a.mov', 5), rec('b.mov', 7)])).toEqual([
      { category: 'Videos', bytes: 12, percent: 100 },
    ]);
  });

  it('thirds round to 34/33/33 and sum to 100', () => {
    const b = computeBreakdown([rec('a.mov', 1), rec('b.png', 1), rec('c.mp3', 1)]);
    expect(b.map((s) => s.percent).sort()).toEqual([33, 33, 34]);
  });

  it('a tiny non-zero category still gets 1%', () => {
    const b = computeBreakdown([rec('a.mov', 1_000_000), rec('b.png', 1)]);
    expect(b).toEqual([
      { category: 'Videos', bytes: 1_000_000, percent: 99 },
      { category: 'Images', bytes: 1, percent: 1 },
    ]);
  });

  it('more than 6 categories → top 5 plus Other, Other last', () => {
    const files: FileRecord[] = [
      rec('a.mov', 800),
      rec('a.png', 700),
      rec('a.mp3', 600),
      rec('a.pdf', 500),
      rec('a.zip', 400),
      rec('a.dmg', 300),
      rec('A.app', 200, undefined, 'bundle'),
      rec('a.xyz', 100),
    ];
    const b = computeBreakdown(files);
    expect(b.map((s) => s.category)).toEqual(['Videos', 'Images', 'Audio', 'Documents', 'Archives', 'Other']);
    expect(b.at(-1)!.bytes).toBe(300 + 200 + 100);
    expect(sum(b.map((s) => s.bytes))).toBe(3600);
  });

  it('Other is always last even when it is the biggest', () => {
    const b = computeBreakdown([rec('a.xyz', 1000), rec('a.mov', 10)]);
    expect(b.map((s) => s.category)).toEqual(['Videos', 'Other']);
  });

  it('PROPERTY: random folders always sum to exactly 100, every segment ≥ 1%, ≤ 6 segments, bytes conserved', () => {
    const rand = seeded(42);
    for (let run = 0; run < 3000; run++) {
      const n = 1 + Math.floor(rand() * 40);
      const files: FileRecord[] = [];
      for (let i = 0; i < n; i++) {
        const cat = CATEGORIES[Math.floor(rand() * CATEGORIES.length)]!;
        // Mix of tiny and huge sizes to stress rounding.
        const size = rand() < 0.3 ? Math.floor(rand() * 10) : Math.floor(rand() ** 4 * 5e10);
        files.push(rec(`f${i}.${EXT[cat]}`, size, undefined, cat === 'Apps' ? 'bundle' : 'file'));
      }
      const total = sum(files.map((f) => f.size));
      const b = computeBreakdown(files);
      if (total === 0) {
        expect(b).toEqual([]);
        continue;
      }
      expect(sum(b.map((s) => s.percent))).toBe(100);
      expect(b.length).toBeLessThanOrEqual(6);
      for (const s of b) {
        expect(s.percent).toBeGreaterThanOrEqual(1);
        expect(s.bytes).toBeGreaterThan(0);
      }
      expect(sum(b.map((s) => s.bytes))).toBe(total);
      expect(new Set(b.map((s) => s.category)).size).toBe(b.length);
    }
  });
});
