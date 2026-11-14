import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// D · Combined. Chromium: screenshots, layout checks, gesture, export.
test.skip(({ browserName }) => browserName !== 'chromium', 'design D checks run in Chromium');

const WIDTHS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;
const OUT = 'screens/design-d';

function watch(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function open(page: Page, query: string) {
  await page.goto(`/?proto=D&${query}`);
  await page.locator('.proto-picker').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.proto-picker').evaluate((el: HTMLElement) => (el.style.visibility = 'hidden')); // harness chrome
}

/** Every receipt label (dt that isn't a file name) sits on one line. */
async function wrappedLabels(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-receipt] dt')]
      .filter((dt) => !dt.querySelector('[title]'))
      .filter((dt) => {
        const r = document.createRange();
        r.selectNodeContents(dt);
        const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
        return tops.size > 1;
      })
      .map((dt) => dt.textContent),
  );
}

for (const vp of WIDTHS) {
  test(`D @ ${vp.name}: idle and done in both box colours, scanning, mid-print; no label wraps`, async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const box of ['dark', 'light'] as const) {
      await open(page, `state=idle&box=${box}`);
      await page.screenshot({ path: `${OUT}/idle-${box}-${vp.name}.png`, fullPage: true });
      await open(page, `state=done&box=${box}`);
      await expect(page.getByTestId('export-controls')).toHaveAttribute('data-shown', '');
      await page.screenshot({ path: `${OUT}/done-${box}-${vp.name}.png`, fullPage: true });
    }
    expect(await wrappedLabels(page), 'no receipt label wraps').toEqual([]);
    const labels = await page.locator('[data-receipt] dt').allTextContents();
    for (const l of ['Files not modified in a year', 'Leftover installers (9)', 'Total savings']) expect(labels).toContain(l);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

    await open(page, 'state=scanning');
    await expect(page.getByTestId('display')).toContainText('640');
    await page.screenshot({ path: `${OUT}/scanning-${vp.name}.png`, fullPage: true });

    await open(page, 'state=printing');
    // Controls and the tear hint are hidden for the whole print.
    await expect(page.getByTestId('export-controls')).not.toHaveAttribute('data-shown', '');
    expect(await page.getByTestId('export-controls').evaluate((el) => [getComputedStyle(el).opacity, (el as HTMLElement).inert])).toEqual(['0', true]);
    expect(await page.getByTestId('tear-hint').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await page.getByTestId('paper').evaluate((el) => {
      const a = el.getAnimations()[0]!;
      a.pause();
      a.currentTime = Number(a.effect!.getTiming().duration) * 0.5;
    });
    await page.screenshot({ path: `${OUT}/midprint-${vp.name}.png`, fullPage: true });
    // Land it: controls and hint fade in.
    await page.getByTestId('paper').evaluate((el) => el.getAnimations()[0]!.finish());
    await expect(page.getByTestId('export-controls')).toHaveAttribute('data-shown', '');
    await expect.poll(() => page.getByTestId('export-controls').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await expect.poll(() => page.getByTestId('tear-hint').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(errors).toEqual([]);
  });

  test(`D @ ${vp.name}: tear exports Space Mono within the CSP; top edge turns zigzag`, async ({ page }) => {
    const errors = watch(page);
    const fonts: string[] = [];
    page.on('request', (r) => r.url().endsWith('.woff2') && fonts.push(r.url()));
    await page.addInitScript(() =>
      document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`)),
    );
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await open(page, 'state=done');
    await expect(page.locator('.d-tear-edge')).not.toHaveAttribute('data-torn-top', '');
    // Pull from the grip (works for mouse and touch). Mouse coordinates are viewport-relative: centre it first.
    await page.getByTestId('tear-hint').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const grip = (await page.getByTestId('tear-hint').boundingBox())!;
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    fonts.length = 0;
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 8, y + 180, { steps: 12 });
        await page.mouse.up();
      })(),
    ]);
    const out = `${OUT}/torn-export-${vp.name}.png`;
    await dl.saveAs(out);
    expect(readFileSync(out).subarray(1, 4).toString()).toBe('PNG');
    expect(fonts.some((u) => u.includes('space-mono')), 'Space Mono fetched for the export').toBe(true);
    await expect(page.locator('.d-tear-edge')).toHaveAttribute('data-torn-top', '');
    expect(errors, 'no CSP violations or errors').toEqual([]);
  });

  test(`D @ ${vp.name}: break-ui worst case holds`, async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await open(page, 'state=done&data=worst');
    await expect(page.getByRole('article')).toContainText('2.2 TB');
    const r = await page.getByRole('article').evaluate((article) => {
      const box = article.getBoundingClientRect();
      const out = [...article.querySelectorAll<HTMLElement>('*')]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > box.right + 1 || b.left < box.left - 1);
        })
        .map((el) => el.textContent?.slice(0, 30));
      return { out, text: (article as HTMLElement).innerText };
    });
    expect(r.out, 'nothing past the paper edge').toEqual([]);
    expect(r.text).not.toMatch(/NaN|undefined|\b1 files\b/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    console.info(`[D worst ${vp.name}] wrapped labels: ${JSON.stringify(await wrappedLabels(page))}`);
    await page.screenshot({ path: `${OUT}/worst-done-${vp.name}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
