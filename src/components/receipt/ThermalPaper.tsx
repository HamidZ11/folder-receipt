import type { Receipt as ReceiptData } from '../../hooks/useFolderScan.ts';
import { Barcode } from './Barcode.tsx';
import { Receipt } from './Receipt.tsx';

export type PaperOptions = {
  /** Export clone: no expandable lists. */
  forExport?: boolean;
  /** Names become ▇▇▇▇.ext, the folder ▇▇▇▇. */
  redact?: boolean;
  /** The roll was torn at the slot: the top edge is zigzag too. */
  tornTop?: boolean;
};

/** Thermal paper: Space Mono, dotted rules, torn zigzag edge(s), barcode, warm ink (receipt.css). */
export function ThermalPaper({ receipt, forExport = false, redact = false, tornTop = false }: { receipt: ReceiptData } & PaperOptions) {
  return (
    <div className="thermal-paper">
      <div className="torn-edge" data-torn-top={tornTop ? '' : undefined}>
        <Receipt
          stats={receipt.stats}
          files={receipt.scan.files}
          sample={receipt.source === 'sample'}
          forExport={forExport}
          redact={redact}
          footerExtra={<Barcode value={receipt.stats.receiptNo} />}
        />
      </div>
    </div>
  );
}
