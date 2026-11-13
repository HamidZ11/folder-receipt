// break-ui toggle: dev-only, never in the production build.
// State lives in the URL (?data=worst) so a reload keeps it.
import { useEffect, useState } from 'react';
import type { Receipt } from '../hooks/useFolderScan.ts';
import { computeStats } from '../lib/stats/computeStats.ts';
import { FIXTURE_LABELS, FIXTURES, makeFixture, type FixtureName } from './fixtures.ts';

const readParam = (): FixtureName | null => {
  const v = new URLSearchParams(location.search).get('data');
  return v && (FIXTURES as readonly string[]).includes(v) ? (v as FixtureName) : null;
};

function build(name: FixtureName): Receipt {
  const scan = makeFixture(name, Date.now());
  return { scan, stats: computeStats(scan), source: name === 'demo' ? 'sample' : 'folder' };
}

export default function DevData({ onChange }: { onChange: (r: Receipt | null) => void }) {
  const [active, setActive] = useState<FixtureName | null>(readParam);

  useEffect(() => {
    onChange(active ? build(active) : null);
  }, [active, onChange]);

  const select = (name: FixtureName) => {
    const url = new URL(location.href);
    url.searchParams.set('data', name);
    history.replaceState(null, '', url);
    setActive(name);
  };

  return (
    <div
      data-testid="dev-data-toggle"
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-16px)] -translate-x-1/2 gap-0.5 overflow-x-auto rounded-full bg-dev-track p-0.5 font-sans text-label"
    >
      {FIXTURES.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => select(f)}
          aria-pressed={(active ?? 'demo') === f}
          className="shrink-0 rounded-full px-3 py-1 whitespace-nowrap text-dev-text aria-pressed:bg-dev-pill aria-pressed:text-dev-text-active"
        >
          {FIXTURE_LABELS[f]}
        </button>
      ))}
    </div>
  );
}
