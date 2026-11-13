import { copy } from './content/copy.ts';
import { DropZone } from './components/DropZone.tsx';
import { ReceiptSlot } from './components/ReceiptSlot.tsx';
import { useFolderScan } from './hooks/useFolderScan.ts';

export function App() {
  const { receipt, status, onDrop, onPick } = useFolderScan();
  return (
    <main className="mx-auto flex w-full max-w-receipt flex-col gap-4 px-(--page-gutter) pt-8 pb-12 sm:pt-16">
      <DropZone status={status} receipt={receipt} onDrop={onDrop} onPick={onPick} />
      <ReceiptSlot />
      <p className="px-1 text-small text-text-muted">{copy.privacy.statement}</p>
    </main>
  );
}
