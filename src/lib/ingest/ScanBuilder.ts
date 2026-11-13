import type { FileRecord, ScanResult } from '../stats/types.ts';
import { classifyPath, extOf, type SkipKind } from './classify.ts';

export type FileLike = { size: number; lastModified: number };

/** Accumulates one scan. Both ingest paths feed it, so their output is identical. */
export class ScanBuilder {
  private files: FileRecord[] = [];
  private bundles = new Map<string, { size: number; lastModified: number }>();
  private skipped: Record<SkipKind, Set<string>> = {
    dsStore: new Set(),
    dotfiles: new Set(),
    nodeModules: new Set(),
    git: new Set(),
  };
  unreadable = 0;
  /** Files looked at so far (for the live counter), including skipped and bundle contents. */
  seen = 0;

  add(segments: readonly string[], file: FileLike): void {
    this.seen++;
    const c = classifyPath(segments);
    if (c.type === 'skip') {
      this.skipped[c.kind].add(c.key);
    } else if (c.type === 'bundle') {
      const b = this.bundles.get(c.bundlePath);
      if (b) {
        b.size += file.size;
        if (file.lastModified > b.lastModified) b.lastModified = file.lastModified;
      } else {
        this.bundles.set(c.bundlePath, { size: file.size, lastModified: file.lastModified });
      }
    } else {
      const name = segments[segments.length - 1]!;
      this.files.push({
        path: segments.join('/'),
        name,
        ext: extOf(name),
        size: file.size,
        lastModified: file.lastModified,
        kind: 'file',
      });
    }
  }

  /** A folder that is skipped without being walked (drag-and-drop path). */
  skipFolder(segments: readonly string[], kind: SkipKind): void {
    this.skipped[kind].add(segments.join('/'));
  }

  result(rootName: string, scannedAt: number): ScanResult {
    const files = this.files.slice();
    for (const [path, b] of this.bundles) {
      const name = path.split('/').pop()!;
      files.push({ path, name, ext: extOf(name), size: b.size, lastModified: b.lastModified, kind: 'bundle' });
    }
    return {
      rootName,
      files,
      scannedAt,
      skipped: {
        dsStore: this.skipped.dsStore.size,
        dotfiles: this.skipped.dotfiles.size,
        nodeModules: this.skipped.nodeModules.size,
        git: this.skipped.git.size,
        unreadable: this.unreadable,
      },
    };
  }
}
