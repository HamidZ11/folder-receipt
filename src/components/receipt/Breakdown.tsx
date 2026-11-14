import { copy } from '../../content/copy.ts';
import { formatPercent } from '../../lib/stats/format.ts';
import type { BreakdownSegment } from '../../lib/stats/types.ts';
import { SectionLabel } from './parts.tsx';

// Literal class names so Tailwind generates them. Other always takes the last tone.
const TONES = ['bg-segment-1', 'bg-segment-2', 'bg-segment-3', 'bg-segment-4', 'bg-segment-5'];
const OTHER_TONE = 'bg-segment-6';
const COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' };
const toneOf = (s: BreakdownSegment, i: number) => (s.category === 'Other' ? OTHER_TONE : TONES[i] ?? OTHER_TONE);

export function Breakdown({ segments }: { segments: BreakdownSegment[] }) {
  const label = segments.map((s) => `${s.category} ${formatPercent(s.percent)}`).join(', ');
  return (
    <section>
      <SectionLabel>{copy.receipt.sections.breakdown}</SectionLabel>
      {segments.length === 0 ? (
        <p data-row className="text-ink-muted">
          {copy.receipt.empty.breakdown}
        </p>
      ) : (
        <>
          <div data-row role="img" aria-label={label} className="flex h-2 gap-px overflow-hidden rounded-bar">
            {segments.map((s, i) => (
              <div key={s.category} className={`h-full ${toneOf(s, i)}`} style={{ flexBasis: `${s.percent}%` }} />
            ))}
          </div>
          {/* Even grid, no orphans: 6 → 3+3, 5 → 3+2, 4 → 2+2. The percentage sits under its name. */}
          <ul data-row data-legend className={`mt-3 grid gap-x-3 gap-y-2 text-small ${COLS[segments.length <= 3 ? segments.length : Math.ceil(segments.length / 2)]}`} aria-hidden="true">
            {segments.map((s, i) => (
              <li key={s.category} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 whitespace-nowrap">
                <span className={`size-2 rounded-full ${toneOf(s, i)}`} />
                <span className="truncate">{s.category}</span>
                <span className="num col-start-2 text-ink-muted">{formatPercent(s.percent)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
