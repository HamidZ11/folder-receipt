import { useLayoutEffect, useRef, type RefObject } from 'react';
import { feedDuration, feedKeyframes, readFeedTokens } from '../lib/print/feed.ts';
import type { Receipt } from './useFolderScan.ts';

export const SAMPLE_PRINTED_KEY = 'fr-sample-printed';

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab']);

/**
 * The print: only the paper moves. It rises up out of the slot below it, header
 * first, like a till printer (WAAPI on
 * transform, so it runs on the compositor). Click, tap or a key skips to the
 * end with finish(); the skip itself never animates.
 */
export function usePrint(paper: RefObject<HTMLElement | null>, receipt: Receipt, scanning: boolean) {
  const print = useRef<Animation | null>(null);
  const exit = useRef<Animation | null>(null);

  // A new scan started: end any print at once, then fade the old paper out. It keeps its space.
  useLayoutEffect(() => {
    const el = paper.current;
    if (!el) return;
    if (scanning) {
      print.current?.finish();
      const { exitMs, feed } = readFeedTokens();
      exit.current = el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: exitMs,
        easing: feed.landingEase, // exiting → ease-out
        fill: 'forwards',
      });
    } else {
      // Scan ended without a new receipt (error, cancelled): bring the old one back.
      exit.current?.cancel();
      exit.current = null;
    }
  }, [scanning, paper]);

  // A new receipt: print it, unless it's the sample and this session has already seen it.
  useLayoutEffect(() => {
    const el = paper.current;
    if (!el) return;
    exit.current?.cancel();
    exit.current = null;
    print.current?.finish();
    if (!receipt.print) return;

    if (receipt.source === 'sample') {
      try {
        sessionStorage.setItem(SAMPLE_PRINTED_KEY, '1');
      } catch {
        /* storage blocked: it just prints again next time */
      }
    }

    const { feed, reducedMs, bleedPx } = readFeedTokens();
    const height = el.getBoundingClientRect().height;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anim = reduced
      ? // Entering → strong ease-out, same curve as the landing.
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMs, easing: feed.landingEase, fill: 'backwards' })
      : el.animate(feedKeyframes(feed, height + bleedPx), {
          duration: feedDuration(height, feed),
          fill: 'backwards',
        });
    print.current = anim;
    el.setAttribute('aria-busy', 'true');

    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && (MODIFIERS.has(e.key) || isEditable(e.target))) return;
      anim.finish(); // no preventDefault: the click or key still does its normal job
    };
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', skip, true);
    const done = () => {
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', skip, true);
      el.removeAttribute('aria-busy');
    };
    anim.finished.then(done, done);
    return () => {
      done();
      anim.finish();
    };
  }, [receipt, paper]);
}
