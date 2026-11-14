// Dev-only page-environment prototypes (?bg=1–4). Never in the production build.
import { useState } from 'react';
import type { Receipt } from '../hooks/useFolderScan.ts';
import { DotField } from './env/DotField.tsx';
import { Spike } from './env/Spike.tsx';
import { Surface } from './env/Surface.tsx';
import { Wordmark } from './env/Wordmark.tsx';

const OPTIONS = ['Plain', 'Dots', 'Spike', 'Surface', 'Wordmark'] as const;
const read = () => {
  const n = Number(new URLSearchParams(location.search).get('bg'));
  return n >= 1 && n <= 4 ? n : 0;
};

type Props = { scanning: boolean; seen: number; landed: boolean; receipt: Receipt };

/** Renders the chosen environment behind the page and a small switcher at the top. */
export default function DevEnvironment({ scanning, seen, landed, receipt }: Props) {
  const [bg, setBg] = useState(read);
  const select = (n: number) => {
    const url = new URL(location.href);
    if (n) url.searchParams.set('bg', String(n));
    else url.searchParams.delete('bg');
    history.replaceState(null, '', url);
    setBg(n);
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 overflow-x-clip">
        {bg === 1 && <DotField seen={seen} active={scanning || !landed} />}
        {bg === 2 && <Spike receipt={receipt} landed={landed} />}
        {bg === 3 && <Surface />}
        {bg === 4 && <Wordmark />}
      </div>
      <div
        data-testid="dev-env-toggle"
        className="fixed top-2 left-1/2 z-50 flex max-w-[calc(100vw-16px)] -translate-x-1/2 gap-0.5 overflow-x-auto rounded-full bg-dev-track p-0.5 font-sans text-label"
      >
        {OPTIONS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => select(i)}
            aria-pressed={bg === i}
            className="shrink-0 rounded-full px-3 py-1 whitespace-nowrap text-dev-text aria-pressed:bg-dev-pill aria-pressed:text-dev-text-active"
          >
            {i ? `${i} · ${name}` : name}
          </button>
        ))}
      </div>
    </>
  );
}
