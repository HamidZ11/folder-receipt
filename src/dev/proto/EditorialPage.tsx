import { Receipt } from '../../components/receipt/Receipt.tsx';
import { copy } from '../../content/copy.ts';
import { formatCount } from '../../lib/stats/format.ts';
import { FolderButton, PaperArea, pressable, type PaperRender } from './parts.tsx';
import { protoCopy } from './protoCopy.ts';
import { useProtoFlow, type Phase } from './useProtoFlow.ts';
import { useWindowDrop } from './useWindowDrop.ts';

/**
 * C · Editorial. No skeuomorphism. The drop area is type on the page between
 * two rules; the receipt is the current card refined: a strong type scale,
 * mono numerals, generous spacing. It rises header-first out of the slot
 * below it (the live behaviour). Export by button only.
 */
export function EditorialPage({ fixed }: { fixed: Phase | null }) {
  const flow = useProtoFlow(fixed);
  const dragging = useWindowDrop(flow.onDrop);

  const status = flow.scanning
    ? copy.status.filesFound(flow.seen, formatCount(flow.seen))
    : flow.receipt
      ? copy.status.scanned(flow.receipt.scan.rootName, flow.receipt.stats.totalFiles, formatCount(flow.receipt.stats.totalFiles))
      : protoCopy.display.ready;

  const render: PaperRender = (r, { forExport, redact }) => (
    <Receipt stats={r.stats} files={r.scan.files} sample={r.source === 'sample'} forExport={forExport} redact={redact} />
  );

  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col px-(--page-gutter) pt-10 pb-32 sm:pt-20">
      <section
        aria-labelledby="drop-title"
        data-dragging={dragging || undefined}
        className="border-y border-surface-line py-9 transition-colors duration-(--duration-hover) ease-out data-dragging:border-surface-line-active"
      >
        <p className="text-label font-medium tracking-[0.16em] text-text-muted uppercase">{copy.receipt.title}</p>
        <h1 id="drop-title" className="mt-4 text-title font-semibold text-text">
          {copy.dropZone.title}
        </h1>
        <p className="mt-2 text-body text-text-muted">{copy.dropZone.subtitle}</p>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <FolderButton onPick={flow.onPick} className={`h-11 rounded-control bg-text px-5 text-small font-medium text-page ${pressable}`} />
          <p role="status" aria-live="polite" data-testid="display" className="num font-mono text-small text-text-muted">
            {status}
          </p>
        </div>
        {flow.error && <p className="mt-3 text-small text-danger">{copy.status.errors[flow.error]}</p>}
      </section>

      <div className="mt-10">
        <PaperArea flow={flow} direction="up" tear={false} render={render} />
      </div>

      <p className="mt-6 px-1 text-small text-text-muted">{copy.privacy.statement}</p>
    </main>
  );
}
