import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import '../../styles/themes/thermal.css';
import './fonts.ts';
import './picker.css';
import { protoCopy } from './protoCopy.ts';
import { ThermalPage } from './ThermalPage.tsx';
import { PHASES, type Phase } from './useProtoFlow.ts';

const LETTERS = ['A', 'B', 'C'] as const;
const PAGES: ComponentType<{ fixed: Phase | null }>[] = [ThermalPage];

const params = () => new URLSearchParams(location.search);
const initialIndex = () =>
  Math.min(PAGES.length - 1, Math.max(0, LETTERS.indexOf((params().get('proto') ?? 'A').toUpperCase() as (typeof LETTERS)[number])));
const initialPhase = (): Phase | null => {
  const s = params().get('state');
  return s && (PHASES as readonly string[]).includes(s) ? (s as Phase) : null;
};

/**
 * Dev-only design prototypes. ?proto=A|B|C picks the direction, ?font=1|2 the
 * pairing (key F), ?state=idle|scanning|printing|done freezes a moment.
 * Keys: 1–3 and ←/→ switch, R replays the scan and print.
 */
export default function Harness() {
  const [index, setIndex] = useState(initialIndex);
  const [font, setFont] = useState(params().get('font') === '2' ? 2 : 1);
  const [fixed, setFixed] = useState(initialPhase);
  const [run, setRun] = useState(0);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.proto = LETTERS[index];
    root.dataset.font = String(font);
    const url = new URL(location.href);
    url.searchParams.set('proto', LETTERS[index]!);
    url.searchParams.set('font', String(font));
    if (fixed) url.searchParams.set('state', fixed);
    else url.searchParams.delete('state');
    history.replaceState(null, '', url);
  }, [index, font, fixed]);

  const replay = () => {
    setFixed(null);
    setRun((r) => r + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= PAGES.length) setIndex(n - 1);
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % PAGES.length);
      else if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + PAGES.length) % PAGES.length);
      else if (e.key === 'r' || e.key === 'R') replay();
      else if (e.key === 'f' || e.key === 'F') setFont((f) => (f === 1 ? 2 : 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const Page = PAGES[index]!;
  return (
    <>
      <Page key={`${index}-${run}`} fixed={fixed} />
      <Picker index={index} onSelect={setIndex} onReplay={replay} />
    </>
  );
}

/** Verbatim picker (PICKER.md): sliding highlight, instant variant swap, replay. */
function Picker({ index, onSelect, onReplay }: { index: number; onSelect: (i: number) => void; onReplay: () => void }) {
  const nav = useRef<HTMLElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const highlight = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const move = () => {
      const el = items.current[index];
      if (!el || !highlight.current) return;
      highlight.current.style.width = `${el.offsetWidth}px`;
      highlight.current.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [index]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => nav.current?.setAttribute('data-ready', '')));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <nav ref={nav} className="proto-picker" aria-label="Prototype variants">
      <span ref={highlight} className="proto-picker-highlight" aria-hidden="true" />
      {protoCopy.picker.slice(0, PAGES.length).map((name, i) => (
        <button
          key={name}
          ref={(el) => {
            items.current[i] = el;
          }}
          className="proto-picker-item"
          data-active={i === index ? '' : undefined}
          aria-current={i === index ? 'true' : undefined}
          onClick={() => onSelect(i)}
        >
          {name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={onReplay}>
        ↻
      </button>
    </nav>
  );
}
