// Builds a real folder tree on disk for the webkitdirectory tests.
// Files are sparse (truncate), so 100k files cost almost no disk space.
import { closeSync, existsSync, mkdirSync, openSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EXTS = ['mov', 'png', 'pdf', 'zip', 'dmg', 'txt', 'mp3', 'HEIC', 'json'];

export function makeTree(root: string, files: number, perDir = 200): void {
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  let made = 0;
  for (let d = 0; made < files; d++) {
    const dir = join(root, `d${String(d).padStart(4, '0')}`);
    mkdirSync(dir);
    for (let i = 0; i < perDir && made < files; i++, made++) {
      const p = join(dir, `file-${made}.${EXTS[made % EXTS.length]}`);
      closeSync(openSync(p, 'w'));
      truncateSync(p, 1000 + ((made * 7919) % 5_000_000));
    }
  }
  // Junk that must be skipped and counted.
  writeFileSync(join(root, '.DS_Store'), 'x');
  writeFileSync(join(root, '.env'), 'x');
  mkdirSync(join(root, 'node_modules/pkg'), { recursive: true });
  writeFileSync(join(root, 'node_modules/pkg/index.js'), 'x');
  mkdirSync(join(root, '.git'));
  writeFileSync(join(root, '.git/HEAD'), 'x');
  // A bundle that must count as one item.
  mkdirSync(join(root, 'Tool.app/Contents/MacOS'), { recursive: true });
  writeFileSync(join(root, 'Tool.app/Contents/MacOS/Tool'), 'binary');
  writeFileSync(join(root, 'Tool.app/Contents/Info.plist'), 'plist');
}

export function removeTree(root: string): void {
  rmSync(root, { recursive: true, force: true });
}
