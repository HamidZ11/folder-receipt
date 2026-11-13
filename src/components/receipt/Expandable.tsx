import { useId, useState } from 'react';
import { copy } from '../../content/copy.ts';
import type { FileRecord } from '../../lib/stats/types.ts';
import { FileTable } from './FileTable.tsx';

/**
 * "List n files" disclosure. Height animates via grid-template-rows 0fr → 1fr
 * (--duration-expand, --ease-out; none under reduced motion). The table mounts
 * on first open and stays mounted so closing can animate. Closed = inert.
 */
export function Expandable({ files, what, countText }: { files: readonly FileRecord[]; what: string; countText: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const id = useId();
  if (files.length === 0) return null;

  return (
    <div data-expandable className="mt-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setMounted(true);
          setOpen(!open);
        }}
        className="text-small text-ink-muted underline decoration-hairline underline-offset-2"
      >
        {open ? copy.receipt.expand.hide : copy.receipt.expand.show(countText)}
      </button>
      <div
        id={id}
        inert={!open}
        className="grid transition-[grid-template-rows] duration-(--duration-expand) ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">{mounted && <FileTable files={files} label={what} />}</div>
      </div>
    </div>
  );
}
