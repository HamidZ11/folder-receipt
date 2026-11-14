import { useEffect, useRef, useState } from 'react';
import { copy } from '../content/copy.ts';
import type { Receipt, ScanStatus } from '../hooks/useFolderScan.ts';
import type { ExportShape } from '../lib/export/exportReceipt.tsx';
import type { ListedFile } from '../lib/ingest/fromFileList.ts';
import { formatCount } from '../lib/stats/format.ts';
import { ScanStatusLine } from './ScanStatusLine.tsx';

const label = 'text-label uppercase tracking-(--label-tracking) text-(--color-box-muted)';
const pressable = 'transition-transform duration-(--duration-press) ease-out select-none active:scale-(--press-scale)';
const chip = `h-7 rounded-control border border-(--color-chip-line) px-2.5 text-label uppercase tracking-(--label-tracking) text-(--color-box-text) disabled:opacity-50 ${pressable}`;

// Phones and tablets can't pick or drop folders; don't show a dead button.
const canPickFolders = () =>
  typeof matchMedia === 'undefined' || !matchMedia('(hover: none) and (pointer: coarse)').matches;

type Props = {
  receipt: Receipt;
  status: ScanStatus;
  /** The current receipt has landed (controls may show). */
  landed: boolean;
  dragging: boolean;
  busy: boolean;
  showNames: boolean;
  onShowNames: (on: boolean) => void;
  onPick: (files: ArrayLike<ListedFile>) => Promise<void>;
  onExport: (shape: ExportShape) => void;
};

/**
 * The printer: tiny uppercase labels, a large mono counter, the folder button
 * and the export controls, with the slot on its bottom edge. The whole page is
 * the drop target. Export controls appear only once the paper has landed.
 */
export function Device({ receipt, status, landed, dragging, busy, showNames, onShowNames, onPick, onExport }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [folderAccess] = useState(canPickFolders);
  useEffect(() => input.current?.setAttribute('webkitdirectory', ''), []);

  const scanning = status.phase === 'scanning';
  const ready = landed && !scanning;
  const state = scanning
    ? copy.device.state.scanning
    : !landed
      ? copy.device.state.printing
      : receipt.source === 'sample'
        ? copy.device.state.ready
        : copy.device.state.printed;
  const counter = formatCount(scanning ? status.seen : receipt.stats.totalFiles);
  const busyLight = scanning || !landed || dragging;

  return (
    <section
      aria-labelledby="dropzone-title"
      data-dragging={dragging || undefined}
      data-testid="device"
      className="relative z-10 rounded-(--radius-device) border border-(--color-box-line) bg-(--color-box) px-6 pt-5 pb-11 text-(--color-box-text) shadow-(--shadow-device) transition-colors duration-(--duration-hover) ease-out data-dragging:border-(--color-box-line-active)"
    >
      <div className={`flex items-center justify-between ${label}`}>
        <span>{copy.device.input}</span>
        <span className="flex items-center gap-1.5" data-testid="device-status">
          {copy.device.status} · {state}
          <span aria-hidden="true" className={`size-1.5 rounded-full ${busyLight ? 'bg-accent' : 'bg-(--color-box-line-active)'}`} />
        </span>
      </div>

      <h1 id="dropzone-title" className="mt-7 text-title font-semibold tracking-tight">
        {copy.dropZone.title}
      </h1>
      <p className="text-small text-(--color-box-muted)">{copy.dropZone.subtitle}</p>
      <p className="mt-2 text-label text-(--color-box-muted)">{copy.privacy.statement}</p>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div data-testid="display" className="min-w-0">
          <div className={label}>{copy.device.files}</div>
          <div className="num font-mono text-(length:--display-size) leading-none tracking-tight">{counter}</div>
        </div>
        {folderAccess && (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className={`h-11 shrink-0 rounded-control bg-(--color-button) px-5 text-small font-semibold text-(--color-button-text) ${pressable}`}
            >
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
                // Clear only after the scan has read the list, so the same folder can be picked again.
                if (el.files) void onPick(el.files).finally(() => (el.value = ''));
              }}
            />
          </>
        )}
      </div>
      {!folderAccess && <p className="mt-3 text-small text-(--color-box-muted)">{copy.dropZone.noFolderAccess}</p>}

      <ScanStatusLine status={status} receipt={receipt} className="mt-3 min-h-10 text-label text-pretty text-(--color-box-muted)" />

      {/* Export controls: hidden while printing (no transition), fade in once the paper has landed. */}
      <div
        role="group"
        aria-label={copy.device.exportGroup}
        data-testid="export-controls"
        data-shown={ready ? '' : undefined}
        inert={!ready}
        className={`mt-2 flex items-center gap-1.5 ${ready ? 'opacity-100 transition-opacity duration-(--duration-fade) ease-out' : 'opacity-0'}`}
      >
        <button type="button" className={chip} disabled={busy} onClick={() => onExport('tall')}>
          {copy.export.tallShort}
        </button>
        <button type="button" className={chip} disabled={busy} onClick={() => onExport('square')}>
          {copy.export.squareShort}
        </button>
        <button
          type="button"
          aria-pressed={showNames}
          aria-label={copy.export.showNames}
          onClick={() => onShowNames(!showNames)}
          className={`${chip} ml-auto flex items-center gap-1.5 aria-pressed:border-(--color-box-line-active)`}
        >
          {/* On/off light, the same style as the STATUS light. */}
          <span aria-hidden="true" className={`size-1.5 rounded-full ${showNames ? 'bg-accent' : 'bg-(--color-box-line-active)'}`} />
          {copy.export.namesShort}
        </button>
      </div>
    </section>
  );
}
