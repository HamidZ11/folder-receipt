import { Receipt } from '../../components/receipt/Receipt.tsx';
import { copy } from '../../content/copy.ts';
import { Barcode, displayText, FolderButton, PaperArea, pressable, type PaperRender } from './parts.tsx';
import { useProtoFlow, type Phase } from './useProtoFlow.ts';
import { useWindowDrop } from './useWindowDrop.ts';

/**
 * A · Thermal. The drop zone is a printer body with a slot on its underside and
 * a small display for the scan counter. Thermal paper feeds down out of the
 * slot (footer first, as a hanging receipt does): mono type, dotted rules,
 * a torn zigzag edge, a barcode of the receipt number, warm black ink.
 * Pull the paper down past the threshold to tear it off and save a PNG.
 */
export function ThermalPage({ fixed }: { fixed: Phase | null }) {
  const flow = useProtoFlow(fixed);
  const dragging = useWindowDrop(flow.onDrop);
  const display = displayText(flow);

  const render: PaperRender = (r, { forExport, redact }) => (
    <div className="[filter:var(--paper-shadow)]">
      <div className="paper-tear-edge">
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

  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col px-(--page-gutter) pt-8 pb-32 sm:pt-16">
      <section
        aria-labelledby="printer-title"
        data-dragging={dragging || undefined}
        className="relative z-10 rounded-(--radius-device) border border-surface-line bg-surface px-5 pt-5 pb-10 shadow-(--shadow-device) transition-colors duration-(--duration-hover) ease-out data-dragging:border-surface-line-active"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pt-0.5">
            <h1 id="printer-title" className="text-title font-medium text-text">
              {copy.dropZone.title}
            </h1>
            <p className="text-small text-text-muted">{copy.dropZone.subtitle}</p>
          </div>
          <div
            role="status"
            aria-live="polite"
            data-testid="display"
            className="min-w-24 shrink-0 rounded-md bg-(--color-display-bg) px-3 py-2 text-right font-mono text-(--color-display-text) shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)]"
          >
            <div className="text-label uppercase opacity-70">{display.label}</div>
            <div className="num text-title leading-tight">{display.value}</div>
          </div>
        </div>
        <FolderButton
          onPick={flow.onPick}
          className={`mt-5 rounded-control border border-surface-line px-4 py-2 text-small font-medium text-text hover:border-surface-line-active ${pressable}`}
        />
        {flow.error && <p className="mt-3 text-small text-danger">{copy.status.errors[flow.error]}</p>}
        {/* The slot: the paper's clipping edge sits on its centre line. */}
        <div aria-hidden="true" className="absolute inset-x-6 bottom-3.5 h-1.5 rounded-full bg-(--color-slot) shadow-[inset_0_1px_2px_rgb(0_0_0/0.9)]" />
      </section>

      {/* Paper hangs in front of the printer from the slot line (-mt = distance from the slot to the body's bottom). */}
      <div className="relative z-20 -mt-[17px] px-8">
        <PaperArea flow={flow} direction="down" tear render={render} />
      </div>

      <p className="mt-6 px-1 text-small text-text-muted">{copy.privacy.statement}</p>
    </main>
  );
}
