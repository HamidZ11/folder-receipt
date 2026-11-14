import { useLayoutEffect, useState, type RefObject } from 'react';
import type { Receipt } from './useFolderScan.ts';

/** True once the current receipt's print has landed (or it was never printed). */
export function useLanded(paper: RefObject<HTMLElement | null>, receipt: Receipt) {
  const [landedFor, setLandedFor] = useState<Receipt | null>(null);
  useLayoutEffect(() => {
    if (!receipt.print) return;
    const anim = paper.current?.getAnimations()[0];
    if (anim) anim.finished.then(() => setLandedFor(receipt), () => setLandedFor(receipt));
    else queueMicrotask(() => setLandedFor(receipt));
  }, [paper, receipt]);
  return !receipt.print || landedFor === receipt;
}
