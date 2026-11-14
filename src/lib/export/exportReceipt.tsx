// PNG export from a static, non-animated clone of the receipt.
// The clone renders in its own React root, off-screen, so the live receipt
// (and its print animation or expanded lists) is never captured.
import { domToBlob } from 'modern-screenshot';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ThermalPaper, type PaperOptions } from '../../components/receipt/ThermalPaper.tsx';
import { EXPORT_FONTS } from './exportFonts.ts';
import { fontFaceCss } from './fontFaceCss.ts';
import type { Receipt as ReceiptData } from '../../hooks/useFolderScan.ts';

export type ExportShape = 'tall' | 'square';

/** The receipt as a PNG: the thermal paper, static, with Space Mono and Manrope embedded (CSP-safe). */
export async function exportReceiptPng(receipt: ReceiptData, shape: ExportShape, opts: Omit<PaperOptions, 'forExport'>): Promise<Blob> {
  const fontCss = await fontFaceCss(EXPORT_FONTS);
  return exportNodePng(
    <ExportFrameShell>
      <ThermalPaper receipt={receipt} forExport {...opts} />
    </ExportFrameShell>,
    shape,
    { fontCss },
  );
}

/** Wraps any receipt node in the export frame (page background, padding, fixed width). */
export function ExportFrameShell({ children }: { children: ReactNode }) {
  return (
    <div data-export-frame className="flex items-center justify-center bg-page p-8">
      <div className="w-(--container-receipt)">{children}</div>
    </div>
  );
}

/**
 * Render `node` (an export frame) off-screen in its own React root and capture it.
 * fontCss: @font-face rules with data: URLs (see fontFaceCss.ts) for web fonts; omit for system fonts.
 */
export async function exportNodePng(node: ReactNode, shape: ExportShape, { fontCss }: { fontCss?: string } = {}): Promise<Blob> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.dataset.exportHost = '';
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(node));
    const frame = host.firstElementChild as HTMLElement;
    if (shape === 'square') {
      const side = Math.ceil(Math.max(frame.offsetWidth, frame.offsetHeight));
      Object.assign(frame.style, { width: `${side}px`, height: `${side}px` });
    }
    return await domToBlob(frame, {
      scale: 2,
      type: 'image/png',
      backgroundColor: getComputedStyle(frame).backgroundColor,
      // cssText path: fonts go into the SVG, never into a CSP-bound <style> (fontFaceCss.ts).
      font: fontCss ? { cssText: fontCss } : false,
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
