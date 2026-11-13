// Test-only fakes for FileSystemEntry trees and webkitdirectory FileLists.
import type { DirEntryLike, EntryLike, FileEntryLike } from './walkEntries.ts';
import type { ListedFile } from './fromFileList.ts';

export type Tree = { [name: string]: Tree | number }; // number = file size

export const T0 = Date.UTC(2026, 0, 1);

export type FakeOpts = {
  batch?: number;
  failDirs?: Set<string>;
  failFiles?: Set<string>;
  readCalls?: { n: number };
};

export function fakeDir(name: string, tree: Tree, opts: FakeOpts = {}, path = name): DirEntryLike {
  const children: EntryLike[] = Object.entries(tree).map(([n, v]) =>
    typeof v === 'number' ? fakeFile(n, v, `${path}/${n}`, opts) : fakeDir(n, v, opts, `${path}/${n}`),
  );
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader() {
      let i = 0;
      const size = opts.batch ?? 100;
      return {
        readEntries(ok, fail) {
          if (opts.readCalls) opts.readCalls.n++;
          setTimeout(() => {
            if (opts.failDirs?.has(path)) return fail?.(new DOMException('denied', 'NotReadableError'));
            ok(children.slice(i, (i += size)));
          }, 0);
        },
      };
    },
  };
}

function fakeFile(name: string, size: number, path: string, opts: FakeOpts): FileEntryLike {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file(ok, fail) {
      setTimeout(() => {
        if (opts.failFiles?.has(path)) fail?.(new DOMException('denied', 'NotReadableError'));
        else ok({ size, lastModified: T0 + size });
      }, 0);
    },
  };
}

/** The same tree as a webkitdirectory FileList (files only; empty folders vanish, as in browsers). */
export function fakeFileList(root: string, tree: Tree): ListedFile[] {
  const out: ListedFile[] = [];
  const walk = (t: Tree, prefix: string) => {
    for (const [n, v] of Object.entries(t)) {
      if (typeof v === 'number') out.push({ name: n, size: v, lastModified: T0 + v, webkitRelativePath: `${prefix}/${n}` });
      else walk(v, `${prefix}/${n}`);
    }
  };
  walk(tree, root);
  return out;
}
