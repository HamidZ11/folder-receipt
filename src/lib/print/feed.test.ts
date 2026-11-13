import { describe, expect, it } from 'vitest';
import { parseTime, feedDuration, feedKeyframes, landingDistance, parseBezier, type FeedTokens } from './feed.ts';

const T: FeedTokens = { speed: 520, minMs: 1400, maxMs: 2200, landing: 0.15, landingEase: 'cubic-bezier(0.23, 1, 0.32, 1)' };

describe('parseTime', () => {
  it('reads ms and s (the minifier turns 2200ms into 2.2s)', () => {
    expect(parseTime('1400ms')).toBe(1400);
    expect(parseTime(' 2.2s')).toBe(2200);
    expect(parseTime('.15s')).toBe(150);
    expect(() => parseTime('')).toThrow();
  });
});

describe('feed', () => {
  it('duration scales with height and clamps to 1.4–2.2s', () => {
    expect(feedDuration(936, T)).toBeCloseTo(1800, 0);
    expect(feedDuration(200, T)).toBe(1400);
    expect(feedDuration(5000, T)).toBe(2200);
  });

  it('speed is continuous at the join between linear feed and ease-out landing', () => {
    const dl = landingDistance(T);
    const [x1, y1] = parseBezier(T.landingEase);
    const linearSpeed = (1 - dl) / (1 - T.landing);
    const landingStartSpeed = (y1 / x1) * (dl / T.landing);
    expect(landingStartSpeed).toBeCloseTo(linearSpeed, 9);
    expect(dl).toBeGreaterThan(0.03);
    expect(dl).toBeLessThan(0.05); // short landing: ~4% of the distance
  });

  it('keyframes run -100% → 0 with linear then the landing curve', () => {
    const k = feedKeyframes(T);
    expect(k[0]).toMatchObject({ transform: 'translateY(-100%)', offset: 0, easing: 'linear' });
    expect(k[1]).toMatchObject({ offset: 0.85, easing: T.landingEase });
    expect(k[2]).toMatchObject({ transform: 'translateY(0)', offset: 1 });
  });
});
