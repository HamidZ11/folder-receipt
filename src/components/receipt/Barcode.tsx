import { encodeITF } from '../../lib/barcode/itf.ts';

/** Interleaved 2 of 5 barcode of the receipt number, drawn as SVG bars in the ink colour. */
export function Barcode({ value }: { value: string }) {
  const modules = encodeITF(value);
  const xs = modules.reduce<number[]>((acc, _m, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + modules[i - 1]!.width], []);
  const width = xs.at(-1)! + modules.at(-1)!.width;
  return (
    <svg
      data-row
      viewBox={`0 0 ${width} 40`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Barcode ${value}`}
      className="mx-auto mt-4 block h-11 w-full max-w-60 text-ink"
    >
      {modules.map((m, i) => (m.bar ? <rect key={i} x={xs[i]} y={0} width={m.width} height={40} fill="currentColor" /> : null))}
    </svg>
  );
}
