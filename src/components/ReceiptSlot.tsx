import { useRef } from 'react';
import { copy } from '../content/copy.ts';
import type { Receipt as ReceiptData } from '../hooks/useFolderScan.ts';
import { usePrint } from '../hooks/usePrint.ts';
import { Receipt } from './receipt/Receipt.tsx';

// The printer slot: overflow hidden, so the paper is invisible above its top
// edge and appears as it feeds down. Sibling of the drop zone, never nested.
// The bleed gives the paper's shadow room inside the clip.
export function ReceiptSlot({ receipt, scanning }: { receipt: ReceiptData; scanning: boolean }) {
  const paper = useRef<HTMLDivElement>(null);
  usePrint(paper, receipt, scanning);
  return (
    <section
      aria-label={copy.receiptSlot.label}
      data-testid="slot"
      className="relative -mx-(--print-slot-bleed) overflow-hidden px-(--print-slot-bleed) pb-(--print-slot-bleed)"
    >
      <div ref={paper} data-testid="paper">
        <Receipt stats={receipt.stats} sample={receipt.source === 'sample'} />
      </div>
    </section>
  );
}
