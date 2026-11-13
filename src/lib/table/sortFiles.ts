import type { FileRecord } from '../stats/types.ts';

export type SortKey = 'name' | 'size' | 'date';
export type SortDir = 'asc' | 'desc';

/** Natural default per column: biggest, A→Z, oldest first. */
export const DEFAULT_DIR: Record<SortKey, SortDir> = { size: 'desc', name: 'asc', date: 'asc' };

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

export function sortFiles(files: readonly FileRecord[], key: SortKey, dir: SortDir): FileRecord[] {
  const s = dir === 'asc' ? 1 : -1;
  const byPath = (a: FileRecord, b: FileRecord) => collator.compare(a.path, b.path);
  const cmp =
    key === 'size'
      ? (a: FileRecord, b: FileRecord) => s * (a.size - b.size) || byPath(a, b)
      : key === 'date'
        ? (a: FileRecord, b: FileRecord) => s * (a.lastModified - b.lastModified) || byPath(a, b)
        : (a: FileRecord, b: FileRecord) => s * collator.compare(a.name, b.name) || byPath(a, b);
  return [...files].sort(cmp);
}

/** Rows to render for a fixed-row-height viewport, with overscan. */
export function visibleRange(scrollTop: number, viewportPx: number, rowPx: number, count: number, overscan = 4) {
  const first = Math.max(0, Math.floor(scrollTop / rowPx) - overscan);
  const last = Math.min(count, Math.ceil((scrollTop + viewportPx) / rowPx) + overscan);
  return { first, last };
}
