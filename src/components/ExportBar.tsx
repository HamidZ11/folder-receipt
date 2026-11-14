import { useState } from 'react';
import { copy } from '../content/copy.ts';
import type { Receipt } from '../hooks/useFolderScan.ts';
import type { ReactNode } from 'react';
import { download, exportNodePng, exportReceiptPng, type ExportShape } from '../lib/export/exportReceipt.tsx';

/** Save the receipt as a PNG. Names are redacted unless the user ticks "Show file names". */
type Props = {
  receipt: Receipt;
  /** Design prototypes: render their own export frame (with web fonts embedded). */
  renderExport?: (redact: boolean) => ReactNode;
};

export function ExportBar({ receipt, renderExport }: Props) {
  const [showNames, setShowNames] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async (shape: ExportShape) => {
    setBusy(true);
    setFailed(false);
    try {
      const blob = renderExport
        ? await exportNodePng(renderExport(!showNames), shape, { embedFonts: false }) // CSP blocks font embedding (inline <style>)
        : await exportReceiptPng(receipt, shape, !showNames);
      download(blob, copy.export.fileName(receipt.stats.receiptNo, shape));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const button =
    'rounded-control border border-surface-line px-3 py-1.5 text-small font-medium text-text transition-transform duration-(--duration-press) ease-out select-none hover:border-surface-line-active active:scale-(--press-scale) disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-small">
      <label className="mr-auto flex items-center gap-2 text-text-muted">
        <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
        {copy.export.showNames}
      </label>
      <button type="button" className={button} disabled={busy} onClick={() => void save('tall')}>
        {busy ? copy.export.saving : copy.export.tall}
      </button>
      <button type="button" className={button} disabled={busy} onClick={() => void save('square')}>
        {copy.export.square}
      </button>
      {failed && (
        <p role="alert" className="w-full text-danger">
          {copy.export.failed}
        </p>
      )}
    </div>
  );
}
