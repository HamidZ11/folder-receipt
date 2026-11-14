import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('fr-sample-printed', '1');
    // Record the export clone's text (it's removed right after capture) and any CSP violation.
    const w = window as unknown as { __exportText: string[]; __csp: string[] };
    w.__exportText = [];
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    new MutationObserver(() => {
      const host = document.querySelector<HTMLElement>('[data-export-host]');
      const text = host?.textContent ?? '';
      if (text) w.__exportText.push(text);
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
});

function pngSize(path: string) {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

async function save(page: Page, label: string, out: string) {
  // The device's export controls appear once the paper has landed.
  await expect(page.getByTestId('export-controls')).toHaveAttribute('data-shown', '');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()]);
  await dl.saveAs(out);
  return dl.suggestedFilename();
}

test('export tall and square PNGs, names redacted by default, no CSP violations', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const tallPath = `screens/slice-7/tall-redacted-${browserName}.png`;
  const name = await save(page, 'Tall', tallPath);
  expect(name).toMatch(/^folder-receipt-\d{8}-tall\.png$/);
  const tall = pngSize(tallPath);
  expect(tall.height).toBeGreaterThan(tall.width);

  const squarePath = `screens/slice-7/square-redacted-${browserName}.png`;
  await save(page, 'Square', squarePath);
  const square = pngSize(squarePath);
  expect(square.width).toBe(square.height);

  // Redaction content is unit-tested (src/lib/export/redactRender.test.tsx).
  // Redacted and named exports must differ: checked in the next test.

  const csp = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
  console.info(`[export ${browserName}] tall ${tall.width}×${tall.height}, square ${square.width}×${square.height}; CSP violations: ${JSON.stringify(csp)}`);
  expect(csp, 'export works within the CSP').toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('[data-export-host]')).toHaveCount(0);
});

test('turning NAMES on changes the exported image', async ({ page, browserName }) => {
  await page.goto('/');
  const redacted = `screens/slice-7/cmp-redacted-${browserName}.png`;
  const named = `screens/slice-7/tall-names-${browserName}.png`;
  await save(page, 'Tall', redacted);
  await page.getByRole('button', { name: 'Show file names' }).click();
  await save(page, 'Tall', named);
  expect(readFileSync(named).equals(readFileSync(redacted)), 'names change the pixels').toBe(false);
});
