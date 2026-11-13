import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CSP_HEADER, CSP_META } from './csp.ts';

describe('CSP', () => {
  it('only allows connections to this origin', () => {
    expect(CSP_META).toContain("connect-src 'self'");
    expect(CSP_META).not.toMatch(/connect-src[^;]*(\*|https?:|wss?:)/);
  });

  it('keeps frame-ancestors out of the meta tag (ignored there) and in the header', () => {
    expect(CSP_META).not.toContain('frame-ancestors');
    expect(CSP_HEADER).toContain("frame-ancestors 'none'");
  });

  it('vercel.json header matches csp.ts exactly', () => {
    const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const header = vercel.headers
      .flatMap((h) => h.headers)
      .find((h) => h.key === 'Content-Security-Policy');
    expect(header?.value).toBe(CSP_HEADER);
  });
});
