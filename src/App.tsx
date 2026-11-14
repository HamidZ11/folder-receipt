import { lazy, Suspense, useState } from 'react';
import { copy } from './content/copy.ts';
import { DropZone } from './components/DropZone.tsx';
import { ExportBar } from './components/ExportBar.tsx';
import { ReceiptSlot } from './components/ReceiptSlot.tsx';
import { useFolderScan, type Receipt } from './hooks/useFolderScan.ts';

// Dev-only break-ui toggle: on in `pnpm dev` and the e2e build (VITE_WORST_CASES=1).
// Written inline so Vite substitutes the env values and the bundler drops the
// import (and the fixtures) from the production build. Checked by `pnpm build` + grep.
const DevData =
  import.meta.env.DEV || import.meta.env.VITE_WORST_CASES === '1' ? lazy(() => import('./dev/DevData.tsx')) : null;
// Dev-only design prototypes (?proto=A|B|C). Same gating, so production never ships them.
const ProtoHarness =
  import.meta.env.DEV || import.meta.env.VITE_WORST_CASES === '1' ? lazy(() => import('./dev/proto/Harness.tsx')) : null;
const wantsProto = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('proto');

export function App() {
  if (ProtoHarness && wantsProto())
    return (
      <Suspense fallback={null}>
        <ProtoHarness />
      </Suspense>
    );
  return <Live />;
}

function Live() {
  const { receipt, status, onDrop, onPick } = useFolderScan();
  const [devReceipt, setDevReceipt] = useState<Receipt | null>(null);
  const shown = devReceipt ?? receipt;

  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col gap-4 px-(--page-gutter) pt-8 pb-16 sm:pt-16">
      <DropZone status={status} receipt={shown} onDrop={onDrop} onPick={onPick} />
      <ReceiptSlot receipt={shown} scanning={status.phase === 'scanning'} />
      <ExportBar receipt={shown} />
      <p className="px-1 text-small text-text-muted">{copy.privacy.statement}</p>
      {DevData && (
        <Suspense fallback={null}>
          <DevData onChange={setDevReceipt} />
        </Suspense>
      )}
    </main>
  );
}
