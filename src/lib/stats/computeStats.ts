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

/**
 * The stats work in phases. Each `yield` is a safe point to give the main
 * thread back (each phase is ≤ ~15ms at 100k files).
 */
function* statsPhases(scan: ScanResult): Generator<void, ReceiptStats, void> {
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
  yield;

  notModified.sort((a, b) => a.lastModified - b.lastModified);
  installers.sort(bySizeDesc);
  yield;

  const duplicateGroups = findDuplicates(files);
  yield;

  // Savings: union of installer files and every duplicate copy except the keeper.
  // Duplicate copies that are installers are already in installerBytes.
  let installerBytes = 0;
  for (const f of installers) installerBytes += f.size;
  let duplicateBytes = 0;
  for (const g of duplicateGroups) for (const f of g.files.slice(1)) if (!isInstaller(f)) duplicateBytes += f.size;
  const totalSavings = installerBytes + duplicateBytes;
  const breakdown = computeBreakdown(files);

  return {
    receiptNo: receiptNumber([scan.rootName, files.length, totalBytes, scannedAt]),
    scannedAt,
    folderName: scan.rootName,
    totalFiles: files.length,
    totalBytes,
    largest: items[0] ?? null,
    notModifiedInAYear: notModified,
    items,
    installers,
    duplicateGroups,
    installerBytes,
    duplicateBytes,
    totalSavings,
    breakdown,
    skipped: { ...scan.skipped },
  };
}

export function computeStats(scan: ScanResult): ReceiptStats {
  const it = statsPhases(scan);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

/** Same result as computeStats, but awaits `pause()` between phases so the UI stays responsive. */
export async function computeStatsSliced(scan: ScanResult, pause: () => Promise<void>): Promise<ReceiptStats> {
  const it = statsPhases(scan);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
    await pause();
  }
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
