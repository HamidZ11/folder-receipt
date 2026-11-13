import type { DirEntryLike } from './walkEntries.ts';

export type DropOutcome =
  | { ok: true; dir: DirEntryLike }
  | { ok: false; error: 'notAFolder' | 'multiple' | 'unsupported' };

/**
 * Must run synchronously inside the drop handler: DataTransfer items are
 * invalid once the event returns.
 */
export function folderFromDrop(dt: DataTransfer): DropOutcome {
  const items = Array.from(dt.items).filter((i) => i.kind === 'file');
  if (items.length === 0) return { ok: false, error: 'notAFolder' };
  if (items.length > 1) return { ok: false, error: 'multiple' };
  const item = items[0]!;
  if (typeof item.webkitGetAsEntry !== 'function') return { ok: false, error: 'unsupported' };
  const entry = item.webkitGetAsEntry();
  if (!entry || !entry.isDirectory) return { ok: false, error: 'notAFolder' };
  return { ok: true, dir: entry as unknown as DirEntryLike };
}
