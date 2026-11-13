import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('fr-sample-printed', '1'));
});

const rowsIn = (page: import('@playwright/test').Page) =>
  page.getByTestId('file-table-viewport').first().getByRole('row');

for (const vp of [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
]) {
  test(`expand Items on the sample and sort @ ${vp.name}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'List 1,210 files' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Hide list' })).toHaveAttribute('aria-expanded', 'true');

    const table = page.getByRole('table', { name: 'Items: file list' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: /Size/ })).toHaveAttribute('aria-sort', 'descending');
    await expect(rowsIn(page).first()).toContainText('ubuntu-24.04-desktop-amd64.iso');
    expect(await rowsIn(page).count(), 'virtualised: only the visible window is rendered').toBeLessThan(20);

    await table.getByRole('button', { name: /Name/ }).click();
    await expect(table.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');
    const firstName = await rowsIn(page).first().getByRole('cell').first().getAttribute('title').catch(() => null);
    const names = await rowsIn(page).evaluateAll((rows) => rows.map((r) => r.querySelector('[title]')?.getAttribute('title') ?? ''));
    expect([...names].sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' }))).toEqual(names);
    void firstName;

    await table.getByRole('button', { name: /Modified/ }).click();
    await expect(table.getByRole('columnheader', { name: /Modified/ })).toHaveAttribute('aria-sort', 'ascending');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.waitForTimeout(300); // let the expand settle for the screenshot
    await page.getByRole('region', { name: 'Receipt' }).screenshot({ path: `screens/slice-6/items-expanded-${vp.name}-${browserName}.png` });
  });
}

test('100k files: virtualised list stays small in the DOM and reaches the last row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?data=100k');
  await page.getByRole('button', { name: 'List 100,000 files' }).click();
  const viewport = page.getByTestId('file-table-viewport').first();
  await expect(viewport).toBeVisible();
  expect(await rowsIn(page).count()).toBeLessThan(30);
  await viewport.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await expect(rowsIn(page).last()).toHaveAttribute('aria-rowindex', '100001');
  expect(await rowsIn(page).count()).toBeLessThan(30);
});

test('collapsed lists are inert; reduced motion has no height transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const region = page.locator('[data-expandable] [inert]').first();
  await expect(region).toHaveCount(1);
  // motion-reduce:transition-none removes the transitioned property (duration stays as a token value).
  const property = await region.evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(property).toBe('none');
});
