import { describe, expect, it } from 'vitest';
import { computeStats, computeStatsSliced, notModifiedCutoff } from './computeStats.ts';
import { NOW, rec, scan, seeded } from './test-helpers.ts';
import type { FileRecord } from './types.ts';

const DAY = 86_400_000;

describe('computeStats: empty folder', () => {
  it('returns zeros and nulls, never throws', () => {
    const s = computeStats(scan([]));
    expect(s.totalFiles).toBe(0);
    expect(s.totalBytes).toBe(0);
    expect(s.largest).toBeNull();
    expect(s.items).toEqual([]);
    expect(s.notModifiedInAYear).toEqual([]);
    expect(s.installers).toEqual([]);
    expect(s.duplicateGroups).toEqual([]);
    expect(s.totalSavings).toBe(0);
    expect(s.breakdown).toEqual([]);
    expect(s.folderName).toBe('Downloads');
  });
});

describe('computeStats: totals', () => {
  it('counts files and bundles as one item each and sums bytes', () => {
    const s = computeStats(
      scan([rec('a.txt', 10), rec('b.mov', 2_000), rec('Figma.app', 300_000, NOW, 'bundle')]),
    );
    expect(s.totalFiles).toBe(3);
    expect(s.totalBytes).toBe(302_010);
  });

  it('passes skipped counts through untouched', () => {
    const skipped = { dsStore: 4, dotfiles: 9, nodeModules: 2, git: 1, unreadable: 3 };
    expect(computeStats(scan([], { skipped })).skipped).toEqual(skipped);
  });
});

describe('computeStats: largest and items', () => {
  it('largest is the biggest file; ties broken by path ascending', () => {
    const s = computeStats(scan([rec('z.mov', 50), rec('b.mov', 50), rec('a.txt', 1)]));
    expect(s.largest?.path).toBe('b.mov');
  });

  it('items are the top 5 by size, descending', () => {
    const files = [1, 9, 3, 7, 5, 8, 2].map((n) => rec(`f${n}.bin`, n));
    expect(computeStats(scan(files)).items.map((f) => f.size)).toEqual([9, 8, 7, 5, 3]);
  });

  it('fewer than 5 files → all of them', () => {
    expect(computeStats(scan([rec('a', 1), rec('b', 2)])).items).toHaveLength(2);
  });

  it('a bundle can be the largest item', () => {
    const s = computeStats(scan([rec('Xcode.app', 9e9, NOW, 'bundle'), rec('a.mov', 1e9)]));
    expect(s.largest?.name).toBe('Xcode.app');
  });
});

describe('computeStats: files not modified in a year', () => {
  it('cutoff is the same calendar date one year earlier (UTC)', () => {
    expect(notModifiedCutoff(NOW)).toBe(Date.UTC(2025, 10, 13, 12, 0, 0));
  });

  it('strictly before the cutoff counts; exactly at the cutoff does not', () => {
    const cutoff = notModifiedCutoff(NOW);
    const s = computeStats(
      scan([rec('old.pdf', 1, cutoff - 1), rec('edge.pdf', 1, cutoff), rec('new.pdf', 1, NOW - DAY)]),
    );
    expect(s.notModifiedInAYear.map((f) => f.name)).toEqual(['old.pdf']);
  });

  it('leap day: 29 Feb 2028 → cutoff 1 Mar 2027 (no 29 Feb in 2027, so it rolls forward a day)', () => {
    const leap = Date.UTC(2028, 1, 29, 9, 0, 0);
    expect(new Date(notModifiedCutoff(leap)).toISOString()).toBe('2027-03-01T09:00:00.000Z');
  });

  it('sorted oldest first', () => {
    const s = computeStats(scan([rec('b', 1, NOW - 500 * DAY), rec('a', 1, NOW - 900 * DAY)]));
    expect(s.notModifiedInAYear.map((f) => f.name)).toEqual(['a', 'b']);
  });
});

describe('computeStats: discounts and savings', () => {
  it('installers listed largest first', () => {
    const s = computeStats(scan([rec('a.dmg', 10), rec('b.PKG', 30), rec('c.zip', 99)]));
    expect(s.installers.map((f) => f.name)).toEqual(['b.PKG', 'a.dmg']);
  });

  it('total savings = installers + duplicate extras', () => {
    const s = computeStats(
      scan([rec('Setup.dmg', 1000), rec('v.mov', 300), rec('v (1).mov', 300), rec('keep.txt', 5)]),
    );
    expect(s.totalSavings).toBe(1000 + 300);
  });

  it('NO DOUBLE COUNTING: a duplicated installer counts each copy once', () => {
    const s = computeStats(scan([rec('Setup.dmg', 1000), rec('Setup (1).dmg', 1000)]));
    expect(s.installers).toHaveLength(2);
    expect(s.duplicateGroups[0]!.reclaimable).toBe(1000);
    expect(s.totalSavings).toBe(2000);
  });

  it('savings never exceed total size', () => {
    const rand = seeded(7);
    const exts = ['dmg', 'pkg', 'mov', 'pdf', 'png'];
    for (let run = 0; run < 300; run++) {
      const files: FileRecord[] = [];
      const n = Math.floor(rand() * 30);
      for (let i = 0; i < n; i++) {
        const base = `f${Math.floor(rand() * 5)}`;
        const suffix = ['', ' (1)', ' copy', ' 2'][Math.floor(rand() * 4)];
        files.push(rec(`d${i}/${base}${suffix}.${exts[Math.floor(rand() * 5)]}`, Math.floor(rand() * 4) * 100));
      }
      const s = computeStats(scan(files));
      expect(s.totalSavings).toBeLessThanOrEqual(s.totalBytes);
      expect(s.totalSavings).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('computeStats: breakdown', () => {
  it('sums to 100 on a realistic folder', () => {
    const s = computeStats(scan([rec('a.mov', 4.5e9), rec('b.png', 3e9), rec('c.pdf', 2.5e9)]));
    expect(s.breakdown.reduce((a, b) => a + b.percent, 0)).toBe(100);
  });
});

describe('computeStats: receipt number', () => {
  it('is deterministic for the same scan and changes when the scan changes', () => {
    const a = computeStats(scan([rec('a', 1)])).receiptNo;
    expect(computeStats(scan([rec('a', 1)])).receiptNo).toBe(a);
    expect(computeStats(scan([rec('a', 2)])).receiptNo).not.toBe(a);
    expect(a).toMatch(/^\d{8}$/);
  });
});

describe('computeStatsSliced', () => {
  it('gives the same result as computeStats and pauses between phases', async () => {
    const sc = scan([rec('a.dmg', 10), rec('a (1).dmg', 10), rec('b.mov', 99, NOW - 900 * DAY)]);
    let pauses = 0;
    const sliced = await computeStatsSliced(sc, async () => {
      pauses++;
    });
    expect(sliced).toEqual(computeStats(sc));
    expect(pauses).toBeGreaterThanOrEqual(3);
  });
});

describe('computeStats: performance', () => {
  it('100k files in under 100ms', () => {
    const rand = seeded(1);
    const exts = ['mov', 'png', 'pdf', 'zip', 'dmg', 'txt', 'mp3', ''];
    const files: FileRecord[] = Array.from({ length: 100_000 }, (_, i) =>
      rec(
        `dir${i % 300}/file-${Math.floor(rand() * 60_000)}${rand() < 0.1 ? ' (1)' : ''}.${exts[i % exts.length]}`,
        Math.floor(rand() * 1e8),
        NOW - Math.floor(rand() * 1500) * DAY,
      ),
    );
    computeStats(scan(files)); // warm-up
    const t0 = performance.now();
    computeStats(scan(files));
    const ms = performance.now() - t0;
    console.info(`computeStats(100k) = ${ms.toFixed(1)}ms`);
    expect(ms).toBeLessThan(100);
  });
});
