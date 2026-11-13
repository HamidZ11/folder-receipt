import { splitFileName } from '../../components/receipt/FileName.tsx';

export const REDACTED = '▇▇▇▇';

/** "invoice-2024.pdf" → "▇▇▇▇.pdf". The extension stays; it says what kind of file, not whose. */
export function redactFileName(name: string): string {
  return REDACTED + splitFileName(name).ext;
}

/** Folder names can be personal too ("Aleksandra – tax 2025"), so they're fully redacted. */
export const redactFolderName = (): string => REDACTED;
