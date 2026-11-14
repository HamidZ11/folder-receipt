import { useState } from 'react';
import type { Receipt } from '../../hooks/useFolderScan.ts';
import { formatBytes } from '../../lib/stats/format.ts';

type Pinned = { key: number; no: string; savings: string; tilt: number; shift: number };

/** Deterministic "random" in [-1, 1] from the receipt number, so a reload of the same receipt looks the same. */
const jitter = (no: string, salt: number) => {
  let h = 2166136261 ^ salt;
  for (const ch of no) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
};

/**
 * 2 · Receipt spike. Every receipt printed this session lands on a spike beside
 * the device, at a slight angle, newest on top. In memory only.
 * Beside the device needs room: below the lg breakpoint (1024px) there is none, so the spike is hidden.
 */
export function Spike({ receipt, landed }: { receipt: Receipt; landed: boolean }) {
  const [pinned, setPinned] = useState<Pinned[]>([]);
  const [last, setLast] = useState<Receipt | null>(null);
  // Adjust state during render (not in an effect) when a print lands.
  if (landed && receipt.print && receipt !== last) {
    setLast(receipt);
    const no = receipt.stats.receiptNo;
    setPinned((p) => [
      ...p,
      { key: p.length, no, savings: formatBytes(receipt.stats.totalSavings), tilt: jitter(no, p.length), shift: jitter(no, p.length + 99) },
    ]);
  }

  return (
    <div
      data-env="spike"
      aria-hidden="true"
      className="pointer-events-none absolute top-28 right-[calc(50%+var(--container-wide)/2+var(--env-spike-gap))] hidden lg:block"
    >
      <div className="relative h-72 w-40">
        {/* Base and rod */}
        <div className="absolute bottom-0 left-1/2 h-3 w-28 -translate-x-1/2 rounded-full bg-(--env-spike-base)" />
        <div className="absolute bottom-2 left-1/2 h-64 w-0.5 -translate-x-1/2 rounded-full bg-(--env-spike)" />
        {/* Receipts, oldest at the bottom of the stack */}
        {pinned.map((p, i) => (
          <div
            key={p.key}
            className="spike-paper absolute left-1/2 w-36 origin-top bg-paper px-3 pt-3 pb-4 font-mono text-ink"
            style={{
              top: `${104 - Math.min(i, 6) * 16}px`,
              transform: `translateX(calc(-50% + ${p.shift * 6}px)) rotate(calc(${p.tilt} * var(--env-spike-tilt) * 1deg))`,
            }}
          >
            <div className="text-label tracking-(--label-tracking) uppercase">No. {p.no}</div>
            <div className="mt-2 space-y-1.5">
              {[0.9, 0.7, 0.8, 0.55, 0.75].map((wd, k) => (
                <div key={k} className="h-1 bg-ink-muted" style={{ width: `${wd * 100}%` }} />
              ))}
            </div>
            <div className="mt-2 border-t-(length:--rule-width) border-dotted border-hairline pt-1.5 text-right text-small font-bold">{p.savings}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
