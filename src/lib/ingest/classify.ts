// Skip and bundle rules, shared by both ingest paths so they always agree.
// Rules are applied outermost folder first.

export type SkipKind = 'dsStore' | 'dotfiles' | 'nodeModules' | 'git';

export type PathClass =
  | { type: 'file' }
  | { type: 'bundle'; bundlePath: string }
  | { type: 'skip'; kind: SkipKind; key: string };

const BUNDLE = /\.(?:app|photoslibrary)$/i;

export const isBundleName = (name: string) => BUNDLE.test(name);

/** What to do with a folder: skip it (not walked), treat as a bundle, or walk it (null). */
export function classifyDirName(name: string): SkipKind | 'bundle' | null {
  if (name === 'node_modules') return 'nodeModules';
  if (name === '.git') return 'git';
  if (name.startsWith('.')) return 'dotfiles';
  if (isBundleName(name)) return 'bundle';
  return null;
}

/** segments: path relative to the dropped root; the last segment is the file name. */
export function classifyPath(segments: readonly string[]): PathClass {
  for (let i = 0; i < segments.length - 1; i++) {
    const k = classifyDirName(segments[i]!);
    if (k === null) continue;
    const key = segments.slice(0, i + 1).join('/');
    return k === 'bundle' ? { type: 'bundle', bundlePath: key } : { type: 'skip', kind: k, key };
  }
  const name = segments[segments.length - 1] ?? '';
  if (name === '.DS_Store') return { type: 'skip', kind: 'dsStore', key: segments.join('/') };
  if (name.startsWith('.')) return { type: 'skip', kind: 'dotfiles', key: segments.join('/') };
  return { type: 'file' };
}

export function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}
