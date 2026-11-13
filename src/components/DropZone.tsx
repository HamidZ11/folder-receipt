import { copy } from '../content/copy.ts';

// Shell only (slice 1). Drag-and-drop and the folder button arrive in slice 3.
export function DropZone() {
  return (
    <section
      aria-labelledby="dropzone-title"
      className="flex flex-col items-center gap-1 rounded-card border border-surface-line bg-surface px-6 py-10 text-center"
    >
      <FolderIcon />
      <h1 id="dropzone-title" className="mt-3 text-title font-medium text-text">
        {copy.dropZone.title}
      </h1>
      <p className="text-small text-text-muted">{copy.dropZone.subtitle}</p>
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
