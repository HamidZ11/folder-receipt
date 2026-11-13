/** 8-digit receipt number: FNV-1a hash of the scan's identity. Not secret, just stable. */
export function receiptNumber(parts: readonly (string | number)[]): string {
  let h = 0x811c9dc5;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return String((h >>> 0) % 100_000_000).padStart(8, '0');
}
