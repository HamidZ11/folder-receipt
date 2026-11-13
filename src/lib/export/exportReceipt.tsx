// PNG export from a static, non-animated clone of the receipt.
// The clone renders in its own React root, off-screen, so the live receipt
// (and its print animation or expanded lists) is never captured.
import { domToBlob } from 'modern-screenshot';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Receipt } from '../../components/receipt/Receipt.tsx';
import type { Receipt as ReceiptData } from '../../hooks/useFolderScan.ts';

export type ExportShape = 'tall' | 'square';

function ExportFrame({ receipt, redact }: { receipt: ReceiptData; redact: boolean }) {
  return (
    <div data-export-frame className="flex items-center justify-center bg-page p-8">
      <div className="w-(--container-receipt)">
        <Receipt stats={receipt.stats} files={receipt.scan.files} sample={receipt.source === 'sample'} forExport redact={redact} />
      </div>
    </div>
  );
}

export async function exportReceiptPng(receipt: ReceiptData, shape: ExportShape, redact: boolean): Promise<Blob> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.dataset.exportHost = '';
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ExportFrame receipt={receipt} redact={redact} />));
    const frame = host.firstElementChild as HTMLElement;
    if (shape === 'square') {
      const side = Math.ceil(Math.max(frame.offsetWidth, frame.offsetHeight));
      Object.assign(frame.style, { width: `${side}px`, height: `${side}px` });
    }
    return await domToBlob(frame, {
      scale: 2,
      type: 'image/png',
      backgroundColor: getComputedStyle(frame).backgroundColor,
      font: false, // system fonts only: nothing to fetch or embed
    });
  } finally {
    root.unmount();
    host.remove();
  }
}

export function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
