import { describe, expect, it } from 'vitest';
import { rubberband, springCurve } from './spring.ts';

describe('springCurve', () => {
  it('starts at 0, ends at 1, critically damped never overshoots', () => {
    const s = springCurve({ response: 0.35, damping: 1 });
    expect(s.points[0]).toBe(0);
    expect(s.points.at(-1)).toBe(1);
    expect(Math.max(...s.points)).toBeLessThanOrEqual(1.0005);
    expect(s.easing.startsWith('linear(')).toBe(true);
  });
  it('damping 0.8 overshoots slightly', () => {
    const s = springCurve({ response: 0.3, damping: 0.8 });
    expect(Math.max(...s.points)).toBeGreaterThan(1.001);
    expect(Math.max(...s.points)).toBeLessThan(1.1);
  });
  it('carries initial velocity: a positive kick moves further early', () => {
    const still = springCurve({ damping: 1 }).points[4]!;
    const kicked = springCurve({ damping: 1, velocity: 8 }).points[4]!;
    expect(kicked).toBeGreaterThan(still);
  });
});

describe('rubberband', () => {
  it('resists more the further you pull', () => {
    expect(rubberband(10, 100)).toBeLessThan(10);
    expect(rubberband(200, 100) / 200).toBeLessThan(rubberband(20, 100) / 20);
    expect(rubberband(-10, 100)).toBeLessThan(0);
  });
});
