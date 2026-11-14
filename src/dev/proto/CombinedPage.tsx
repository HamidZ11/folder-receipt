import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import spaceMono400 from '@fontsource/space-mono/files/space-mono-latin-400-normal.woff2?url';
import spaceMono700 from '@fontsource/space-mono/files/space-mono-latin-700-normal.woff2?url';
import manrope400 from '@fontsource/manrope/files/manrope-latin-400-normal.woff2?url';
import manrope600 from '@fontsource/manrope/files/manrope-latin-600-normal.woff2?url';
import { Receipt } from '../../components/receipt/Receipt.tsx';
import { copy } from '../../content/copy.ts';
import type { Receipt as ReceiptData } from '../../hooks/useFolderScan.ts';
import { usePrint } from '../../hooks/usePrint.ts';
import { download, exportNodePng, ExportFrameShell, type ExportShape } from '../../lib/export/exportReceipt.tsx';
import { fontFaceCss } from '../../lib/export/fontFaceCss.ts';
import { formatCount } from '../../lib/stats/format.ts';
import { Barcode, FolderButton, pressable } from './parts.tsx';
import { useProtoFlow, type Phase } from './useProtoFlow.ts';
import { useTear } from './useTear.ts';
import { useWindowDrop } from './useWindowDrop.ts';

const EXPORT_FONTS = [
  { family: 'Space Mono', weight: 400, url: spaceMono400 },
  { family: 'Space Mono', weight: 700, url: spaceMono700 },
  { family: 'Manrope', weight: 400, url: manrope400 },
  { family: 'Manrope', weight: 600, url: manrope600 },
];

const label = 'text-label uppercase tracking-(--label-tracking) text-(--color-box-muted)';

type PaperOpts = { forExport: boolean; redact: boolean; tornTop: boolean };

/** A's thermal paper: Space Mono, dotted rules, zigzag edge(s), barcode, warm ink. */
function Paper({ r, forExport, redact, tornTop }: { r: ReceiptData } & PaperOpts) {
  return (
    <div className="d-paper [filter:var(--paper-shadow)]">
      <div className="d-tear-edge" data-torn-top={tornTop ? '' : undefined}>
        <Receipt
          stats={r.stats}
          files={r.scan.files}
          sample={r.source === 'sample'}
          forExport={forExport}
          redact={redact}
          footerExtra={<Barcode value={r.stats.receiptNo} />}
        />
      </div>
    </div>
  );
}

async function save(r: ReceiptData, shape: ExportShape, opts: Omit<PaperOpts, 'forExport'>) {
  const fontCss = await fontFaceCss(EXPORT_FONTS);
  const blob = await exportNodePng(
    <ExportFrameShell>
      <Paper r={r} forExport {...opts} />
    </ExportFrameShell>,
    shape,
    { fontCss },
  );
  download(blob, copy.export.fileName(r.stats.receiptNo, shape));
}

/** True once the current receipt's print has landed (or it never printed). */
function useLanded(paper: RefObject<HTMLElement | null>, receipt: ReceiptData | null) {
  const [landedFor, setLandedFor] = useState<ReceiptData | null>(null);
  useLayoutEffect(() => {
    if (!receipt?.print) return;
    const anim = paper.current?.getAnimations()[0];
    if (anim) anim.finished.then(() => setLandedFor(receipt), () => setLandedFor(receipt));
    else queueMicrotask(() => setLandedFor(receipt));
  }, [paper, receipt]);
  return receipt !== null && (!receipt.print || landedFor === receipt);
}

/**
 * D · Combined. B's device (tiny labels, big mono counter, button and export
 * controls in the box, slot on its bottom edge), A's thermal paper feeding
 * down out of the slot, C's colours. Export controls and the tear hint appear
 * only once the paper has landed.
 */
export function CombinedPage({ fixed }: { fixed: Phase | null }) {
  const flow = useProtoFlow(fixed);
  const dragging = useWindowDrop(flow.onDrop);
  const paper = useRef<HTMLDivElement>(null);
  const [tornTop, setTornTop] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [busy, setBusy] = useState(false);
  const { receipt, scanning, setReceipt } = flow;

  usePrint(paper, receipt, scanning, 'down');
  const landed = useLanded(paper, receipt);
  const ready = landed && !scanning && receipt !== null;

  const tearApi = useTear(paper, {
    away: 1,
    enabled: receipt !== null,
    onTearStart: () => flushSync(() => setTornTop(true)), // the rip shows on the top edge at once
    onTear: async () => {
      if (!receipt) return;
      try {
        await save(receipt, 'tall', { redact: true, tornTop: true });
      } catch {
        /* the export failed; the paper still comes back */
      } finally {
        flushSync(() => setReceipt({ ...receipt, print: true }));
        tearApi.reset();
      }
    },
  });

  const exportAs = async (shape: ExportShape) => {
    if (!receipt) return;
    setBusy(true);
    try {
      await save(receipt, shape, { redact: !showNames, tornTop });
    } finally {
      setBusy(false);
    }
  };

  const state = scanning
    ? copy.device.state.scanning
    : receipt && !landed
      ? copy.device.state.printing
      : receipt
        ? copy.device.state.printed
        : copy.device.state.ready;
  const counter = scanning ? formatCount(flow.seen) : receipt ? formatCount(receipt.stats.totalFiles) : '—';
  const active = scanning || (receipt !== null && !landed) || dragging;
  const chip = `h-7 rounded-control border border-(--color-chip-line) px-2.5 text-label uppercase tracking-(--label-tracking) text-(--color-box-text) disabled:opacity-50 ${pressable}`;

  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col px-(--page-gutter) pt-8 pb-32 sm:pt-16">
      <section
        aria-labelledby="device-title"
        data-dragging={dragging || undefined}
        data-testid="device"
        className="relative z-10 rounded-(--radius-device) border border-(--color-box-line) bg-(--color-box) px-6 pt-5 pb-11 text-(--color-box-text) shadow-(--shadow-device) transition-colors duration-(--duration-hover) ease-out data-dragging:border-(--color-box-line-active)"
      >
        <div className={`flex items-center justify-between ${label}`}>
          <span>{copy.device.input}</span>
          <span className="flex items-center gap-1.5" role="status" aria-live="polite" data-testid="device-status">
            {copy.device.status} · {state}
            <span aria-hidden="true" className={`size-1.5 rounded-full ${active ? 'bg-accent' : 'bg-(--color-box-line-active)'}`} />
          </span>
        </div>

        <h1 id="device-title" className="mt-7 text-title font-semibold tracking-tight">
          {copy.dropZone.title}
        </h1>
        <p className="text-small text-(--color-box-muted)">{copy.dropZone.subtitle}</p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div data-testid="display" className="min-w-0">
            <div className={label}>{copy.device.files}</div>
            <div className="num font-mono text-(length:--display-size) leading-none tracking-tight">{counter}</div>
          </div>
          <FolderButton
            onPick={flow.onPick}
            className={`h-11 shrink-0 rounded-control bg-(--color-button) px-5 text-small font-semibold text-(--color-button-text) ${pressable}`}
          />
        </div>
        {flow.error && <p className="mt-3 text-small text-danger">{copy.status.errors[flow.error]}</p>}

        {/* Export controls: hidden while printing (no transition), fade in once the paper has landed. */}
        <div
          role="group"
          aria-label={copy.device.exportGroup}
          data-testid="export-controls"
          data-shown={ready ? '' : undefined}
          inert={!ready}
          className={`mt-5 flex items-center gap-1.5 ${ready ? 'opacity-100 transition-opacity duration-(--duration-fade) ease-out' : 'opacity-0'}`}
        >
          <button type="button" className={chip} disabled={busy} onClick={() => void exportAs('tall')}>
            {copy.export.tallShort}
          </button>
          <button type="button" className={chip} disabled={busy} onClick={() => void exportAs('square')}>
            {copy.export.squareShort}
          </button>
          <button
            type="button"
            aria-pressed={showNames}
            aria-label={copy.export.showNames}
            onClick={() => setShowNames(!showNames)}
            className={`${chip} ml-auto aria-pressed:bg-(--color-box-text) aria-pressed:text-(--color-box)`}
          >
            {copy.export.namesShort}
          </button>
        </div>

        {/* The slot on the bottom edge; the paper's clipping edge is its centre line. */}
        <div aria-hidden="true" className="absolute inset-x-5 bottom-4 h-[3px] rounded-full bg-(--color-slot)" />
      </section>

      {receipt && (
        <div className="relative z-20 -mt-[17.5px] px-6">
          <div data-testid="slot" className="relative -mx-(--print-slot-bleed) overflow-hidden px-(--print-slot-bleed) pb-(--print-slot-bleed)">
            <div ref={paper} data-testid="paper" className="cursor-grab select-none data-tearing:cursor-grabbing">
              <Paper r={receipt} forExport={false} redact={false} tornTop={tornTop} />
              <div
                data-tear-grip
                data-testid="tear-hint"
                className={`flex h-11 touch-none items-center justify-center text-label tracking-(--label-tracking) text-text-muted uppercase ${ready ? 'opacity-100 transition-opacity duration-(--duration-fade) ease-out' : 'opacity-0'}`}
              >
                {copy.device.tearHint}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 px-1 text-small text-text-muted">{copy.privacy.statement}</p>
    </main>
  );
}
