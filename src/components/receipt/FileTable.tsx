import { useMemo, useRef, useState } from 'react';
import { copy } from '../../content/copy.ts';
import { formatBytes, formatDate } from '../../lib/stats/format.ts';
import type { FileRecord } from '../../lib/stats/types.ts';
import { DEFAULT_DIR, sortFiles, visibleRange, type SortDir, type SortKey } from '../../lib/table/sortFiles.ts';
import { FileName } from './FileName.tsx';

const ROW_UNITS = 8; // rows are h-8 = 8 × --spacing
const MAX_VISIBLE_ROWS = 10;

/** Row height in px, from the spacing token, so JS and CSS agree. */
function rowPx(): number {
  const spacing = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spacing')) || 4;
  return spacing * ROW_UNITS;
}

const COLS = 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3';

/** Sortable file table with hand-rolled fixed-row virtualisation (only the visible window is in the DOM). */
export function FileTable({ files, label }: { files: readonly FileRecord[]; label: string }) {
  const [key, setKey] = useState<SortKey>('size');
  const [dir, setDir] = useState<SortDir>('desc');
  const [scrollTop, setScrollTop] = useState(0);
  const [row] = useState(rowPx);
  const viewport = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => sortFiles(files, key, dir), [files, key, dir]);
  const height = Math.min(sorted.length, MAX_VISIBLE_ROWS) * row;
  const { first, last } = visibleRange(scrollTop, height, row, sorted.length);

  const sortBy = (k: SortKey) => {
    if (k === key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else {
      setKey(k);
      setDir(DEFAULT_DIR[k]);
    }
    viewport.current?.scrollTo({ top: 0 });
  };

  const header = (k: SortKey, text: string, align: string) => (
    <div role="columnheader" aria-sort={key === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={align}>
      <button type="button" onClick={() => sortBy(k)} className="text-label font-medium text-ink-muted uppercase">
        {text}
        {key === k && <span aria-hidden="true">{dir === 'asc' ? ' ↑' : ' ↓'}</span>}
      </button>
    </div>
  );

  return (
    <div role="table" aria-label={copy.receipt.expand.tableLabel(label)} aria-rowcount={sorted.length + 1} className="mt-2 text-small">
      <div role="row" aria-rowindex={1} className={`${COLS} h-8 border-b-(length:--hairline-width) border-hairline`}>
        {header('name', copy.receipt.expand.columns.name, 'min-w-0')}
        {header('size', copy.receipt.expand.columns.size, 'text-right')}
        {header('date', copy.receipt.expand.columns.date, 'text-right')}
      </div>
      <div
        ref={viewport}
        role="rowgroup"
        data-testid="file-table-viewport"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="relative overflow-y-auto overscroll-contain"
        style={{ height }}
      >
        <div style={{ height: sorted.length * row }}>
          {sorted.slice(first, last).map((f, i) => (
            <div
              key={f.path}
              role="row"
              aria-rowindex={first + i + 2}
              className={`${COLS} absolute inset-x-0 h-8`}
              style={{ top: (first + i) * row }}
            >
              <div role="cell" className="min-w-0 overflow-hidden">
                <FileName name={f.name} />
              </div>
              <div role="cell" className="num text-right">
                {formatBytes(f.size)}
              </div>
              <div role="cell" className="num text-right text-ink-muted">
                {formatDate(f.lastModified)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
