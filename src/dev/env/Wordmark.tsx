import { copy } from '../../content/copy.ts';

/** 4 · Giant wordmark: "FOLDER RECEIPT" in Space Mono, very low contrast, fixed behind everything. */
export function Wordmark() {
  const [a, b] = copy.environment.wordmark.split(' ');
  return (
    <div
      data-env="wordmark"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center overflow-hidden font-mono leading-[0.9] font-bold tracking-tight text-(--env-wordmark) select-none"
      style={{ fontSize: 'var(--env-wordmark-size)' }}
    >
      <span>{a}</span>
      <span>{b}</span>
    </div>
  );
}
