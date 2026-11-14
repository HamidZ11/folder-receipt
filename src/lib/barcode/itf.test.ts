import { describe, expect, it } from 'vitest';
import { encodeITF } from './itf.ts';

describe('encodeITF', () => {
  it('alternates bar/space, starting and ending with a bar', () => {
    const m = encodeITF('12345678');
    m.forEach((x, i) => expect(x.bar).toBe(i % 2 === 0));
    expect(m.at(-1)!.bar).toBe(true);
  });
  it('length: start 4 + 10 per digit pair + stop 3', () => {
    expect(encodeITF('12345678')).toHaveLength(4 + 4 * 10 + 3);
  });
  it('each digit pair has exactly 2 wide bars and 2 wide spaces', () => {
    const pair = encodeITF('07').slice(4, 14);
    expect(pair.filter((x) => x.bar && x.width === 3)).toHaveLength(2);
    expect(pair.filter((x) => !x.bar && x.width === 3)).toHaveLength(2);
  });
  it('pads odd lengths with a leading zero', () => expect(encodeITF('123')).toEqual(encodeITF('0123')));
});
