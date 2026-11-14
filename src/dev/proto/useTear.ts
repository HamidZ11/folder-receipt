import { useEffect, useRef, type RefObject } from 'react';
import { readFeedTokens } from '../../lib/print/feed.ts';
import { rubberband, springCurve } from './spring.ts';

const HYSTERESIS = 6; // px before a press becomes a drag
const TEAR_DISTANCE = 120; // px away from the slot
const TEAR_VELOCITY = 0.6; // px/ms flick, with at least FLICK_MIN of travel
const FLICK_MIN = 24;

type Options = {
  /** +1: the slot is above the paper, so tearing pulls down. −1: slot below, pulls up. */
  away: 1 | -1;
  onTear: () => void;
  /** Fires the instant the paper rips (before the tear motion). */
  onTearStart?: () => void;
  /** Attach only while there is paper to tear. */
  enabled: boolean;
};

/**
 * Tear-to-export. Track phase: the paper follows the pointer 1:1 (direct
 * transform writes, no state, no easing), rubber-banded towards the slot.
 * Release: tear on distance OR velocity; otherwise a spring seeded with the
 * release velocity brings it home. Touch only starts on [data-tear-grip], so
 * the rest of a long receipt still scrolls the page.
 */
export function useTear(paper: RefObject<HTMLElement | null>, { away, onTear, onTearStart, enabled }: Options) {
  const tear = useRef<Animation | null>(null);
  const onTearRef = useRef(onTear);
  const onTearStartRef = useRef(onTearStart);
  useEffect(() => {
    onTearRef.current = onTear;
    onTearStartRef.current = onTearStart;
  });

  useEffect(() => {
    const el = paper.current;
    if (!el || !enabled) return;
    let id: number | null = null;
    let startY = 0;
    let startX = 0;
    let dragging = false;
    let offset = 0;
    let history: { t: number; y: number }[] = [];
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || id !== null) return;
      if (el.getAnimations().some((a) => a.playState === 'running')) return; // printing or settling
      if (e.pointerType !== 'mouse' && !(e.target as Element).closest('[data-tear-grip]')) return;
      id = e.pointerId;
      startY = e.clientY;
      startX = e.clientX;
      dragging = false;
      offset = 0;
      history = [{ t: e.timeStamp, y: e.clientY }];
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const raw = (e.clientY - startY) * away; // >0 = away from the slot
      if (!dragging) {
        if (Math.abs(e.clientY - startY) < HYSTERESIS || Math.abs(e.clientX - startX) > Math.abs(e.clientY - startY)) return;
        dragging = true;
        el.setPointerCapture(e.pointerId);
        el.dataset.tearing = '';
      }
      offset = raw >= 0 ? raw : rubberband(raw, 80); // into the slot: resist
      el.style.transform = `translateY(${offset * away}px)`;
      history.push({ t: e.timeStamp, y: e.clientY });
      if (history.length > 8) history.shift();
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      delete el.dataset.tearing;
      if (!dragging) return;
      dragging = false;
      const first = history.find((h) => e.timeStamp - h.t < 100) ?? history[0]!;
      const dt = Math.max(1, e.timeStamp - first.t);
      const velocity = ((e.clientY - first.y) * away) / dt; // px/ms, >0 = away
      const from = `translateY(${offset * away}px)`;
      el.style.transform = '';

      if (offset > TEAR_DISTANCE || (velocity > TEAR_VELOCITY && offset > FLICK_MIN)) {
        // Tear: keep going at the release speed, a slight twist, gone.
        onTearStartRef.current?.();
        const { feed } = readFeedTokens();
        const travel = Math.min(320, Math.max(120, velocity * 220));
        const twist = (e.clientX - startX) * 0.02;
        tear.current = reduced()
          ? el.animate([{ transform: from, opacity: 1 }, { transform: from, opacity: 0 }], { duration: 150, easing: feed.landingEase, fill: 'forwards' })
          : el.animate(
              [
                { transform: `${from} rotate(0deg)`, opacity: 1 },
                { transform: `translateY(${(offset + travel) * away}px) rotate(${Math.max(-4, Math.min(4, twist))}deg)`, opacity: 0 },
              ],
              { duration: 260, easing: feed.landingEase, fill: 'forwards' },
            );
        tear.current.finished.then(() => onTearRef.current(), () => {});
      } else if (reduced()) {
        // No spring under reduced motion: a short, plain settle home (no bounce, no jump).
        const { feed } = readFeedTokens();
        el.animate([{ transform: from }, { transform: 'translateY(0)' }], { duration: 150, easing: feed.landingEase });
      } else {
        // Snap back: spring seeded with the release velocity (towards the slot is negative progress).
        const progressVelocity = offset === 0 ? 0 : (-velocity * 1000) / -offset;
        const s = springCurve({ response: 0.3, damping: 0.8, velocity: progressVelocity });
        el.animate([{ transform: from }, { transform: 'translateY(0)' }], { duration: s.durationMs, easing: s.easing });
      }
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [paper, away, enabled]);

  /** Clear the torn state (call right after the next print has started). */
  return { reset: () => (tear.current?.cancel(), (tear.current = null)) };
}
