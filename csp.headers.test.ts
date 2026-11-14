import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const headers = Object.fromEntries(vercel.headers.flatMap((h) => h.headers).map((h) => [h.key, h.value]));

describe('vercel.json security headers (ship-check)', () => {
  it('applies to every path', () => expect(vercel.headers[0]!.source).toBe('/(.*)'));
  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'no-referrer'],
    ['X-Frame-Options', 'DENY'],
    ['Cross-Origin-Opener-Policy', 'same-origin'],
  ])('%s: %s', (k, v) => expect(headers[k]).toBe(v));
  it('HSTS for two years', () => expect(headers['Strict-Transport-Security']).toMatch(/max-age=63072000/));
  it('no camera, microphone or location', () =>
    expect(headers['Permissions-Policy']).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/));
  it('CSP never allows unsafe-inline or unsafe-eval', () => expect(headers['Content-Security-Policy']).not.toMatch(/unsafe-/));
});
