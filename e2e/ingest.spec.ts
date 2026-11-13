import { expect, test, type Page } from '@playwright/test';
import { makeTree, removeTree } from './tree.ts';

// Chromium: 100k files with a main-thread budget. WebKit: 5k files, functional.
const SIZE = { chromium: 100_000, webkit: 5_000 } as const;

test.describe.configure({ mode: 'serial' });

let dir = '';
let n = 0;
test.beforeAll(({ browserName }) => {
  n = SIZE[browserName as keyof typeof SIZE];
  dir = `/tmp/fr-e2e-${browserName}-${n}`;
  makeTree(dir, n);
});
test.afterAll(() => removeTree(dir));

const doneText = () => `${dir.split('/').pop()}: ${(n + 1).toLocaleString('en-GB')} files.`; // + 1 bundle

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __lt: { start: number; dur: number }[] };
    w.__lt = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) w.__lt.push({ start: e.startTime, dur: e.duration });
      }).observe({ type: 'longtask', buffered: true });
      const ww = window as unknown as { __loaf: { start: number; dur: number; blocking: number }[] };
      ww.__loaf = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as unknown as { startTime: number; duration: number; blockingDuration: number }[])
          ww.__loaf.push({ start: e.startTime, dur: e.duration, blocking: e.blockingDuration });
      }).observe({ type: 'long-animation-frame', buffered: true });
    } catch {
      /* WebKit: no longtask API */
    }
  });
}

/** After `change`: record long tasks, how late a 16ms interval fires, and every status text. */
async function watchScan(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __t0: number; __late: number[]; __lateAt: number[]; __seen: string[]; __iv: number };
    w.__lateAt = [];
    w.__late = [];
    w.__seen = [];
    const input = document.querySelector('[data-testid="folder-input"]')!;
    input.addEventListener(
      'change',
      () => {
        w.__t0 = performance.now();
        let expected = performance.now() + 16;
        w.__iv = window.setInterval(() => {
          const t = performance.now();
          w.__late.push(t - expected);
          w.__lateAt.push(t - w.__t0);
          expected = t + 16;
        }, 16);
      },
      { capture: true },
    );
    const status = document.querySelector('[data-testid="scan-status"]')!;
    new MutationObserver(() => {
      const t = status.textContent ?? '';
      if (w.__seen.at(-1) !== t) w.__seen.push(t);
    }).observe(status, { subtree: true, childList: true, characterData: true });
  });
}

test('sample folder shows on load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('scan-status')).toHaveText('Showing a sample folder.');
  await expect(page.getByRole('button', { name: 'Choose a folder' })).toBeVisible();
});

test('scan keeps the main thread free (no screenshots during this run)', async ({ page, browserName }) => {
  test.setTimeout(240_000);
  await instrument(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await watchScan(page);

  const started = Date.now();
  await page.getByTestId('folder-input').setInputFiles(dir);
  const status = page.getByTestId('scan-status');
  await expect(status).toContainText(doneText(), { timeout: 180_000 });
  await expect(status).toContainText('Skipped:');
  await expect(status).toContainText('1 node_modules');
  // WebKit's folder picker omits hidden files entirely (.git, .env, .DS_Store),
  // so there is nothing to count on that path. Chromium lists them.
  if (browserName === 'chromium') await expect(status).toContainText('1 .DS_Store, 1 hidden, 1 node_modules, 1 .git');
  else await expect(status).toContainText('1 node_modules, hidden files and .git not visible in Safari.');
  const wall = Date.now() - started;

  const r = await page.evaluate(() => {
    const w = window as unknown as {
      __lt: { start: number; dur: number }[];
      __t0: number;
      __late: number[];
      __seen: string[];
      __iv: number;
      __lateAt: number[];
    };
    clearInterval(w.__iv);
    const bad = w.__late.map((l, i) => [Math.round(w.__lateAt[i]!), Math.round(l)]).filter(([, l]) => l! > 30);
    const loaf = (window as unknown as { __loaf?: { start: number; dur: number; blocking: number }[] }).__loaf ?? [];
    return { lt: w.__lt, t0: w.__t0, late: w.__late, seen: w.__seen, bad, loaf };
  });
  // The browser builds the FileList in one task *before* dispatching change; that task isn't ours.
  const browserTask = r.lt.find((t) => t.start < r.t0 && t.start + t.dur >= r.t0);
  const ours = r.lt.filter((t) => t.start >= r.t0 - 1);
  const worst = Math.max(0, ...ours.map((t) => t.dur));
  const late = [...r.late].sort((a, b) => a - b);
  const p95 = late[Math.floor(late.length * 0.95)] ?? 0;
  const maxLate = late.at(-1) ?? 0;
  const counts = r.seen.filter((t) => t.startsWith('Scanning'));
  const loafAfter = r.loaf.filter((f) => f.start >= r.t0 - 1);
  const maxBlocking = Math.max(0, ...loafAfter.map((f) => f.blocking));

  console.info(
    `[${browserName}] ${n.toLocaleString('en-GB')} files, ~${(wall / 1000).toFixed(1)}s from setInputFiles to done\n` +
      `  browser FileList task before change: ${browserTask ? `${browserTask.dur.toFixed(0)}ms` : 'n/a'}\n` +
      `  long tasks from change onwards: ${browserName === 'chromium' ? `${ours.length}, worst ${worst.toFixed(0)}ms` : 'n/a (no longtask API in WebKit)'}\n` +
      `  input blocking (LoAF) from change onwards: ${browserName === 'chromium' ? `max ${maxBlocking.toFixed(0)}ms over ${loafAfter.length} long frames` : 'n/a'}\n` +
      `  info only, 16ms timer lateness: p95 ${p95.toFixed(0)}ms, max ${maxLate.toFixed(0)}ms over ${late.length} ticks ` +
      `(late >30ms at [msAfterChange, lateness]: ${JSON.stringify(r.bad)})\n` +
      `  counter updates: ${counts.length} (${counts[0]} … ${counts.at(-1)})`,
  );

  if (browserName === 'chromium') expect(worst, 'no main-thread task over 50ms from change onwards').toBeLessThanOrEqual(50);
  if (browserName === 'chromium') expect(maxBlocking, 'input is never blocked during the scan').toBe(0);
  expect(counts.length, 'counter updates live during the scan').toBeGreaterThan(browserName === 'chromium' ? 10 : 1);
});

test('screenshots: mid-scan counter and finished status', async ({ page, browserName }) => {
  test.setTimeout(240_000);
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: '390', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('folder-input').setInputFiles(dir);
    const status = page.getByTestId('scan-status');
    if (browserName === 'chromium') {
      await expect(status).toContainText('Scanning', { timeout: 60_000 });
      await page.waitForTimeout(400); // let the count climb
      await page.screenshot({ path: `screens/slice-3/mid-scan-${vp.name}-${browserName}.png` });
    }
    await expect(status).toContainText(doneText(), { timeout: 180_000 });
    await page.screenshot({ path: `screens/slice-3/done-${vp.name}-${browserName}.png` });
  }
});

test('error copy: dropping a file instead of a folder', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit ignores dataTransfer on synthetic DragEvents; covered by the manual Safari drop test');
  await page.goto('/');
  // Synthetic drop of a plain file. Real folder drops can't be automated.
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'note.txt', { type: 'text/plain' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByTestId('scan-status')).toHaveText('That’s a file. Drop a folder.');
});
