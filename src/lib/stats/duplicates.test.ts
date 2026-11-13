import { describe, expect, it } from 'vitest';
import { findDuplicates, normaliseName } from './duplicates.ts';
import { rec } from './test-helpers.ts';

describe('normaliseName', () => {
  it.each([
    // Chrome / Firefox
    ['report (1).pdf', 'report.pdf'],
    ['report (12).pdf', 'report.pdf'],
    // Finder "Duplicate"
    ['report copy.pdf', 'report.pdf'],
    ['report copy 2.pdf', 'report.pdf'],
    // Finder copy into a folder that already has the name
    ['report 2.pdf', 'report.pdf'],
    // no extension
    ['Makefile (1)', 'Makefile'],
    ['notes copy', 'notes'],
    // unchanged
    ['report.pdf', 'report.pdf'],
    ['.env', '.env'],
  ])('%s → %s', (input, out) => {
    expect(normaliseName(input)).toBe(out);
  });

  it('strips only one suffix', () => {
    expect(normaliseName('report (1) copy.pdf')).toBe('report (1).pdf');
  });

  it('leaves years and long numbers alone (not a copy suffix)', () => {
    expect(normaliseName('Invoice 2024.pdf')).toBe('Invoice 2024.pdf');
    expect(normaliseName('Screenshot 2026-11-13 at 10.42.11.png')).toBe('Screenshot 2026-11-13 at 10.42.11.png');
  });

  it('does not treat words ending in "copy" as a suffix', () => {
    expect(normaliseName('photocopy.pdf')).toBe('photocopy.pdf');
    expect(normaliseName('hardcopy 2.pdf')).toBe('hardcopy.pdf');
  });
});

describe('findDuplicates', () => {
  it('groups each copy-suffix pattern with its original when sizes match', () => {
    const files = [
      rec('a/report.pdf', 500),
      rec('a/report (1).pdf', 500),
      rec('a/report copy.pdf', 500),
      rec('b/report copy 3.pdf', 500),
      rec('b/report 2.pdf', 500),
    ];
    const groups = findDuplicates(files);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.name).toBe('report.pdf');
    expect(groups[0]!.files).toHaveLength(5);
    expect(groups[0]!.reclaimable).toBe(4 * 500);
  });

  it('matches identical names in different folders', () => {
    const groups = findDuplicates([rec('x/a.png', 10), rec('y/a.png', 10)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.reclaimable).toBe(10);
  });

  it('FALSE POSITIVE GUARD: same normalised name, different size → not a duplicate', () => {
    expect(findDuplicates([rec('notes.txt', 100), rec('notes 2.txt', 101)])).toEqual([]);
    expect(findDuplicates([rec('report.pdf', 100), rec('report (1).pdf', 99)])).toEqual([]);
  });

  it('same size, different names → not a duplicate', () => {
    expect(findDuplicates([rec('a.pdf', 100), rec('b.pdf', 100)])).toEqual([]);
  });

  it('ignores 0-byte files (nothing to reclaim)', () => {
    expect(findDuplicates([rec('empty.txt', 0), rec('empty (1).txt', 0)])).toEqual([]);
  });

  it('three or more copies reclaim (count − 1) × size', () => {
    const files = [rec('v.mov', 1000), rec('v (1).mov', 1000), rec('v (2).mov', 1000)];
    expect(findDuplicates(files)[0]!.reclaimable).toBe(2000);
  });

  it('is case-sensitive on names', () => {
    expect(findDuplicates([rec('A.pdf', 5), rec('a.pdf', 5)])).toEqual([]);
  });

  it('sorts groups by reclaimable bytes, largest first; keeper (shortest name) first in each group', () => {
    const groups = findDuplicates([
      rec('s (1).txt', 10),
      rec('s.txt', 10),
      rec('big (1).mov', 900),
      rec('big.mov', 900),
    ]);
    expect(groups.map((g) => g.name)).toEqual(['big.mov', 's.txt']);
    expect(groups[1]!.files[0]!.name).toBe('s.txt');
  });
});
