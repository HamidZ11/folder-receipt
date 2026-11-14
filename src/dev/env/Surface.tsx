import { useEffect, useState } from 'react';

/**
 * 3 · Counter surface. A dark surface with a soft light pool under the device
 * and a contact shadow where the hanging paper meets the surface. The shadow
 * follows the paper's measured bottom edge (ResizeObserver, no animation).
 */
export function Surface() {
  const [paperBottom, setPaperBottom] = useState<{ y: number; x: number; w: number } | null>(null);

  // The surface is the page background while this option is on (the export frame keeps its own).
  useEffect(() => {
    const els = [document.documentElement, document.body];
    for (const el of els) el.style.backgroundColor = 'var(--env-surface)';
    return () => {
      for (const el of els) el.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const slot = document.querySelector<HTMLElement>('[data-testid="slot"]');
    if (!slot) return;
    const measure = () => {
      const r = slot.getBoundingClientRect();
      setPaperBottom({ y: r.bottom + scrollY - 24, x: r.left + r.width / 2 + scrollX, w: r.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(slot);
    addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div data-env="surface" aria-hidden="true">
      {/* The pool and the shadow scroll with the page. */}
      <div className="absolute top-0 left-1/2 h-(--env-pool-height) w-(--env-pool-width) -translate-x-1/2 bg-[radial-gradient(closest-side,var(--env-pool),transparent)]" />
      {paperBottom && (
        <div
          className="absolute h-10 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,var(--env-contact-shadow),transparent)]"
          style={{ top: paperBottom.y, left: paperBottom.x, width: paperBottom.w * 0.95 }}
        />
      )}
    </div>
  );
}
