import type { FileRecord, ScanResult } from './types.ts';
import { emptySkipCounts } from './types.ts';

export const NOW = Date.UTC(2026, 10, 13, 12, 0, 0); // 13 Nov 2026 12:00 UTC

/** Build a FileRecord from a path; ext and name are derived. */
export function rec(path: string, size: number, lastModified = NOW, kind: FileRecord['kind'] = 'file'): FileRecord {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  return { path, name, ext, size, lastModified, kind };
}

export function scan(files: FileRecord[], overrides: Partial<ScanResult> = {}): ScanResult {
  return { rootName: 'Downloads', files, skipped: emptySkipCounts(), scannedAt: NOW, ...overrides };
}

/** Small deterministic PRNG (mulberry32) for property-style tests. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
