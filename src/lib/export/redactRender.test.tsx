import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Receipt } from '../../components/receipt/Receipt.tsx';
import { makeSampleScan } from '../sample/sampleFolder.ts';
import { computeStats } from '../stats/computeStats.ts';

const scan = makeSampleScan(Date.UTC(2026, 10, 13, 12));
const stats = computeStats(scan);
const render = (redact: boolean) =>
  renderToStaticMarkup(<Receipt stats={stats} files={scan.files} sample forExport redact={redact} />);

describe('export receipt', () => {
  it('redacted by default in export: names → ▇▇▇▇.ext, folder hidden, URL kept, no lists', () => {
    const html = render(true);
    expect(html).toContain('▇▇▇▇.iso');
    expect(html).not.toContain('ubuntu');
    expect(html).not.toContain('video-final');
    expect(html).not.toContain('Downloads');
    expect(html).toContain('folder-receipt.vercel.app');
    expect(html).not.toContain('List ');
  });
  it('with names shown, real names appear', () => {
    const html = render(false);
    expect(html).toContain('ubuntu-24.04-desktop-amd64.iso');
    expect(html).toContain('Downloads');
  });
});
