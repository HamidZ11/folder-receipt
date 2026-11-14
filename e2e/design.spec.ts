import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Design prototypes (dev-only harness, present in the e2e build). Chromium only: screenshots + gesture.
test.skip(({ browserName }) => browserName !== 'chromium', 'design screenshots run in Chromium');

const DIRECTIONS = (process.env.PROTO_DIRECTIONS ?? 'A,B').split(',');
const WIDTHS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

/** Wait for the lazy harness and the fonts, and hide the picker (harness chrome) for the shot. */
async function settleFonts(page: Page) {
  await page.locator('.proto-picker').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.proto-picker').evaluate((el: HTMLElement) => (el.style.visibility = 'hidden'));
}

for (const d of DIRECTIONS) {
  for (const vp of WIDTHS) {
    test(`design ${d} @ ${vp.name}: idle, mid-print, finished`, async ({ page }) => {
      const errors = errorsOf(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.goto(`/?proto=${d}&state=idle`);
      await expect(page.locator('.proto-picker')).toBeVisible();
      await settleFonts(page);
      await page.screenshot({ path: `screens/design/${d}-idle-${vp.name}.png`, fullPage: true });

      await page.goto(`/?proto=${d}&state=printing`);
      await settleFonts(page);
      await page.getByTestId('paper').evaluate((el) => {
        const a = el.getAnimations()[0]!;
        a.pause();
        a.currentTime = Number(a.effect!.getTiming().duration) * 0.5;
      });
      await page.screenshot({ path: `screens/design/${d}-midprint-${vp.name}.png`, fullPage: true });

      await page.goto(`/?proto=${d}&state=done`);
      await settleFonts(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'no sideways scroll').toBeLessThanOrEqual(0);
      await page.screenshot({ path: `screens/design/${d}-done-${vp.name}.png`, fullPage: true });

      await page.goto(`/?proto=${d}&state=done&font=2`);
      await settleFonts(page);
      await page.screenshot({ path: `screens/design/${d}-done-font2-${vp.name}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  }

  test(`design ${d}: the story plays (scan counter, then print)`, async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto(`/?proto=${d}`);
    await expect(page.getByTestId('display')).not.toHaveText(/—/, { timeout: 3000 });
    await expect(page.getByTestId('paper')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('paper').evaluate((el) => el.getAnimations()[0]?.finished);
    expect(errors).toEqual([]);
  });
}

for (const d of DIRECTIONS.filter((x) => x !== 'C')) {
  test(`design ${d}: tear past the threshold exports a PNG; a short pull springs back`, async ({ page }) => {
    const errors = errorsOf(page);
    const csp: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`));
    });
    page.on('console', (m) => m.text().startsWith('CSP') && csp.push(m.text()));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/?proto=${d}&state=done`);
    await settleFonts(page);
    const paper = page.getByTestId('paper');
    const box = (await paper.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + 200;

    // Short pull: springs back.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 50, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    expect(await paper.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);

    // Long pull: tears, exports, and a fresh receipt feeds out.
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 10, y + 220, { steps: 12 });
        await page.mouse.up();
      })(),
    ]);
    const out = `screens/design/${d}-torn-export.png`;
    await dl.saveAs(out);
    expect(readFileSync(out).subarray(1, 4).toString()).toBe('PNG');
    await expect.poll(() => paper.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0); // re-printing
    expect(csp).toEqual([]);
    expect(errors.filter((e) => !e.startsWith('CSP'))).toEqual([]);
  });
}
