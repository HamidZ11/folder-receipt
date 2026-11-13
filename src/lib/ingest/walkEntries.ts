// Drag-and-drop ingest: walk FileSystemDirectoryEntry trees.
// Entries can't be sent to a Worker, so this runs on the main thread in
// yielded slices. readEntries returns batches (~100 in Chrome) and must be
// called until it returns an empty array.

import type { ScanResult } from '../stats/types.ts';
import { classifyDirName } from './classify.ts';
import { ScanBuilder, type FileLike } from './ScanBuilder.ts';
import { makeYielder } from './yieldToMain.ts';

// Structural types: real DOM entries satisfy them, and tests can fake them.
export type EntryLike = { name: string; isFile: boolean; isDirectory: boolean };
export type FileEntryLike = EntryLike & {
  file(success: (f: FileLike) => void, error?: (e: unknown) => void): void;
};
export type DirEntryLike = EntryLike & {
  createReader(): { readEntries(success: (entries: EntryLike[]) => void, error?: (e: unknown) => void): void };
};

export type ScanOptions = {
  signal?: AbortSignal;
  onProgress?: (seen: number) => void;
  now?: () => number;
};

const FILE_CHUNK = 256;

export async function scanDirectoryEntry(root: DirEntryLike, opts: ScanOptions = {}): Promise<ScanResult> {
  const b = new ScanBuilder();
  const tick = makeYielder(opts.signal);
  const stack: { dir: DirEntryLike; segs: string[]; inBundle: boolean }[] = [
    { dir: root, segs: [], inBundle: false },
  ];

  while (stack.length > 0) {
    const { dir, segs, inBundle } = stack.pop()!;
    let entries: EntryLike[];
    try {
      entries = await readAll(dir, tick);
    } catch (e) {
      // The dropped folder itself can't be read: that's an error, not an empty receipt.
      if (isAbort(e) || segs.length === 0) throw e;
      b.unreadable++;
      continue;
    }

    const files: { entry: FileEntryLike; segs: string[] }[] = [];
    for (const e of entries) {
      const s = [...segs, e.name];
      if (e.isDirectory) {
        const k = inBundle ? null : classifyDirName(e.name);
        if (k === 'bundle') stack.push({ dir: e as DirEntryLike, segs: s, inBundle: true });
        else if (k) b.skipFolder(s, k); // node_modules, .git, hidden: counted, not walked
        else stack.push({ dir: e as DirEntryLike, segs: s, inBundle });
      } else if (e.isFile) {
        files.push({ entry: e as FileEntryLike, segs: s });
      }
    }

    for (let i = 0; i < files.length; i += FILE_CHUNK) {
      const chunk = files.slice(i, i + FILE_CHUNK);
      const got = await Promise.all(chunk.map((f) => getFile(f.entry)));
      got.forEach((file, j) => {
        if (file) b.add(chunk[j]!.segs, file);
        else b.unreadable++;
      });
      opts.onProgress?.(b.seen);
      await tick();
    }
    await tick();
  }

  return b.result(root.name, (opts.now ?? Date.now)());
}

async function readAll(dir: DirEntryLike, tick: () => Promise<void>): Promise<EntryLike[]> {
  const reader = dir.createReader();
  const all: EntryLike[] = [];
  for (;;) {
    const batch = await new Promise<EntryLike[]>((res, rej) => reader.readEntries(res, rej));
    if (batch.length === 0) return all;
    for (const e of batch) all.push(e);
    await tick();
  }
}

function getFile(entry: FileEntryLike): Promise<FileLike | null> {
  return new Promise((res) => entry.file(res, () => res(null)));
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
