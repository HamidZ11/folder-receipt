import { describe, expect, it } from 'vitest';
import { redactFileName } from './redact.ts';

describe('redactFileName', () => {
  it('keeps only the extension', () => {
    expect(redactFileName('Bank statement Mar 2025.pdf')).toBe('▇▇▇▇.pdf');
    expect(redactFileName('🎉 Wesele 👨‍👩‍👧‍👦.mov')).toBe('▇▇▇▇.mov');
  });
  it('no extension → just the block', () => {
    expect(redactFileName('Makefile')).toBe('▇▇▇▇');
    expect(redactFileName('.env')).toBe('▇▇▇▇');
  });
});
