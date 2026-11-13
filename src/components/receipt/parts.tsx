import type { ReactNode } from 'react';

/** Every visual row carries data-row; the print animation (slice 5) reveals them in DOM order. */

export function Divider() {
  return <hr data-row className="my-4 border-0 border-t-(length:--hairline-width) border-hairline" />;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 data-row className="mb-2 text-label font-medium text-ink-muted uppercase">
      {children}
    </h3>
  );
}

/** Label left, value right. The label column can shrink and truncate; the value never does unless it opts in. */
export function Row({
  label,
  value,
  shrinkValue = false,
  className = '',
}: {
  label: ReactNode;
  value: ReactNode;
  /** Let the value side shrink (for names). Numbers never shrink. */
  shrinkValue?: boolean;
  className?: string;
}) {
  return (
    <div data-row className={`flex items-baseline justify-between gap-4 py-0.5 ${className}`}>
      <dt className={shrinkValue ? 'shrink-0' : 'min-w-0'}>{label}</dt>
      <dd className={`num text-right ${shrinkValue ? 'flex min-w-0 justify-end' : 'shrink-0'}`}>{value}</dd>
    </div>
  );
}
