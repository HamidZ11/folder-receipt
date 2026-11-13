import { expect, test } from '@playwright/test';

const CASES = ['demo', 'worst', 'empty', 'one', '100k', 'one-category'] as const;
const WIDTHS = [
  { name: '1280', width: 1280, height: 900, zoom: false },
  { name: '390', width: 390, height: 844, zoom: false },
  // break-ui: text at 200% (browser text zoom) on the narrowest layout.
  { name: '390-text200', width: 390, height: 844, zoom: true },
] as const;

for (const c of CASES) {
  for (const vp of WIDTHS) {
    test(`receipt: ${c} @ ${vp.name}`, async ({ page, browserName }) => {
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(e.message));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`/?data=${c}`);
      if (vp.zoom) await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
      const receipt = page.getByRole('article');
      await expect(receipt).toBeVisible();
      await expect(page.getByTestId('dev-data-toggle').getByRole('button', { pressed: true })).toBeVisible();

      // Automated break checks.
      const report = await receipt.evaluate((article) => {
        const box = article.getBoundingClientRect();
        const cs = getComputedStyle(article);
        const left = box.left + parseFloat(cs.paddingLeft) - 1;
        const right = box.right - parseFloat(cs.paddingRight) + 1;
        const overflow: string[] = [];
        for (const el of article.querySelectorAll<HTMLElement>('*')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > right || r.left < left)
            overflow.push(`${el.tagName}.${el.className.toString().slice(0, 40)} "${el.textContent?.slice(0, 40)}" ${Math.round(r.left)}–${Math.round(r.right)} vs ${Math.round(left)}–${Math.round(right)}`);
        }
        // Within a row, nothing in the label column may run into the value column.
        for (const row of article.querySelectorAll<HTMLElement>('[data-row]')) {
          const dd = row.querySelector(':scope > dd');
          const dt = row.querySelector(':scope > dt');
          if (!dd || !dt) continue;
          const d = dd.getBoundingClientRect();
          for (const el of [dt, ...dt.querySelectorAll('*')]) {
            const r = el.getBoundingClientRect();
            const sameLine = r.top < d.bottom - 1 && r.bottom > d.top + 1; // stacked rows are fine
            if (r.width > 0 && r.height > 0 && sameLine && r.right > d.left + 1)
              overflow.push(`overlap: "${el.textContent?.slice(0, 30)}" right ${Math.round(r.right)} > value left ${Math.round(d.left)}`);
          }
        }
        // Only one ellipsis per file name (the stem tail and extension never truncate).
        const doubleEllipsis = [...article.querySelectorAll<HTMLElement>('dt [title]')]
          .filter((name) => [...name.querySelectorAll<HTMLElement>(':scope > span:last-child > span')]
            .filter((s) => {
              // Range width keeps sub-pixel overflow, which scrollWidth rounds away (and which still shows an ellipsis).
              // Measured: the old bug overflowed the stem tail by 0.004–0.063px; the fix gives ≤ 0.
              const range = document.createRange();
              range.selectNodeContents(s);
              return range.getBoundingClientRect().width > s.getBoundingClientRect().width + 0.001;
            }).length > 1)
          .map((n) => n.title.slice(0, 30));
        // Extensions are never cut.
        const clippedExt = [...article.querySelectorAll<HTMLElement>('[data-ext]')]
          .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > right)
          .map((el) => el.textContent);
        const stacked = [...article.querySelectorAll<HTMLElement>('[data-row]')].filter((row) => {
          const dt = row.querySelector(':scope > dt');
          const dd = row.querySelector(':scope > dd');
          return dt && dd && dd.getBoundingClientRect().top >= dt.getBoundingClientRect().bottom - 1;
        }).length;
        // In item rows the size is either beside the name (same line) or stacked below it, never above.
        const misaligned = [...article.querySelectorAll<HTMLElement>('[data-row]')].flatMap((row) => {
          const line = row.querySelector<HTMLElement>(':scope > dt [title] > span:not([aria-hidden])');
          const dd = row.querySelector(':scope > dd');
          if (!line || !dd) return [];
          const n = line.getBoundingClientRect();
          const d = dd.getBoundingClientRect();
          const stackedBelow = d.top >= n.bottom - 1;
          const sameLine = Math.abs(d.bottom - n.bottom) <= 3;
          return stackedBelow || sameLine ? [] : [`"${line.textContent?.slice(0, 20)}" name ${Math.round(n.top)}–${Math.round(n.bottom)}, size ${Math.round(d.top)}–${Math.round(d.bottom)}`];
        });
        const text = (article as HTMLElement).innerText;
        return {
          overflow: overflow.slice(0, 5),
          clippedExt,
          doubleEllipsis,
          misaligned,
          stacked,
          bad: (text.match(/NaN|undefined|Infinity|\[object|\b1 files\b/g) ?? []),
          segments: article.querySelectorAll('[role="img"] > div').length,
          legend: article.querySelectorAll('[role="img"] + ul > li').length,
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(report.overflow, 'nothing pokes out of the receipt').toEqual([]);
      expect(report.bad, 'no raw/garbage values').toEqual([]);
      expect(report.clippedExt, 'file extensions are never cut').toEqual([]);
      expect(report.doubleEllipsis, 'one ellipsis per name at most').toEqual([]);
      expect(report.misaligned, 'size beside or below its name, never above').toEqual([]);
      console.info(`[${browserName}] ${c} @ ${vp.name}: ${report.stacked} item rows stacked`);
      expect(report.legend, 'every bar segment has a legend entry').toBe(report.segments);
      expect(report.pageOverflow, 'no horizontal page scroll').toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);

      // Screenshot the receipt without the dev toggle over it.
      await page.getByTestId('dev-data-toggle').evaluate((el) => (el.style.display = 'none'));
      await page
        .getByRole('region', { name: 'Receipt' })
        .screenshot({ path: `screens/slice-4/${c}-${vp.name}-${browserName}.png` });
      if (c === 'demo') await page.screenshot({ path: `screens/slice-4/page-${vp.name}-${browserName}.png`, fullPage: true });
    });
  }
}
