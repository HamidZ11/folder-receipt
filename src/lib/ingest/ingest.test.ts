import { describe, expect, it } from 'vitest';
import type { ScanResult } from '../stats/types.ts';
import { fakeDir, fakeFileList, T0, type Tree } from './fakeFs.ts';
import { scanFileList } from './fromFileList.ts';
import { scanDirectoryEntry } from './walkEntries.ts';

const now = () => T0 + 1e9;

const TREE: Tree = {
  'a.pdf': 100,
  'Setup.dmg': 5000,
  '.DS_Store': 6,
  '.env': 1,
  docs: { 'b.txt': 20, 'b (1).txt': 20, '.DS_Store': 6, deep: { 'c.mov': 9000 } },
  web: { node_modules: { react: { 'index.js': 50 } }, '.git': { HEAD: 1 }, 'app.ts': 30 },
  '.cache': { 'blob': 999 },
  'Figma.app': { Contents: { MacOS: { Figma: 700 }, 'Info.plist': 3, '.hidden': { x: 2 } } },
};

const sorted = (r: ScanResult) => ({ ...r, files: [...r.files].sort((a, b) => (a.path < b.path ? -1 : 1)) });

describe('scanDirectoryEntry (drag and drop)', () => {
  it('walks nested folders, skips and counts junk, collapses bundles', async () => {
    const r = await scanDirectoryEntry(fakeDir('Downloads', TREE), { now });
    expect(r.rootName).toBe('Downloads');
    expect(r.files.map((f) => f.path).sort()).toEqual([
      'Figma.app',
      'Setup.dmg',
      'a.pdf',
      'docs/b (1).txt',
      'docs/b.txt',
      'docs/deep/c.mov',
      'web/app.ts',
    ]);
    const app = r.files.find((f) => f.name === 'Figma.app')!;
    expect(app).toMatchObject({ kind: 'bundle', size: 705, ext: 'app', lastModified: T0 + 700 });
    expect(r.skipped).toEqual({ dsStore: 2, dotfiles: 2, nodeModules: 1, git: 1, unreadable: 0 });
    expect(r.scannedAt).toBe(now());
  });

  it('calls readEntries repeatedly until empty: 237 entries in batches of 100 → 4 calls', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 237; i++) tree[`f${i}.txt`] = i + 1;
    const readCalls = { n: 0 };
    const r = await scanDirectoryEntry(fakeDir('Big', tree, { batch: 100, readCalls }), { now });
    expect(r.files).toHaveLength(237);
    expect(readCalls.n).toBe(4); // 100, 100, 37, []
  });

  it('never walks into node_modules or .git', async () => {
    const readCalls = { n: 0 };
    await scanDirectoryEntry(fakeDir('R', { node_modules: { a: { b: { c: 1 } } }, '.git': { d: 1 } }, { readCalls }), {
      now,
    });
    expect(readCalls.n).toBe(2); // root: one batch + the empty terminator
  });

  it('counts unreadable folders and files, and keeps going', async () => {
    const r = await scanDirectoryEntry(
      fakeDir('R', { ok: { 'a.txt': 1 }, locked: { 'b.txt': 2 }, 'c.txt': 3 }, {
        failDirs: new Set(['R/locked']),
        failFiles: new Set(['R/c.txt']),
      }),
      { now },
    );
    expect(r.files.map((f) => f.path)).toEqual(['ok/a.txt']);
    expect(r.skipped.unreadable).toBe(2);
  });

  it('reports progress', async () => {
    const seen: number[] = [];
    await scanDirectoryEntry(fakeDir('R', TREE), { now, onProgress: (n) => seen.push(n) });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.at(-1)).toBeGreaterThan(0);
  });

  it('stops with AbortError when cancelled', async () => {
    const tree: Tree = {};
    for (let i = 0; i < 50; i++) tree[`d${i}`] = { 'x.txt': 1 };
    const ac = new AbortController();
    const p = scanDirectoryEntry(fakeDir('R', tree), { now, signal: ac.signal, onProgress: () => ac.abort() });
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('empty folder → zero files, root name kept', async () => {
    const r = await scanDirectoryEntry(fakeDir('Empty', {}), { now });
    expect(r.files).toEqual([]);
    expect(r.rootName).toBe('Empty');
  });
});

describe('scanFileList (webkitdirectory fallback)', () => {
  it('both ingest paths agree on the same tree', async () => {
    const a = await scanDirectoryEntry(fakeDir('Downloads', TREE), { now });
    const b = await scanFileList(fakeFileList('Downloads', TREE), { now });
    expect(sorted(b)).toEqual(sorted(a));
  });

  it('counts each node_modules folder once, however many files it holds', async () => {
    const tree: Tree = { node_modules: {} };
    for (let i = 0; i < 1000; i++) (tree.node_modules as Tree)[`p${i}`] = { 'i.js': 1 };
    const r = await scanFileList(fakeFileList('R', tree), { now });
    expect(r.skipped.nodeModules).toBe(1);
    expect(r.files).toEqual([]);
  });

  it('empty list → empty scan, no root name', async () => {
    const r = await scanFileList([], { now });
    expect(r).toMatchObject({ rootName: '', files: [] });
  });
});
