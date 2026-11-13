import { computeBreakdown } from './breakdown.ts';
import { isInstaller } from './categories.ts';
import { findDuplicates } from './duplicates.ts';
import { receiptNumber } from './receiptNo.ts';
import type { FileRecord, ReceiptStats, ScanResult } from './types.ts';

const ITEM_COUNT = 5;

/** Same calendar date one year before `now`, in UTC. 29 Feb rolls to 1 Mar. */
export function notModifiedCutoff(now: number): number {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.getTime();
}

const bySizeDesc = (a: FileRecord, b: FileRecord) =>
  b.size - a.size || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export function computeStats(scan: ScanResult): ReceiptStats {
  const { files, scannedAt } = scan;
  const cutoff = notModifiedCutoff(scannedAt);

  let totalBytes = 0;
  const notModified: FileRecord[] = [];
  const installers: FileRecord[] = [];
  for (const f of files) {
    totalBytes += f.size;
    if (f.lastModified < cutoff) notModified.push(f);
    if (isInstaller(f)) installers.push(f);
  }

  const items = topN(files, ITEM_COUNT);
  const duplicateGroups = findDuplicates(files);

  // Savings: union of installer files and every duplicate copy except the keeper.
  const reclaim = new Set<FileRecord>(installers);
  for (const g of duplicateGroups) for (const f of g.files.slice(1)) reclaim.add(f);
  let totalSavings = 0;
  for (const f of reclaim) totalSavings += f.size;

  return {
    receiptNo: receiptNumber([scan.rootName, files.length, totalBytes, scannedAt]),
    scannedAt,
    folderName: scan.rootName,
    totalFiles: files.length,
    totalBytes,
    largest: items[0] ?? null,
    notModifiedInAYear: notModified.sort((a, b) => a.lastModified - b.lastModified),
    items,
    installers: installers.sort(bySizeDesc),
    duplicateGroups,
    totalSavings,
    breakdown: computeBreakdown(files),
    skipped: { ...scan.skipped },
  };
}

/** Top n by size without sorting the whole array (100k files). */
function topN(files: readonly FileRecord[], n: number): FileRecord[] {
  const top: FileRecord[] = [];
  for (const f of files) {
    if (top.length < n) {
      top.push(f);
      top.sort(bySizeDesc);
    } else if (bySizeDesc(f, top[n - 1]!) < 0) {
      top[n - 1] = f;
      top.sort(bySizeDesc);
    }
  }
  return top;
}
