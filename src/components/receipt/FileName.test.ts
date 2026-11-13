import { describe, expect, it } from 'vitest';
import { splitFileName } from './FileName.tsx';

describe('splitFileName', () => {
  it('keeps the extension whole and separate', () => {
    expect(splitFileName('Benachrichtigungseinstellungen_v12.mov')).toEqual({
      head: 'Benachrichtigungseinstellung',
      stemTail: 'en_v12',
      ext: '.mov',
    });
  });
  it('short names are not split', () => {
    expect(splitFileName('CV.pdf')).toEqual({ head: 'CV', stemTail: '', ext: '.pdf' });
  });
  it('no extension, dotfile-style names and over-long "extensions" have no ext part', () => {
    expect(splitFileName('Makefile').ext).toBe('');
    expect(splitFileName('.env').ext).toBe('');
    expect(splitFileName('notes.this-is-not-an-extension-really').ext).toBe('');
  });
  it('rejoins to the original name, never splits a grapheme', () => {
    for (const n of [
      '🎉 Wesele Oli i Kuby 👨‍👩‍👧‍👦 – wszystkie ujęcia z drona 👨‍👩‍👧‍👦.mov',
      '請求書_2026年11月_株式会社ノースウィンド.mov',
      'تسجيل-اجتماع-المبيعات-الربع-الثالث.mov',
      'ubuntu-24.04.1-live-server-arm64+largemem.qcow2',
    ]) {
      const s = splitFileName(n);
      expect(s.head + s.stemTail + s.ext).toBe(n);
      expect(s.stemTail).not.toMatch(/^‍/); // no orphaned zero-width joiner
    }
  });
});
