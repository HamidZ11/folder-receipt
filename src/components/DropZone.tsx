import { useEffect, useRef, useState } from 'react';
import { copy } from '../content/copy.ts';
import type { Receipt, ScanStatus } from '../hooks/useFolderScan.ts';
import { ScanStatusLine } from './ScanStatusLine.tsx';

type Props = {
  status: ScanStatus;
  receipt: Receipt;
  onDrop: (dt: DataTransfer) => void;
  onPick: (files: FileList) => Promise<void>;
};

const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;

// Phones and tablets can't drop or pick folders; don't show a dead button.
const canPickFolders = () =>
  typeof matchMedia === 'undefined' || !matchMedia('(hover: none) and (pointer: coarse)').matches;

/** The whole page is the drop target; this card shows the state. */
export function DropZone({ status, receipt, onDrop, onPick }: Props) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [folderAccess] = useState(canPickFolders);

  useEffect(() => {
    // webkitdirectory isn't in React's prop types.
    input.current?.setAttribute('webkitdirectory', '');
  }, []);

  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // allow drop; stops the browser opening the file
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e) || !e.dataTransfer) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      onDrop(e.dataTransfer); // synchronous: entries are only valid during the event
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [onDrop]);

  return (
    <section
      aria-labelledby="dropzone-title"
      data-dragging={dragging || undefined}
      className="flex flex-col items-center gap-1 rounded-card border border-surface-line bg-surface px-6 py-10 text-center transition-colors duration-(--duration-hover) ease-out data-dragging:border-surface-line-active"
    >
      <FolderIcon />
      <h1 id="dropzone-title" className="mt-3 text-title font-medium text-text">
        {copy.dropZone.title}
      </h1>
      <p className="text-small text-text-muted">{copy.dropZone.subtitle}</p>

      {folderAccess ? (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-5 rounded-control border border-surface-line px-4 py-2 text-small font-medium text-text transition-transform duration-(--duration-press) ease-out select-none hover:border-surface-line-active active:scale-(--press-scale)"
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
              if (!el.files) return;
              // Clear only after the scan has read the list, so the same folder can be picked again.
              void onPick(el.files).finally(() => {
                el.value = '';
              });
            }}
          />
        </>
      ) : (
        <p className="mt-5 text-small text-text-muted">{copy.dropZone.noFolderAccess}</p>
      )}

      <ScanStatusLine status={status} receipt={receipt} />
    </section>
  );
}

function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className="text-text-muted"
    >
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.38a1.5 1.5 0 0 1 1.06.44L11.5 7h8a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    </svg>
  );
}
