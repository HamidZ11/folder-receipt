import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// One-off: OG=1 pnpm exec playwright test e2e/og.spec.ts --project=chromium
// Tears the sample receipt (a real torn export), then composes it at 1200×630 into public/og.png.
test('generate public/og.png from a torn export of the sample', async ({ page, browser, browserName }) => {
  test.skip(!process.env.OG || browserName !== 'chromium', 'run with OG=1 in Chromium');
  await page.addInitScript(() => sessionStorage.setItem('fr-sample-printed', '1'));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByTestId('dev-data-toggle').evaluate((el: HTMLElement) => (el.style.display = 'none'));
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('tear-hint').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const g = (await page.getByTestId('tear-hint').boundingBox())!;
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await page.mouse.down();
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 200, { steps: 10 });
      await page.mouse.up();
    })(),
  ]);
  const torn = 'test-results/og-torn.png';
  await dl.saveAs(torn);
  const png = `data:image/png;base64,${readFileSync(torn).toString('base64')}`;

  // Compose on the page colour (#0d0d0c, tokens.css): the torn receipt, clipped to the paper (the export
  // frame's padding is 32px = 16px at this scale), slightly askew, torn top showing, running off the bottom.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.setContent(`<!doctype html><html><body style="margin:0;width:1200px;height:630px;overflow:hidden;background:#0d0d0c;display:flex;justify-content:center">
    <div style="margin-top:36px;transform:rotate(-3deg);filter:drop-shadow(0 24px 40px rgb(0 0 0 / 0.65))">
      <img src="${png}" style="display:block;width:500px;height:auto;margin:-16px;clip-path:inset(16px)">
    </div>
  </body></html>`);
  await og.waitForLoadState('load');
  await og.screenshot({ path: 'public/og.png' });
  const b = readFileSync('public/og.png');
  expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([1200, 630]);
});
