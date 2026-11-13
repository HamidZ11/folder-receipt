import { describe, expect, it } from 'vitest';
import { computeStats } from '../lib/stats/computeStats.ts';
import { FIXTURES, makeFixture, NAME_200 } from './fixtures.ts';

const NOW = Date.UTC(2026, 10, 13, 12);

describe('break-ui fixtures', () => {
  it('the long name is exactly 200 characters', () => expect(NAME_200).toHaveLength(200));

  it.each(FIXTURES)('%s computes without NaN and adds up', (name) => {
    const s = computeStats(makeFixture(name, NOW));
    expect(JSON.stringify(s)).not.toMatch(/NaN|null,"items"/);
    expect(s.installerBytes + s.duplicateBytes).toBe(s.totalSavings);
    if (s.totalBytes > 0) expect(s.breakdown.reduce((a, b) => a + b.percent, 0)).toBe(100);
  });

  it('worst case exceeds 2 TB, has 6 breakdown segments and 4-digit duplicate count', () => {
    const s = computeStats(makeFixture('worst', NOW));
    expect(s.totalBytes).toBeGreaterThan(2e12);
    expect(s.breakdown).toHaveLength(6);
    expect(s.duplicateGroups.length).toBeGreaterThanOrEqual(1_284);
  });
});
