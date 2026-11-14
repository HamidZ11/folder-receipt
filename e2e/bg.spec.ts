import { expect, test, type Page } from '@playwright/test';
import { makeTree, removeTree } from './tree.ts';

// Page-environment prototypes (?bg=1–4). Chromium: screenshots and the dot field's motion rules.
test.skip(({ browserName }) => browserName !== 'chromium', 'environment screenshots in Chromium');
test.describe.configure({ mode: 'serial' });

const DIR = '/tmp/fr-e2e-bg';
const NAMES = ['', 'dots', 'spike', 'surface', 'wordmark'];
test.beforeAll(() => makeTree(DIR, 400));
test.afterAll(() => removeTree(DIR));

async function settle(page: Page) {
  await page.getByTestId('paper').waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const id of ['dev-data-toggle', 'dev-env-toggle'])
    await page.getByTestId(id).evaluate((el: HTMLElement) => (el.style.visibility = 'hidden')); // dev chrome
}
const finishPrint = (page: Page) =>
  page.getByTestId('paper').evaluate((el) => Promise.all(el.getAnimations().map((a) => (a.finish(), a.finished))));

for (const bg of [1, 2, 3, 4]) {
  for (const vp of [
    { name: '1280', width: 1280, height: 900 },
    { name: '390', width: 390, height: 844 },
  ]) {
    test(`bg ${bg} (${NAMES[bg]}) @ ${vp.name}: idle and done`, async ({ page, context }) => {
      const errors: string[] = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Idle: a return visit, nothing printed this session yet.
      await context.addInitScript(() => sessionStorage.setItem('fr-sample-printed', '1'));
      await page.goto(`/?bg=${bg}`);
      await settle(page);
      await expect(page.locator(`[data-env="${NAMES[bg]}"]`)).toHaveCount(1);
      await page.screenshot({ path: `screens/bg/${bg}-${NAMES[bg]}-idle-${vp.name}.png`, fullPage: true });

      // Done: two prints this session (a folder, then a tear re-print would also count).
      await page.getByTestId('folder-input').setInputFiles(DIR);
      await expect(page.getByTestId('device-status')).toContainText('Printing', { timeout: 30_000 });
      await finishPrint(page);
      await expect(page.getByTestId('device-status')).toContainText('Printed');
      await page.getByTestId('folder-input').setInputFiles(DIR);
      await expect(page.getByTestId('device-status')).toContainText('Printing', { timeout: 30_000 });
      await finishPrint(page);
      await expect(page.getByTestId('device-status')).toContainText('Printed');
      if (bg === 2 && vp.width >= 1024) await expect(page.locator('.spike-paper')).toHaveCount(2);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `screens/bg/${bg}-${NAMES[bg]}-done-${vp.name}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
}

test('dots: the field moves with the counter, and stays still under reduced motion', async ({ browser }) => {
  const big = `${DIR}-big`;
  makeTree(big, 30_000);
  try {
    for (const reduce of [false, true]) {
      const ctx = await browser.newContext({ reducedMotion: reduce ? 'reduce' : 'no-preference', viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript(() => sessionStorage.setItem('fr-sample-printed', '1'));
      const page = await ctx.newPage();
      await page.goto('/?bg=1');
      await page.getByTestId('paper').waitFor();
      const frame = () => page.locator('[data-env="dots"]').evaluate((c: HTMLCanvasElement) => c.toDataURL().length + ':' + c.toDataURL().slice(-64));
      const still = await frame();
      await page.getByTestId('folder-input').setInputFiles(big);
      await expect(page.getByTestId('device-status')).toContainText('Scanning', { timeout: 30_000 });
      if (reduce) {
        await page.waitForTimeout(800); // the counter has moved several times by now
        expect(await frame(), 'reduced motion: static').toBe(still);
      } else {
        await expect.poll(frame, { message: 'the band moves with the counter' }).not.toBe(still);
      }
      await ctx.close();
    }
  } finally {
    removeTree(big);
  }
});
