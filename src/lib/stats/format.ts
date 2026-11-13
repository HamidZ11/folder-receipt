const LOCALE = 'en-GB';
const UNITS = ['KB', 'MB', 'GB', 'TB'] as const;

const count = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const oneDp = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Decimal units (1 KB = 1000 B), matching macOS Finder. */
export function formatBytes(n: number): string {
  if (n < 1000) return `${count.format(n)} B`;
  let unit = 0;
  let v = n / 1000;
  // Roll over when rounding to 1 dp would print 1,000.0 of a unit.
  while (unit < UNITS.length - 1 && Math.round(v * 10) / 10 >= 1000) {
    v /= 1000;
    unit++;
  }
  return `${oneDp.format(v)} ${UNITS[unit]}`;
}

export function formatCount(n: number): string {
  return count.format(n);
}

export function formatPercent(n: number): string {
  return `${n}%`;
}

/** e.g. "13 Nov 2026, 15:43". timeZone is for tests; defaults to the user's zone. */
export function formatDateTime(ms: number, timeZone?: string): string {
  const d = new Date(ms);
  const date = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(d);
  const time = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d);
  return `${date}, ${time}`;
}
