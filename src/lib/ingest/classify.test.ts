import { describe, expect, it } from 'vitest';
import { classifyDirName, classifyPath, extOf } from './classify.ts';

describe('classifyDirName', () => {
  it.each([
    ['node_modules', 'nodeModules'],
    ['.git', 'git'],
    ['.cache', 'dotfiles'],
    ['Figma.app', 'bundle'],
    ['Photos Library.photoslibrary', 'bundle'],
    ['THING.APP', 'bundle'],
    ['src', null],
    ['app', null],
  ] as const)('%s → %s', (n, k) => expect(classifyDirName(n)).toBe(k));
});

describe('classifyPath', () => {
  it('plain file', () => expect(classifyPath(['a', 'b.pdf'])).toEqual({ type: 'file' }));
  it('.DS_Store anywhere', () =>
    expect(classifyPath(['a', '.DS_Store'])).toEqual({ type: 'skip', kind: 'dsStore', key: 'a/.DS_Store' }));
  it('dotfile', () => expect(classifyPath(['.env'])).toEqual({ type: 'skip', kind: 'dotfiles', key: '.env' }));
  it('inside node_modules → keyed by the node_modules folder', () =>
    expect(classifyPath(['web', 'node_modules', 'react', 'index.js'])).toEqual({
      type: 'skip',
      kind: 'nodeModules',
      key: 'web/node_modules',
    }));
  it('inside .git', () =>
    expect(classifyPath(['.git', 'HEAD'])).toEqual({ type: 'skip', kind: 'git', key: '.git' }));
  it('inside a bundle → the bundle, even past hidden folders inside it', () =>
    expect(classifyPath(['Apps', 'Figma.app', 'Contents', '.hidden', 'x'])).toEqual({
      type: 'bundle',
      bundlePath: 'Apps/Figma.app',
    }));
  it('outermost rule wins: a bundle inside node_modules is node_modules', () =>
    expect(classifyPath(['node_modules', 'x.app', 'y'])).toMatchObject({ kind: 'nodeModules' }));
});

describe('extOf', () => {
  it('lower-cases, ignores leading dot, handles none', () => {
    expect(extOf('A.MOV')).toBe('mov');
    expect(extOf('.env')).toBe('');
    expect(extOf('Makefile')).toBe('');
    expect(extOf('a.tar.gz')).toBe('gz');
  });
});
