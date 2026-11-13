import { useCallback, useEffect, useRef, useState } from 'react';
import { folderFromDrop } from '../lib/ingest/fromDataTransfer.ts';
import { scanFileList, type ListedFile } from '../lib/ingest/fromFileList.ts';
import { scanDirectoryEntry, type ScanOptions } from '../lib/ingest/walkEntries.ts';
import { makeYielder } from '../lib/ingest/yieldToMain.ts';
import { makeSampleScan } from '../lib/sample/sampleFolder.ts';
import { computeStats, computeStatsSliced } from '../lib/stats/computeStats.ts';
import type { ReceiptStats, ScanResult } from '../lib/stats/types.ts';

export type ScanError = 'notAFolder' | 'multiple' | 'unsupported' | 'unreadable';

export type Receipt = { scan: ScanResult; stats: ReceiptStats; source: 'sample' | 'folder' };

export type ScanStatus =
  | { phase: 'idle' }
  | { phase: 'scanning'; rootName: string; seen: number }
  | { phase: 'error'; error: ScanError };

function sampleReceipt(): Receipt {
  const scan = makeSampleScan(Date.now());
  return { scan, stats: computeStats(scan), source: 'sample' };
}

/** One receipt per drop. A new drop cancels a scan in progress. */
export function useFolderScan() {
  const [receipt, setReceipt] = useState<Receipt>(sampleReceipt);
  const [status, setStatus] = useState<ScanStatus>({ phase: 'idle' });
  const current = useRef<AbortController | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  const run = useCallback(async (rootName: string, scan: (opts: ScanOptions) => Promise<ScanResult>) => {
    current.current?.abort();
    const ac = new AbortController();
    current.current = ac;

    // Live counter, at most one React update per frame.
    let latest = 0;
    let frame = 0;
    const flush = () => {
      frame = 0;
      setStatus({ phase: 'scanning', rootName, seen: latest });
    };
    setStatus({ phase: 'scanning', rootName, seen: 0 });

    try {
      const result = await scan({
        signal: ac.signal,
        onProgress: (n) => {
          latest = n;
          if (!frame) frame = requestAnimationFrame(flush);
        },
      });
      cancelAnimationFrame(frame);
      // Yield before and between stats phases so no single task runs long.
      const pause = makeYielder(ac.signal, 0);
      await pause();
      const stats = await computeStatsSliced(result, pause);
      if (ac.signal.aborted) return;
      setReceipt({ scan: result, stats, source: 'folder' });
      setStatus({ phase: 'idle' });
    } catch (e) {
      cancelAnimationFrame(frame);
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setStatus({ phase: 'error', error: 'unreadable' });
    }
  }, []);

  /** Call from the drop handler. Reads the entry synchronously, then walks async. */
  const onDrop = useCallback(
    (dt: DataTransfer) => {
      const out = folderFromDrop(dt);
      if (!out.ok) {
        setStatus({ phase: 'error', error: out.error });
        return;
      }
      void run(out.dir.name, (opts) => scanDirectoryEntry(out.dir, opts));
    },
    [run],
  );

  /** Read lazily from the FileList: copying 100k File objects up front would block the main thread. */
  const onPick = useCallback(
    (files: ArrayLike<ListedFile>) => {
      const root = files[0]?.webkitRelativePath.split('/')[0] ?? '';
      return run(root, (opts) => scanFileList(files, opts));
    },
    [run],
  );

  return { receipt, status, onDrop, onPick };
}
