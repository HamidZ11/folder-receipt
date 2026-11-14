import { lazy, Suspense, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Device } from './components/Device.tsx';
import { ThermalPaper } from './components/receipt/ThermalPaper.tsx';
import { copy } from './content/copy.ts';
import { useFolderScan, type Receipt } from './hooks/useFolderScan.ts';
import { useLanded } from './hooks/useLanded.ts';
import { usePrint } from './hooks/usePrint.ts';
import { useTear } from './hooks/useTear.ts';
import { useWindowDrop } from './hooks/useWindowDrop.ts';
import { download, exportReceiptPng, type ExportShape } from './lib/export/exportReceipt.tsx';

// Dev-only break-ui toggle: on in `pnpm dev` and the e2e build (VITE_WORST_CASES=1).
// Written inline so Vite substitutes the env values and the bundler drops the
// import (and the fixtures) from the production build. Checked by `pnpm check:prod`.
const DevData =
  import.meta.env.DEV || import.meta.env.VITE_WORST_CASES === '1' ? lazy(() => import('./dev/DevData.tsx')) : null;

export function App() {
  const { receipt: live, status, onDrop, onPick } = useFolderScan();
  const [devReceipt, setDevReceipt] = useState<Receipt | null>(null);
  // A tear re-prints the same receipt; it lives here so the reprint survives the next render.
  const [reprint, setReprint] = useState<Receipt | null>(null);
  const base = devReceipt ?? live;
  const receipt = reprint && reprint.scan === base.scan ? reprint : base;

  const paper = useRef<HTMLDivElement>(null);
  const dragging = useWindowDrop(onDrop);
  const scanning = status.phase === 'scanning';
  const [tornTop, setTornTop] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [busy, setBusy] = useState(false);

  usePrint(paper, receipt, scanning, 'down');
  const landed = useLanded(paper, receipt);

  const tear = useTear(paper, {
    away: 1,
    enabled: true,
    onTearStart: () => flushSync(() => setTornTop(true)), // the rip shows on the top edge at once
    onTear: async () => {
      try {
        download(await exportReceiptPng(receipt, 'tall', { redact: true, tornTop: true }), copy.export.fileName(receipt.stats.receiptNo, 'tall'));
      } catch {
        /* the export failed; the paper still comes back */
      } finally {
        // A fresh receipt feeds out of the slot; clear the torn one in the same frame.
        flushSync(() => setReprint({ ...receipt, print: true }));
        tear.reset();
      }
    },
  });

  const onExport = async (shape: ExportShape) => {
    setBusy(true);
    try {
      download(await exportReceiptPng(receipt, shape, { redact: !showNames, tornTop }), copy.export.fileName(receipt.stats.receiptNo, shape));
    } catch {
      /* nothing saved; the controls stay usable */
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col px-(--page-gutter) pt-8 pb-16 sm:max-w-wide sm:pt-16">
      <Device
        receipt={receipt}
        status={status}
        landed={landed}
        dragging={dragging}
        busy={busy}
        showNames={showNames}
        onShowNames={setShowNames}
        onPick={onPick}
        onExport={(shape) => void onExport(shape)}
      />

      {/* The paper hangs from the slot on the device's bottom edge and feeds down out of it. */}
      <section aria-label={copy.receiptSlot.label} className="relative z-20 -mt-[17.5px] px-6">
        {/* The slot lip: drawn over the paper so it emerges from under a seam, not from the box edge. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-5 top-0 z-10 h-2 -translate-y-1/2 rounded-full bg-(--color-slot) shadow-[0_1px_0_var(--color-slot-highlight)]"
        />
        <div data-testid="slot" className="relative -mx-(--print-slot-bleed) overflow-hidden px-(--print-slot-bleed) pb-(--print-slot-bleed)">
          <div ref={paper} data-testid="paper" className="cursor-grab select-none data-tearing:cursor-grabbing">
            <ThermalPaper receipt={receipt} tornTop={tornTop} />
            <div
              data-tear-grip
              data-testid="tear-hint"
              className={`flex h-11 touch-none items-center justify-center text-label tracking-(--label-tracking) text-text-muted uppercase ${landed && !scanning ? 'opacity-100 transition-opacity duration-(--duration-fade) ease-out' : 'opacity-0'}`}
            >
              {copy.device.tearHint}
            </div>
          </div>
        </div>
      </section>

      {/* The page's only footer text, below everything. */}
      <footer className="mt-10 px-1 text-label text-text-muted">{copy.privacy.statement}</footer>

      {DevData && (
        <Suspense fallback={null}>
          <DevData onChange={setDevReceipt} />
        </Suspense>
      )}
    </main>
  );
}
