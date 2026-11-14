import { expect, test } from '@playwright/test';


// The sample prints once per session; these specs test the static receipt.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('fr-sample-printed', '1'));
});

const widths = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
] as const;

for (const vp of widths) {
  test(`page shell @ ${vp.name}`, async ({ page, browserName }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
      });
    });

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');

    // CSP meta is present in the served (built) page.
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'self'");

    // Shell structure: drop zone and receipt slot are siblings, not nested.
    const dropZone = page.getByRole('region', { name: 'Drop your folder here' });
    const slot = page.getByRole('region', { name: 'Receipt' });
    await expect(dropZone).toBeVisible();
    await expect(slot).toBeVisible();
    expect(await dropZone.locator('section').count()).toBe(0);

    // Tokens applied (page background comes from tokens.css).
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(13, 13, 12)');

    // No horizontal overflow at any width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Assert before the screenshot: Playwright's WebKit screenshot injects its own
    // <style> (caret hiding), which our CSP correctly blocks. That isn't app behaviour.
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);

    await page.screenshot({ path: `screens/slice-1/${vp.name}-${browserName}.png`, fullPage: true });
  });
}
