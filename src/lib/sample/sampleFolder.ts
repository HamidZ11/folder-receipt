// Built-in sample so the page is never empty. Fictional, deterministic (seeded),
// shaped like a real Downloads folder. Dates are relative to `now`.

import { extOf } from '../ingest/classify.ts';
import type { FileRecord, ScanResult } from '../stats/types.ts';

const DAY = 86_400_000;
const MB = 1_000_000;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSampleScan(now: number): ScanResult {
  const r = rng(20261113);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const age = () => Math.floor(r() ** 1.6 * 1100) * DAY + int(0, DAY - 1); // skewed recent, up to ~3 years
  const stamp = (t: number) => {
    const d = new Date(t);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} at ${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())}.${pad(d.getUTCSeconds())}`;
  };

  const files: FileRecord[] = [];
  const add = (path: string, size: number, lastModified: number, kind: FileRecord['kind'] = 'file') => {
    const name = path.split('/').pop()!;
    files.push({ path, name, ext: extOf(name), size: Math.round(size), lastModified, kind });
  };

  // Screenshots and screen recordings.
  for (let i = 0; i < 420; i++) {
    const t = now - age();
    add(`Screenshot ${stamp(t)}.png`, int(180_000, 3_200_000), t);
  }
  for (let i = 0; i < 38; i++) {
    const t = now - age();
    add(`Screen Recording ${stamp(t)}.mov`, int(20, 900) * MB, t);
  }
  // Phone photos and videos.
  for (let i = 0; i < 310; i++) add(`Photos/IMG_${4000 + i}.HEIC`, int(1_400_000, 4_800_000), now - age());
  for (let i = 0; i < 26; i++) add(`Photos/IMG_${5000 + i}.MOV`, int(40, 1200) * MB, now - age());
  // Documents.
  for (let i = 0; i < 180; i++) {
    const kind = ['invoice', 'receipt', 'statement', 'boarding-pass', 'ticket', 'letter'][i % 6];
    add(`Documents/${kind}-${pad(int(1, 9999), 4)}.pdf`, int(40_000, 6_000_000), now - age());
  }
  for (let i = 0; i < 60; i++) add(`notes-${i + 1}.txt`, int(200, 40_000), now - age());
  for (let i = 0; i < 40; i++) add(`export-${i + 1}.csv`, int(2_000, 9_000_000), now - age());
  // Audio.
  for (let i = 0; i < 45; i++) add(`Voice Memo ${i + 1}.m4a`, int(300_000, 60_000_000), now - age());
  // Archives.
  for (let i = 0; i < 30; i++) add(`archive-${i + 1}.zip`, int(1, 2000) * MB, now - age());
  // Misc.
  for (let i = 0; i < 40; i++) add(`data-${i + 1}.json`, int(500, 3_000_000), now - age());

  // Named heavyweights.
  add('video-final.mov', 4_210 * MB, now - 410 * DAY);
  add('video-final (1).mov', 4_210 * MB, now - 409 * DAY);
  add('video-final-FINAL.mov', 3_870 * MB, now - 400 * DAY);
  add('Xcode_16.xip', 3_120 * MB, now - 520 * DAY);
  add('ubuntu-24.04-desktop-amd64.iso', 6_100 * MB, now - 300 * DAY);
  add('Rectangle.app', 18 * MB, now - 200 * DAY, 'bundle');

  // Installers you already ran.
  const installers: [string, number, number][] = [
    ['GoogleChrome.dmg', 232, 600],
    ['Zoom.pkg', 118, 480],
    ['Docker.dmg', 690, 390],
    ['Figma-125.3.dmg', 410, 120],
    ['Slack-4.41.dmg', 175, 260],
    ['Spotify.dmg', 90, 700],
    ['setup.exe', 64, 800],
    ['Teams_windows_x64.msi', 140, 820],
  ];
  for (const [n, mb, d] of installers) add(n, mb * MB, now - d * DAY);
  add('Docker (1).dmg', 690 * MB, now - 389 * DAY);

  // Duplicates by the copy-suffix rules.
  add('CV.pdf', 210_000, now - 90 * DAY);
  add('CV (1).pdf', 210_000, now - 89 * DAY);
  add('CV (2).pdf', 210_000, now - 88 * DAY);
  add('Documents/tenancy-agreement.pdf', 1_850_000, now - 500 * DAY);
  add('tenancy-agreement copy.pdf', 1_850_000, now - 499 * DAY);
  add('IMG_4012 2.HEIC', files.find((f) => f.name === 'IMG_4012.HEIC')!.size, now - 30 * DAY);

  return {
    rootName: 'Downloads',
    files,
    skipped: { dsStore: 14, dotfiles: 3, nodeModules: 1, git: 1, unreadable: 0 },
    scannedAt: now,
  };
}
