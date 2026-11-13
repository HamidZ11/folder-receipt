import { describe, expect, it } from 'vitest';
import { rec } from '../stats/test-helpers.ts';
import { sortFiles, visibleRange } from './sortFiles.ts';

const files = [rec('b/file 10.pdf', 5, 300), rec('a/file 2.pdf', 9, 100), rec('c/File 1.pdf', 5, 200)];

describe('sortFiles', () => {
  it('size desc, ties by path', () =>
    expect(sortFiles(files, 'size', 'desc').map((f) => f.path)).toEqual(['a/file 2.pdf', 'b/file 10.pdf', 'c/File 1.pdf']));
  it('name asc is natural and case-insensitive (1, 2, 10)', () =>
    expect(sortFiles(files, 'name', 'asc').map((f) => f.name)).toEqual(['File 1.pdf', 'file 2.pdf', 'file 10.pdf']));
  it('date asc = oldest first; desc reverses', () => {
    expect(sortFiles(files, 'date', 'asc').map((f) => f.lastModified)).toEqual([100, 200, 300]);
    expect(sortFiles(files, 'date', 'desc').map((f) => f.lastModified)).toEqual([300, 200, 100]);
  });
  it('does not mutate the input', () => {
    const copy = [...files];
    sortFiles(files, 'name', 'asc');
    expect(files).toEqual(copy);
  });
});

describe('visibleRange', () => {
  it('top of a long list renders the viewport plus overscan', () =>
    expect(visibleRange(0, 320, 32, 100_000)).toEqual({ first: 0, last: 14 }));
  it('middle and bottom are clamped', () => {
    expect(visibleRange(3200, 320, 32, 100_000)).toEqual({ first: 96, last: 114 });
    expect(visibleRange(32 * 99_990, 320, 32, 100_000)).toEqual({ first: 99_986, last: 100_000 });
  });
  it('short list renders all', () => expect(visibleRange(0, 96, 32, 3)).toEqual({ first: 0, last: 3 }));
});
