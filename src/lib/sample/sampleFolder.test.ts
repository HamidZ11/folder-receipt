import { describe, expect, it } from 'vitest';
import { computeStats } from '../stats/computeStats.ts';
import { makeSampleScan } from './sampleFolder.ts';

const NOW = Date.UTC(2026, 10, 13, 12);

describe('sample folder', () => {
  const scan = makeSampleScan(NOW);
  const s = computeStats(scan);

  it('is deterministic', () => expect(makeSampleScan(NOW)).toEqual(scan));
  it('~1,200 files with unique paths', () => {
    expect(scan.files.length).toBeGreaterThan(1100);
    expect(scan.files.length).toBeLessThan(1400);
    expect(new Set(scan.files.map((f) => f.path)).size).toBe(scan.files.length);
  });
  it('fills every receipt section', () => {
    expect(s.items).toHaveLength(5);
    expect(s.installers.length).toBeGreaterThan(0);
    expect(s.duplicateGroups.length).toBeGreaterThanOrEqual(4);
    expect(s.notModifiedInAYear.length).toBeGreaterThan(0);
    expect(s.totalSavings).toBeGreaterThan(0);
    expect(s.breakdown.length).toBeGreaterThanOrEqual(4);
    expect(s.breakdown.reduce((a, b) => a + b.percent, 0)).toBe(100);
  });
});
