import { useEffect, useRef, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ExportBar } from '../../components/ExportBar.tsx';
import { copy } from '../../content/copy.ts';
import type { Receipt as ReceiptData } from '../../hooks/useFolderScan.ts';
import { usePrint, type FeedDirection } from '../../hooks/usePrint.ts';
import { download, exportNodePng, ExportFrameShell } from '../../lib/export/exportReceipt.tsx';
import type { ListedFile } from '../../lib/ingest/fromFileList.ts';
import { formatCount } from '../../lib/stats/format.ts';
import { encodeITF } from './itf.ts';
import { protoCopy } from './protoCopy.ts';
import type { ProtoFlow } from './useProtoFlow.ts';
import { useTear } from './useTear.ts';

export type PaperRender = (receipt: ReceiptData, opts: { forExport: boolean; redact: boolean }) => ReactNode;

/**
 * The slot and the paper that comes out of it. The slot is the clipping edge
 * of this overflow:hidden box (top edge for 'down', bottom edge for 'up').
 * Print, tear-to-export and the export bar all use the same paper renderer.
 */
export function PaperArea({
  flow,
  direction,
  tear,
  render,
  className = '',
}: {
  flow: ProtoFlow;
  direction: FeedDirection;
  tear: boolean;
  render: PaperRender;
  className?: string;
}) {
  const paper = useRef<HTMLDivElement>(null);
  const { receipt, scanning, setReceipt } = flow;
  usePrint(paper, receipt, scanning, direction);
  const tearApi = useTear(paper, {
    away: direction === 'down' ? 1 : -1,
    enabled: tear && receipt !== null,
    onTear: async () => {
      if (!receipt) return;
      try {
        // embedFonts stays off: modern-screenshot embeds web fonts via an inline <style>, which the
        // CSP (style-src 'self') blocks. The PNG falls back to the system fonts (HANDOVER: open question).
        const blob = await exportNodePng(<ExportFrameShell>{render(receipt, { forExport: true, redact: true })}</ExportFrameShell>, 'tall', {
          embedFonts: false,
        });
        download(blob, copy.export.fileName(receipt.stats.receiptNo, 'tall'));
      } catch {
        /* the export failed; the paper still comes back */
      } finally {
        // A fresh receipt feeds out of the slot; clear the torn one in the same frame.
        flushSync(() => setReceipt({ ...receipt, print: true }));
        tearApi.reset();
      }
    },
  });

  if (!receipt) return null;
  return (
    <>
      <div
        data-testid="slot"
        className={`relative -mx-(--print-slot-bleed) overflow-hidden px-(--print-slot-bleed) pb-(--print-slot-bleed) ${className}`}
      >
        <div ref={paper} data-testid="paper" className={tear ? 'cursor-grab select-none data-tearing:cursor-grabbing' : ''}>
          {render(receipt, { forExport: false, redact: false })}
          {tear && (
            <div
              data-tear-grip
              className="flex h-11 touch-none items-center justify-center text-label text-text-muted uppercase"
            >
              {protoCopy.tear}
            </div>
          )}
        </div>
      </div>
      <ExportBar receipt={receipt} renderExport={(redact) => <ExportFrameShell>{render(receipt, { forExport: true, redact })}</ExportFrameShell>} />
    </>
  );
}

/** Interleaved 2 of 5 barcode of the receipt number, drawn as SVG bars in the ink colour. */
export function Barcode({ value }: { value: string }) {
  const modules = encodeITF(value);
  const xs = modules.reduce<number[]>((acc, _m, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + modules[i - 1]!.width], []);
  const width = xs.at(-1)! + modules.at(-1)!.width;
  return (
    <svg data-row viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`} className="mx-auto mt-4 block h-11 w-full max-w-60 text-ink">
      {modules.map((m, i) => (m.bar ? <rect key={i} x={xs[i]} y={0} width={m.width} height={40} fill="currentColor" /> : null))}
    </svg>
  );
}

/** "Choose a folder" with the hidden webkitdirectory input. */
export function FolderButton({ onPick, className }: { onPick: (files: ArrayLike<ListedFile>) => Promise<void>; className: string }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.setAttribute('webkitdirectory', ''), []);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className={className}>
        {copy.dropZone.button}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        data-testid="folder-input"
        onChange={(e) => {
          const el = e.currentTarget;
          if (el.files) void onPick(el.files).finally(() => (el.value = ''));
        }}
      />
    </>
  );
}

/** What the device display says in each phase. */
export function displayText(flow: ProtoFlow): { label: string; value: string } {
  if (flow.scanning) return { label: protoCopy.display.scanning, value: formatCount(flow.seen) };
  if (flow.receipt) return { label: protoCopy.display.files, value: formatCount(flow.receipt.stats.totalFiles) };
  return { label: protoCopy.display.ready, value: '—' };
}

export const pressable = 'transition-transform duration-(--duration-press) ease-out select-none active:scale-(--press-scale)';
