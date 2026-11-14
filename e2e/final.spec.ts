import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { makeTree, removeTree } from './tree.ts';

// The real page (direction D). Chromium: screenshots, layout, gesture, export. WebKit: end state.
const WIDTHS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;
const OUT = 'screens/final';
const DIR = '/tmp/fr-e2e-final';

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => makeTree(DIR, 20_000));
test.afterAll(() => removeTree(DIR));

function watch(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function ready(page: Page) {
  await page.getByTestId('paper').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('dev-data-toggle').evaluate((el: HTMLElement) => (el.style.visibility = 'hidden')); // e2e-build chrome
}

/** Every receipt label (dt that isn't a file name) sits on one line. */
const wrappedLabels = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-receipt] dt')]
      .filter((dt) => !dt.querySelector('[title]'))
      .filter((dt) => {
        const r = document.createRange();
        r.selectNodeContents(dt);
        return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1;
      })
      .map((dt) => dt.textContent),
  );

/** Legend rows: how many entries sit on each row. */
const legendRows = (page: Page) =>
  page.locator('[data-legend]').evaluate((ul) => {
    const tops = [...ul.children].map((li) => Math.round(li.getBoundingClientRect().top));
    const rows = new Map<number, number>();
    for (const t of tops) rows.set(t, (rows.get(t) ?? 0) + 1);
    return [...rows.values()];
  });

for (const vp of WIDTHS) {
  test(`final @ ${vp.name}: idle, scanning, mid-print, done, torn export`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'screenshots and gesture in Chromium');
    test.setTimeout(120_000);
    const errors = watch(page);
    const fonts: string[] = [];
    page.on('request', (r) => r.url().endsWith('.woff2') && fonts.push(r.url()));
    await page.addInitScript(() => {
      sessionStorage.setItem('fr-sample-printed', '1'); // idle = a return visit: the sample, static
      document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`));
    });
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Idle
    await page.goto('/');
    await ready(page);
    await expect(page.getByTestId('device-status')).toContainText('Ready');
    await expect(page.getByTestId('export-controls')).toHaveAttribute('data-shown', '');
    expect(await wrappedLabels(page), 'no receipt label wraps').toEqual([]);
    expect(await legendRows(page), 'legend: two even rows of three').toEqual([3, 3]);
    // Below the paper there is only the page footer (the full privacy sentence).
    const below = await page.evaluate(() => {
      const paperBottom = document.querySelector('[data-testid="slot"]')!.getBoundingClientRect().bottom;
      return [...document.querySelectorAll('main > *')].filter((el) => el.getBoundingClientRect().top > paperBottom).map((el) => el.tagName);
    });
    expect(below).toEqual(['FOOTER']);
    await expect(page.locator('main > footer')).toContainText('never uploaded');
    await expect(page.getByTestId('device')).toContainText('Nothing leaves your browser.');
    await page.screenshot({ path: `${OUT}/idle-${vp.name}.png`, fullPage: true });

    // NAMES: a clear on/off light, aria-pressed in step.
    const names = page.getByRole('button', { name: 'Show file names' });
    await expect(names).toHaveAttribute('aria-pressed', 'false');
    await names.click();
    await expect(names).toHaveAttribute('aria-pressed', 'true');
    expect(await names.locator('span').first().evaluate((el) => el.className)).toContain('bg-accent');
    await names.click();
    await expect(names).toHaveAttribute('aria-pressed', 'false');

    // Scanning (a real folder through the button), then mid-print, then done.
    await page.getByTestId('folder-input').setInputFiles(DIR);
    await expect(page.getByTestId('device-status')).toContainText('Scanning', { timeout: 30_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/scanning-${vp.name}.png`, fullPage: true });
    await expect(page.getByTestId('device-status')).toContainText('Printing', { timeout: 60_000 });
    await expect(page.getByTestId('export-controls')).not.toHaveAttribute('data-shown', '');
    expect(await page.getByTestId('tear-hint').evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await page.getByTestId('paper').evaluate((el) => {
      const a = el.getAnimations().find((x) => x.playState === 'running')!;
      a.pause();
      a.currentTime = Number(a.effect!.getTiming().duration) * 0.5;
    });
    await page.screenshot({ path: `${OUT}/midprint-${vp.name}.png`, fullPage: true });
    await page.getByTestId('paper').evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
    await expect(page.getByTestId('device-status')).toContainText('Printed');
    await expect.poll(() => page.getByTestId('export-controls').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(await wrappedLabels(page)).toEqual([]);
    // No orphan in the skipped line: its last line holds at least two items.
    const skipLines = await page.locator('[data-skip-item]').evaluateAll((items) => {
      const rows = new Map<number, number>();
      for (const el of items) {
        const top = Math.round(el.getBoundingClientRect().top);
        rows.set(top, (rows.get(top) ?? 0) + 1);
      }
      return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
    });
    expect(skipLines.length, 'skipped items present').toBeGreaterThan(0);
    if (skipLines.length > 1) expect(skipLines.at(-1)!, `no orphan in the skipped line ${JSON.stringify(skipLines)}`).toBeGreaterThanOrEqual(2);
    // A zero discount has no row: this folder has no duplicates.
    await expect(page.getByRole('article')).not.toContainText('Duplicates');
    await expect(page.getByRole('article')).toContainText('Leftover installers');
    await page.screenshot({ path: `${OUT}/done-${vp.name}.png`, fullPage: true });

    // Torn export: pull from the grip; Space Mono goes into the PNG without a CSP violation.
    await page.getByTestId('tear-hint').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const g = (await page.getByTestId('tear-hint').boundingBox())!;
    fonts.length = 0;
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
        await page.mouse.down();
        await page.mouse.move(g.x + g.width / 2 + 8, g.y + g.height / 2 + 180, { steps: 12 });
        await page.mouse.up();
      })(),
    ]);
    await dl.saveAs(`${OUT}/torn-export-${vp.name}.png`);
    expect(readFileSync(`${OUT}/torn-export-${vp.name}.png`).subarray(1, 4).toString()).toBe('PNG');
    expect(fonts.some((u) => u.includes('space-mono'))).toBe(true);
    await expect(page.locator('.torn-edge')).toHaveAttribute('data-torn-top', '');
    expect(errors, 'no CSP violations or errors').toEqual([]);
  });
}

test('final @ 390 (WebKit): end state', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'single WebKit end-state screenshot');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('paper').evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await ready(page);
  expect(await wrappedLabels(page)).toEqual([]);
  expect(await legendRows(page)).toEqual([3, 3]);
  await page.screenshot({ path: `${OUT}/done-390-webkit.png`, fullPage: true });
});
