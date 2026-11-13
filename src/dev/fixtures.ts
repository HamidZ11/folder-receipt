// break-ui fixtures. Each is a ScanResult, so it enters through the same
// boundary as a real scan (computeStats → Receipt). Values are realistic, not random.

import { extOf } from '../lib/ingest/classify.ts';
import { makeSampleScan } from '../lib/sample/sampleFolder.ts';
import type { FileRecord, ScanResult } from '../lib/stats/types.ts';
import { emptySkipCounts } from '../lib/stats/types.ts';

export const FIXTURES = ['demo', 'worst', 'empty', 'one', '100k', 'one-category'] as const;
export type FixtureName = (typeof FIXTURES)[number];
export const FIXTURE_LABELS: Record<FixtureName, string> = {
  demo: 'Demo data',
  worst: 'Worst case',
  empty: 'Empty',
  one: 'One file',
  '100k': '100k files',
  'one-category': 'One category',
};

const DAY = 86_400_000;
const GB = 1_000_000_000;
const MB = 1_000_000;

function file(path: string, size: number, lastModified: number, kind: FileRecord['kind'] = 'file'): FileRecord {
  const name = path.split('/').pop()!;
  return { path, name, ext: extOf(name), size, lastModified, kind };
}

/** A real screen-recording naming pattern, padded with a real-sounding meeting title to exactly 200 chars. */
export const NAME_200 = (() => {
  const base =
    'Screen Recording 2026-11-13 at 10.42.11 – Quarterly business review with the extended leadership team, external auditors and the Northwind Industries Holdings board (confidential';
  const ext = ').mov';
  return base.padEnd(200 - ext.length, ', do not distribute').slice(0, 200 - ext.length) + ext;
})();

export function makeFixture(name: FixtureName, now: number): ScanResult {
  switch (name) {
    case 'demo':
      return makeSampleScan(now);

    case 'worst': {
      const old = now - 3 * 365 * DAY;
      const files: FileRecord[] = [
        // Items: each of the top 5 breaks differently, and together they exceed 2 TB.
        file(`Nagrania/${NAME_200}`, 640 * GB, now - 2 * DAY),
        file('Benachrichtigungseinstellungen_Export_2026-11-13T10-42-11Z_final_FINAL_v12.mov', 512 * GB, now - DAY),
        file('請求書_2026年11月_株式会社ノースウィンド・インダストリーズ・ホールディングス_会議録画.mov', 388 * GB, old),
        file('🎉 Wesele Oli i Kuby 👨‍👩‍👧‍👦 – wszystkie ujęcia z drona.mov', 256 * GB, now - 40 * DAY),
        file('تسجيل-اجتماع-المبيعات-الربع-الثالث-مع-فريق-الشرق-الأوسط.mov', 201 * GB, now - 400 * DAY),
        file('ubuntu-24.04.1-live-server-arm64+largemem.qcow2', 120 * GB, old),
        // Installers: one with a very long product name, and a duplicated one.
        file('Install macOS Tahoe 26.1 (25B78) – Universal Installer for Apple Silicon and Intel Macs.pkg', 18 * GB, old),
        file('Install macOS Tahoe 26.1 (25B78) – Universal Installer for Apple Silicon and Intel Macs (1).pkg', 18 * GB, old),
        file('Jo.dmg', 1, now), // one-letter-ish name, 1 byte
        // Every category present, one of them tiny, so Other + the 1% floor show up.
        file('voice.m4a', 1, now),
        file('a.zip', 3 * GB, now),
        file('photo.png', 2 * GB, now),
        file('Figma.app', 900 * MB, now, 'bundle'),
        file('notes', 5 * MB, now),
      ];
      // 1,284 duplicate copies (Finder " 2" pattern) and 12,345 files not modified in a year.
      for (let i = 0; i < 1_284; i++) {
        files.push(file(`Faktury/faktura-${i}.pdf`, 120_000 + i, old));
        files.push(file(`Faktury kopia/faktura-${i} 2.pdf`, 120_000 + i, old));
      }
      for (let i = 0; i < 12_345 - 2_568 - 5; i++) files.push(file(`archiwum/plik-${i}.txt`, 2_000, old));
      return {
        rootName:
          'Aleksandra Wiśniewska-Kowalczyk – Dokumenty do rozliczenia podatkowego 2025 (kopia zapasowa z dysku zewnętrznego)',
        files,
        skipped: { dsStore: 1_284, dotfiles: 12_345, nodeModules: 37, git: 4, unreadable: 2 },
        scannedAt: now,
      };
    }

    case 'empty':
      return { rootName: 'Nowy folder', files: [], skipped: emptySkipCounts(), scannedAt: now };

    case 'one':
      return {
        rootName: 'Jo',
        files: [file('CV.pdf', 210_000, now - 2 * DAY)],
        skipped: { ...emptySkipCounts(), dsStore: 1 },
        scannedAt: now,
      };

    case '100k': {
      const exts = ['mov', 'png', 'pdf', 'zip', 'dmg', 'txt', 'mp3', 'HEIC', ''];
      let seed = 7;
      const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      const files = Array.from({ length: 100_000 }, (_, i) =>
        file(
          `d${i % 400}/IMG_${10000 + i}${rand() < 0.05 ? ' (1)' : ''}.${exts[i % exts.length]}`,
          Math.floor(rand() ** 3 * 4 * GB),
          now - Math.floor(rand() * 1500) * DAY,
        ),
      );
      return { rootName: 'Downloads', files, skipped: emptySkipCounts(), scannedAt: now };
    }

    case 'one-category':
      return {
        rootName: 'Filmy',
        files: Array.from({ length: 300 }, (_, i) => file(`clip-${i}.mov`, (i + 1) * 10 * MB, now - i * DAY)),
        skipped: emptySkipCounts(),
        scannedAt: now,
      };
  }
}
