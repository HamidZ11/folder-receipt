import { useEffect, useRef, useState } from 'react';
import { useFolderScan, type Receipt } from '../../hooks/useFolderScan.ts';
import { makeSampleScan } from '../../lib/sample/sampleFolder.ts';
import { computeStats } from '../../lib/stats/computeStats.ts';
import { FIXTURES, makeFixture, type FixtureName } from '../fixtures.ts';

export type Phase = 'idle' | 'scanning' | 'printing' | 'done';
export const PHASES: readonly Phase[] = ['idle', 'scanning', 'printing', 'done'];

/** The sample, or a break-ui fixture via ?data= (worst, empty, one, 100k, one-category). */
const sample = (print: boolean): Receipt => {
  const name = new URLSearchParams(location.search).get('data');
  const fixture = name && (FIXTURES as readonly string[]).includes(name) ? (name as FixtureName) : null;
  const scan = fixture ? makeFixture(fixture, Date.now()) : makeSampleScan(Date.now());
  return { scan, stats: computeStats(scan), source: fixture && fixture !== 'demo' ? 'folder' : 'sample', print };
};

const IDLE_MS = 700;
const SCAN_MS = 1300;

/**
 * Drives a prototype page. With no fixed state it plays the whole story on
 * mount: idle → a simulated scan of the sample (counter climbs) → print.
 * A fixed `state` (?state=) freezes one moment for screenshots. A real drop or
 * pick still works through the live scan hook.
 */
export function useProtoFlow(fixed: Phase | null) {
  const live = useFolderScan();
  const [receipt, setReceipt] = useState<Receipt | null>(() =>
    fixed === 'printing' ? sample(true) : fixed === 'done' ? sample(false) : null,
  );
  const [simSeen, setSimSeen] = useState<number | null>(fixed === 'scanning' ? 640 : null);
  const total = useRef(sample(false).stats.totalFiles);

  // The scripted story.
  useEffect(() => {
    if (fixed) return;
    let raf = 0;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / SCAN_MS);
        setSimSeen(Math.round(total.current * (1 - (1 - k) ** 2)));
        if (k < 1) raf = requestAnimationFrame(tick);
        else {
          setSimSeen(null);
          setReceipt(sample(true));
        }
      };
      raf = requestAnimationFrame(tick);
    }, IDLE_MS);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [fixed]);

  // A real scan's result replaces the receipt (adjusting state during render, not in an effect).
  const [prevLive, setPrevLive] = useState(live.receipt);
  if (live.receipt !== prevLive) {
    setPrevLive(live.receipt);
    if (live.receipt.source === 'folder') setReceipt(live.receipt);
  }

  const liveScanning = live.status.phase === 'scanning';
  const seen = liveScanning && live.status.phase === 'scanning' ? live.status.seen : simSeen;
  const scanning = seen !== null;
  return {
    receipt,
    setReceipt,
    scanning,
    seen: seen ?? receipt?.stats.totalFiles ?? 0,
    rootName: liveScanning && live.status.phase === 'scanning' ? live.status.rootName : 'Downloads',
    error: live.status.phase === 'error' ? live.status.error : null,
    onDrop: live.onDrop,
    onPick: live.onPick,
  };
}

export type ProtoFlow = ReturnType<typeof useProtoFlow>;
