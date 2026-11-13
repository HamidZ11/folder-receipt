import { copy } from '../content/copy.ts';

// Sibling of the drop zone, never nested in it. The receipt renders here from slice 4;
// in slice 5 this becomes the overflow:hidden printer slot the paper feeds out of.
export function ReceiptSlot() {
  return (
    <section aria-label={copy.receiptSlot.label} className="relative">
      <div className="rounded-card bg-paper px-6 py-10 text-center text-small text-ink-muted shadow-paper">
        {copy.receiptSlot.empty}
      </div>
    </section>
  );
}
