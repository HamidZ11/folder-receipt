import type { DuplicateGroup, FileRecord } from './types.ts';

// One copy suffix, stripped from the stem (name without extension):
//   " (n)"            Chrome / Firefox downloads
//   " copy", " copy n" Finder "Duplicate"
//   " n"              Finder, copying into a folder that already has the name
// n is 1–3 digits so years ("Invoice 2024") and timestamps are left alone.
const COPY_SUFFIX = / (?:\(\d{1,3}\)|copy(?: \d{1,3})?|\d{1,3})$/;

export function normaliseName(name: string): string {
  const dot = name.lastIndexOf('.');
  const hasExt = dot > 0;
  const stem = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : '';
  const stripped = stem.replace(COPY_SUFFIX, '');
  return (stripped === '' ? stem : stripped) + ext;
}

/** Same normalised name + identical size. 0-byte files are ignored. No hashing. */
export function findDuplicates(files: readonly FileRecord[]): DuplicateGroup[] {
  // Bucket by size first (cheap); only same-size buckets need name normalisation.
  const bySize = new Map<number, FileRecord | FileRecord[]>();
  for (const f of files) {
    if (f.size === 0) continue;
    const b = bySize.get(f.size);
    if (b === undefined) bySize.set(f.size, f);
    else if (Array.isArray(b)) b.push(f);
    else bySize.set(f.size, [b, f]);
  }

  const groups: FileRecord[][] = [];
  for (const b of bySize.values()) {
    if (!Array.isArray(b)) continue;
    const byName = new Map<string, FileRecord[]>();
    for (const f of b) {
      const key = normaliseName(f.name);
      const g = byName.get(key);
      if (g) g.push(f);
      else byName.set(key, [f]);
    }
    for (const g of byName.values()) groups.push(g);
  }

  const out: DuplicateGroup[] = [];
  for (const g of groups) {
    if (g.length < 2) continue;
    // Keeper first: shortest name (the original), then path.
    g.sort((a, b) => a.name.length - b.name.length || cmp(a.path, b.path));
    const first = g[0]!;
    out.push({
      name: normaliseName(first.name),
      size: first.size,
      files: g,
      reclaimable: (g.length - 1) * first.size,
    });
  }
  return out.sort((a, b) => b.reclaimable - a.reclaimable || cmp(a.name, b.name));
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
