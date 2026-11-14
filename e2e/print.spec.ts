import { expect, test, type Page } from '@playwright/test';
import { makeTree, removeTree } from './tree.ts';

type PrintInfo = { playState: string; duration: number; keyframes: string[]; startTime: number | null };

async function printInfo(page: Page): Promise<PrintInfo | null> {
  return page.evaluate(() => {
    const paper = document.querySelector('[data-testid="paper"]')!;
    const a = paper.getAnimations()[0];
    if (!a) return null;
    const effect = a.effect as KeyframeEffect;
    return {
      playState: a.playState,
      duration: Number(effect.getTiming().duration),
      keyframes: effect.getKeyframes().map((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x)).join('+')),
      startTime: typeof a.startTime === 'number' ? a.startTime : null,
    };
  });
}

/** Records every animation frame from load, for the frame trace. */
async function recordFrames(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __frames: number[] };
    w.__frames = [];
    const tick = (t: number) => {
      w.__frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** A finished animation without forwards fill drops out of getAnimations(), so null counts as finished. */
const isDone = (i: PrintInfo | null) => i === null || i.playState === 'finished';

const isTransformIdentity = (t: string) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';

test.describe('print (Chromium)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium runs the motion checks; WebKit takes the end-state screenshot');

  /** Load the page so the sample prints, wait for the feed, and return its frame trace. */
  async function tracePrint(page: Page) {
    const info = await printInfo(page);
    expect(info, 'a print animation is running on the paper').not.toBeNull();
    const height = await page.getByTestId('paper').evaluate((el) => el.getBoundingClientRect().height);
    await page.getByTestId('paper').evaluate((el) => el.getAnimations()[0]!.finished);
    const r = await page.evaluate((start) => {
      const frames = (window as unknown as { __frames: number[] }).__frames;
      const end = performance.now();
      const inPrint = frames.filter((t) => t >= (start ?? 0) && t <= end);
      const gaps = inPrint.slice(1).map((t, i) => t - inPrint[i]!);
      return {
        wall: (inPrint.at(-1) ?? 0) - (inPrint[0] ?? 0),
        frames: inPrint.length,
        maxGap: Math.max(...gaps),
        over25: gaps.filter((g) => g > 25).length,
        slowAt: gaps.flatMap((g, i) => (g > 25 ? [`${Math.round(inPrint[i]! - (start ?? 0))}ms:${g.toFixed(1)}`] : [])),
        median: [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]!,
      };
    }, info!.startTime);
    return { info: info!, height, ...r };
  }

  test('sample prints on first load: duration, frame trace, end state', async ({ page }) => {
    await recordFrames(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    // Cold: the first load in a fresh browser. Logged, not gated (a real first visit is cold too).
    await page.goto('/');
    const cold = await tracePrint(page);
    // Warm: same session cleared and reloaded, so the sample prints again. Gated.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    const warm = await tracePrint(page);

    for (const [name, r] of [['cold', cold], ['warm', warm]] as const)
      console.info(
        `[print ${name}] paper ${Math.round(r.height)}px → duration ${Math.round(r.info.duration)}ms; measured ${Math.round(r.wall)}ms over ${r.frames} frames; ` +
          `median ${r.median.toFixed(1)}ms, worst ${r.maxGap.toFixed(1)}ms, frames over 25ms: ${r.over25} ${JSON.stringify(r.slowAt)}`,
      );

    expect(warm.info.keyframes.every((k) => k === 'transform'), 'only transform animates').toBe(true);
    expect(warm.info.duration).toBeGreaterThanOrEqual(1400);
    expect(warm.info.duration).toBeLessThanOrEqual(2200);
    expect(Math.abs(warm.wall - warm.info.duration)).toBeLessThan(100);
    expect(warm.over25, 'no dropped frames (gaps > 25ms) during a warm print').toBe(0);
    expect(cold.over25, 'cold start: at most one late frame').toBeLessThanOrEqual(1);

    const t = await page.getByTestId('paper').evaluate((el) => getComputedStyle(el).transform);
    expect(isTransformIdentity(t)).toBe(true);
    await expect(page.getByTestId('paper')).not.toHaveAttribute('aria-busy');
  });

  test('footer first: the paper feeds down out of the slot above, so the footer shows before the header', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const r = await page.evaluate(() => {
      const paper = document.querySelector('[data-testid="paper"]')!;
      const a = paper.getAnimations()[0]!;
      a.pause();
      a.currentTime = Number(a.effect!.getTiming().duration) * 0.3;
      const slot = document.querySelector('[data-testid="slot"]')!.getBoundingClientRect();
      const rows = [...paper.querySelectorAll('[data-row]')];
      const first = rows[0]!.getBoundingClientRect();
      const last = rows.at(-1)!.getBoundingClientRect();
      const start = (a.effect as KeyframeEffect).getKeyframes()[0]!.transform as string;
      a.finish();
      return { slotTop: slot.top, headerBottom: first.bottom, footerTop: last.top, start };
    });
    expect(r.start).toMatch(/^translateY\(-\d/); // starts above the slot (negative offset)
    expect(r.footerTop, 'footer is out of the slot at 30%').toBeGreaterThan(r.slotTop);
    expect(r.headerBottom, 'header is still inside the slot at 30%').toBeLessThan(r.slotTop);
  });

  test('click skips straight to the end', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);
    expect((await printInfo(page))!.playState).toBe('running');
    await page.mouse.click(4, 4);
    expect(isDone(await printInfo(page))).toBe(true);
    const t = await page.getByTestId('paper').evaluate((el) => getComputedStyle(el).transform);
    expect(isTransformIdentity(t)).toBe(true);
  });

  test('a key skips straight to the end', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);
    await page.keyboard.press('k');
    expect(isDone(await printInfo(page))).toBe(true);
    const t = await page.getByTestId('paper').evaluate((el) => getComputedStyle(el).transform);
    expect(isTransformIdentity(t)).toBe(true);
  });

  test('modifier keys do not skip', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(200);
    await page.keyboard.press('Shift');
    expect((await printInfo(page))!.playState).toBe('running');
  });

  test('sample prints once per session; a reload shows it static', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('k');
    await page.reload();
    expect(await printInfo(page)).toBeNull();
  });

  test('reduced motion: a 200ms fade, no movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const info = await printInfo(page);
    expect(info!.keyframes.every((k) => k === 'opacity')).toBe(true);
    expect(info!.duration).toBe(200);
  });

  test('a new drop mid-print ends the print, fades the old paper, then prints the new one', async ({ page }) => {
    const dir = '/tmp/fr-e2e-print-small';
    makeTree(dir, 40);
    try {
      await page.goto('/');
      await page.waitForTimeout(300);
      expect((await printInfo(page))!.playState).toBe('running');
      await page.getByTestId('folder-input').setInputFiles(dir);
      await expect(page.getByTestId('scan-status')).toContainText('fr-e2e-print-small: 41 files.');
      // The new receipt is printing (or has printed) and the old fade is gone.
      const info = await printInfo(page);
      expect(info!.keyframes.every((k) => k === 'transform')).toBe(true);
      await page.getByTestId('paper').evaluate((el) => el.getAnimations()[0]?.finished);
      await expect(page.getByRole('article')).toContainText('fr-e2e-print-small');
      const opacity = await page.getByTestId('paper').evaluate((el) => getComputedStyle(el).opacity);
      expect(opacity).toBe('1');
    } finally {
      removeTree(dir);
    }
  });
});

test('end state @ 390 (WebKit)', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'single WebKit end-state screenshot');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await printInfo(page), 'the sample prints in WebKit too').not.toBeNull();
  await page.getByTestId('paper').evaluate((el) => el.getAnimations()[0]?.finished);
  const t = await page.getByTestId('paper').evaluate((el) => getComputedStyle(el).transform);
  expect(isTransformIdentity(t)).toBe(true);
  await page.getByTestId('dev-data-toggle').evaluate((el) => (el.style.display = 'none')); // e2e-build chrome, not the app
  await page.screenshot({ path: 'screens/slice-5/end-state-390-webkit.png', fullPage: true });
});
