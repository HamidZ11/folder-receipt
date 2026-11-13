import { describe, expect, it } from 'vitest';
import { formatBytes, formatCount, formatDateTime, formatPercent } from './format.ts';

describe('formatBytes (decimal, like Finder)', () => {
  it.each([
    [0, '0 B'],
    [999, '999 B'],
    [1000, '1.0 KB'],
    [1_500, '1.5 KB'],
    [245_300_000, '245.3 MB'],
    [18_400_000_000, '18.4 GB'],
    [2_000_000_000_000, '2.0 TB'],
    [1_234_567_000_000_000, '1,234.6 TB'],
  ])('%d → %s', (n, out) => {
    expect(formatBytes(n)).toBe(out);
  });

  it('rounding never produces 1,000.0 of a unit; it rolls over', () => {
    expect(formatBytes(999_950)).toBe('1.0 MB');
    expect(formatBytes(999_960_000_000)).toBe('1.0 TB');
  });
});

describe('formatCount', () => {
  it('uses en-GB thousands separators', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1248)).toBe('1,248');
    expect(formatCount(100_000)).toBe('100,000');
  });
});

describe('formatPercent', () => {
  it('integer with %', () => expect(formatPercent(45)).toBe('45%'));
});

describe('formatDateTime', () => {
  it('en-GB date and 24h time in the given zone', () => {
    expect(formatDateTime(Date.UTC(2026, 10, 13, 15, 43), 'UTC')).toBe('13 Nov 2026, 15:43');
  });
});
