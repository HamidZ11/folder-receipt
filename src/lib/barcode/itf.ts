// Interleaved 2 of 5: a real, scannable numeric barcode (even digit count).
// Pairs of digits: the first digit's pattern sets the bars, the second the spaces.

const PATTERNS = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn'];

export type Module = { bar: boolean; width: 1 | 3 };

/** Bar/space sequence (narrow = 1, wide = 3), starting with a bar. */
export function encodeITF(digits: string): Module[] {
  if (!/^\d+$/.test(digits)) throw new Error('ITF encodes digits only');
  const d = digits.length % 2 ? `0${digits}` : digits;
  const out: Module[] = [];
  const push = (bar: boolean, w: string) => out.push({ bar, width: w === 'w' ? 3 : 1 });
  for (const w of 'nnnn') push(out.length % 2 === 0, w); // start
  for (let i = 0; i < d.length; i += 2) {
    const bars = PATTERNS[Number(d[i])]!;
    const spaces = PATTERNS[Number(d[i + 1])]!;
    for (let k = 0; k < 5; k++) {
      push(true, bars[k]!);
      push(false, spaces[k]!);
    }
  }
  push(true, 'w'); // stop: wide bar, narrow space, narrow bar
  push(false, 'n');
  push(true, 'n');
  return out;
}
