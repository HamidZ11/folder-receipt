import { describe, expect, it } from 'vitest';
import { hidesDotfiles } from './browser.ts';

describe('hidesDotfiles', () => {
  it('true for Safari (macOS and iOS)', () => {
    expect(hidesDotfiles('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15')).toBe(true);
    expect(hidesDotfiles('Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1')).toBe(true);
  });
  it('false for Chrome, Edge, Firefox (which also say "Safari")', () => {
    expect(hidesDotfiles('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36')).toBe(false);
    expect(hidesDotfiles('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0')).toBe(false);
    expect(hidesDotfiles('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0')).toBe(false);
  });
});
