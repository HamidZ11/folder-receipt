import { describe, expect, it } from 'vitest';
import { categoryOf, isInstaller } from './categories.ts';
import { rec } from './test-helpers.ts';

describe('categoryOf', () => {
  it.each([
    ['clip.MOV', 'Videos'],
    ['a.mp4', 'Videos'],
    ['IMG_0001.HEIC', 'Images'],
    ['song.m4a', 'Audio'],
    ['cv.pdf', 'Documents'],
    ['src.zip', 'Archives'],
    ['Setup.dmg', 'Installers'],
    ['Setup.EXE', 'Installers'],
    ['noext', 'Other'],
    ['weird.xyz', 'Other'],
  ] as const)('%s → %s', (path, cat) => {
    expect(categoryOf(rec(path, 1))).toBe(cat);
  });

  it('bundles: .app is Apps, .photoslibrary is Images', () => {
    expect(categoryOf(rec('Figma.app', 1, undefined, 'bundle'))).toBe('Apps');
    expect(categoryOf(rec('Photos Library.photoslibrary', 1, undefined, 'bundle'))).toBe('Images');
  });
});

describe('isInstaller', () => {
  it('matches .dmg .pkg .exe .msi case-insensitively, nothing else', () => {
    for (const n of ['a.dmg', 'b.PKG', 'c.Exe', 'd.msi']) expect(isInstaller(rec(n, 1))).toBe(true);
    for (const n of ['a.zip', 'dmg', 'a.dmg.txt', 'x.app']) expect(isInstaller(rec(n, 1))).toBe(false);
  });
});
