// Fallback ingest: <input type="file" webkitdirectory>. The browser has already
// listed every file (including inside node_modules), so this only classifies,
// in yielded slices.

import type { ScanResult } from '../stats/types.ts';
import { ScanBuilder } from './ScanBuilder.ts';
import type { ScanOptions } from './walkEntries.ts';
import { makeYielder } from './yieldToMain.ts';

export type ListedFile = { size: number; lastModified: number; name: string; webkitRelativePath: string };

const PROGRESS_EVERY = 512;
// Reading a File's size can cost ~0.1ms in Chromium (a synchronous metadata
// lookup), so check the time budget often, not once per progress report.
const CHECK_EVERY = 16;

export async function scanFileList(list: ArrayLike<ListedFile>, opts: ScanOptions = {}): Promise<ScanResult> {
  const b = new ScanBuilder();
  const tick = makeYielder(opts.signal);
  let rootName = '';

  for (let i = 0; i < list.length; i++) {
    const f = list[i]!;
    const parts = (f.webkitRelativePath || f.name).split('/');
    if (i === 0) rootName = parts.length > 1 ? parts[0]! : '';
    b.add(parts.length > 1 ? parts.slice(1) : parts, f);
    if (i % PROGRESS_EVERY === 0) opts.onProgress?.(b.seen);
    if (i % CHECK_EVERY === 0) await tick();
  }
  opts.onProgress?.(b.seen);
  return b.result(rootName, (opts.now ?? Date.now)());
}
