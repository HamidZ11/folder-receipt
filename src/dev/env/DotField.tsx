import { useEffect, useRef } from 'react';

// 4×4 Bayer matrix: ordered dithering gives the dot-matrix texture.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 1 · Dot-matrix field. A faint dithered field (light falls off from the top
 * centre). While scanning, a lit band steps down the page once per counter
 * update; when the paper lands the band is gone and the field is static.
 * Redraws only on counter steps (≈ 3–5 ms each), never on a timer.
 */
export function DotField({ seen, active }: { seen: number; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const cs = getComputedStyle(document.documentElement);
    const cell = parseFloat(cs.getPropertyValue('--env-dot-cell')) || 6;
    const dot = cs.getPropertyValue('--env-dot').trim();
    const lit = cs.getPropertyValue('--env-dot-lit').trim();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = innerWidth;
    const h = innerHeight;
    el.width = Math.round(w * dpr);
    el.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const band = active && !reduced();
    const bandY = band ? ((seen * 7) % (h + 200)) - 100 : -1e9; // steps with the counter
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    for (let r = 0; r < rows; r++) {
      const y = r * cell;
      const inBand = Math.abs(y - bandY) < 60;
      for (let c = 0; c < cols; c++) {
        const x = c * cell;
        const dx = (x - w / 2) / (w * 0.6);
        const dy = y / (h * 1.1);
        const intensity = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)) * 0.9 + (inBand ? 0.5 : 0);
        if (intensity > BAYER[(r % 4) * 4 + (c % 4)]!) {
          ctx.fillStyle = inBand ? lit : dot;
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }
    }
  }, [seen, active]);

  return <canvas ref={canvas} data-env="dots" aria-hidden="true" className="pointer-events-none fixed inset-0 size-full" />;
}
