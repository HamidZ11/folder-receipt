import { Receipt } from '../../components/receipt/Receipt.tsx';
import { copy } from '../../content/copy.ts';
import { displayText, FolderButton, PaperArea, pressable, type PaperRender } from './parts.tsx';
import { protoCopy } from './protoCopy.ts';
import { useProtoFlow, type Phase } from './useProtoFlow.ts';
import { useWindowDrop } from './useWindowDrop.ts';

const label = 'text-label uppercase tracking-(--label-tracking) text-text-muted';

/**
 * B · Object. A precise, flat hardware printer: one body, tiny uppercase
 * labels, a large mono counter, one strong accent (the button and the status
 * light), crisp white paper with a straight cut. The paper feeds down out of
 * the slot on the underside; pull it down to tear and save.
 */
export function ObjectPage({ fixed }: { fixed: Phase | null }) {
  const flow = useProtoFlow(fixed);
  const dragging = useWindowDrop(flow.onDrop);
  const display = displayText(flow);
  const live = flow.scanning || dragging;

  const render: PaperRender = (r, { forExport, redact }) => (
    <Receipt stats={r.stats} files={r.scan.files} sample={r.source === 'sample'} forExport={forExport} redact={redact} />
  );

  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col px-(--page-gutter) pt-8 pb-32 sm:pt-16">
      <section
        aria-labelledby="device-title"
        data-dragging={dragging || undefined}
        className="relative z-10 rounded-(--radius-device) border border-surface-line bg-surface px-6 pt-5 pb-11 shadow-(--shadow-device) transition-colors duration-(--duration-hover) ease-out data-dragging:border-surface-line-active"
      >
        <div className={`flex items-center justify-between ${label}`}>
          <span>{protoCopy.labels.input}</span>
          <span className="flex items-center gap-1.5">
            {protoCopy.labels.status}
            <span aria-hidden="true" className={`size-1.5 rounded-full ${live ? 'bg-accent' : 'bg-surface-line-active'}`} />
          </span>
        </div>

        <h1 id="device-title" className="mt-7 text-title font-semibold tracking-tight text-text">
          {copy.dropZone.title}
        </h1>
        <p className="text-small text-text-muted">{copy.dropZone.subtitle}</p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div role="status" aria-live="polite" data-testid="display" className="min-w-0">
            <div className={label}>{display.label}</div>
            <div className="num font-mono text-(length:--display-size) leading-none tracking-tight text-text">{display.value}</div>
          </div>
          <FolderButton
            onPick={flow.onPick}
            className={`h-11 shrink-0 rounded-control bg-accent px-5 text-small font-semibold text-text ${pressable}`}
          />
        </div>
        {flow.error && <p className="mt-3 text-small text-danger">{copy.status.errors[flow.error]}</p>}

        {/* The slot: a precise cut in the underside. The paper's clipping edge is its centre line. */}
        <div aria-hidden="true" className="absolute inset-x-7 bottom-4 h-[3px] rounded-full bg-(--color-slot)" />
        <span aria-hidden="true" className={`absolute right-7 bottom-6 ${label}`}>
          {protoCopy.labels.output}
        </span>
      </section>

      <div className="relative z-20 -mt-[17.5px] px-9">
        <PaperArea flow={flow} direction="down" tear render={render} />
      </div>

      <p className="mt-6 px-1 text-small text-text-muted">{copy.privacy.statement}</p>
    </main>
  );
}
