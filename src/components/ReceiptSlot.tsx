import { copy } from '../content/copy.ts';
import type { Receipt as ReceiptData } from '../hooks/useFolderScan.ts';
import { Receipt } from './receipt/Receipt.tsx';

// Sibling of the drop zone, never nested in it. In slice 5 this becomes the
// overflow:hidden printer slot the paper feeds out of.
export function ReceiptSlot({ receipt }: { receipt: ReceiptData }) {
  return (
    <section aria-label={copy.receiptSlot.label} className="relative">
      <Receipt stats={receipt.stats} sample={receipt.source === 'sample'} />
    </section>
  );
}
