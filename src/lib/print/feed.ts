// The paper feed: constant speed, then a short ease-out landing.
//
// Two keyframe segments: linear for the first (1 − landing) of the time, then
// the landing curve. For the join to be invisible, the speed at the end of the
// linear part must equal the landing curve's starting speed. A cubic-bezier
// (x1, y1, x2, y2) starts with slope y1/x1, so over the landing segment
// (time share tl, distance share dl) its starting speed is (y1/x1) · dl/tl.
// Setting that equal to the linear speed (1 − dl)/(1 − tl) gives
//   dl = 1 / (1 + (y1/x1) · (1 − tl)/tl)

export type FeedTokens = {
  speed: number; // px/s
  minMs: number;
  maxMs: number;
  landing: number; // time share, 0–1
  landingEase: string; // cubic-bezier(...)
};

export function parseBezier(ease: string): [number, number, number, number] {
  const m = ease.match(/cubic-bezier\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!m) throw new Error(`Not a cubic-bezier: ${ease}`);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
}

export function feedDuration(heightPx: number, t: FeedTokens): number {
  return Math.min(t.maxMs, Math.max(t.minMs, (heightPx / t.speed) * 1000));
}

/** Share of the distance covered during the landing, so speed is continuous at the join. */
export function landingDistance(t: FeedTokens): number {
  const [x1, y1] = parseBezier(t.landingEase);
  const slope = y1 / x1;
  return 1 / (1 + (slope * (1 - t.landing)) / t.landing);
}

/**
 * WAAPI keyframes: the paper rises out of a slot below it (header first, like a
 * till printer). It starts `distancePx` below its resting place (its height plus
 * the slot bleed, so nothing shows before the feed), feeds up at a constant
 * speed, then lands with the matched ease-out.
 */
export function feedKeyframes(t: FeedTokens, distancePx: number): Keyframe[] {
  const dl = landingDistance(t);
  return [
    { transform: `translateY(${distancePx.toFixed(2)}px)`, offset: 0, easing: 'linear' },
    { transform: `translateY(${(dl * distancePx).toFixed(2)}px)`, offset: 1 - t.landing, easing: t.landingEase },
    { transform: 'translateY(0)', offset: 1 },
  ];
}

/** CSS time to ms. The build's CSS minifier rewrites "2200ms" as "2.2s", so accept both. */
export function parseTime(value: string): number {
  const v = value.trim();
  const n = parseFloat(v);
  if (Number.isNaN(n)) throw new Error(`Not a CSS time: "${value}"`);
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}

/** Read the print tokens from tokens.css (computed on :root). */
export function readFeedTokens(root: Element = document.documentElement) {
  const cs = getComputedStyle(root);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    feed: {
      speed: parseFloat(v('--print-feed-speed')),
      minMs: parseTime(v('--print-feed-min')),
      maxMs: parseTime(v('--print-feed-max')),
      landing: parseFloat(v('--print-feed-landing')),
      landingEase: v('--print-ease-landing'),
    } satisfies FeedTokens,
    exitMs: parseTime(v('--print-exit-duration')),
    bleedPx: parseFloat(v('--print-slot-bleed')),
    reducedMs: parseTime(v('--print-reduced-fade')),
  };
}
