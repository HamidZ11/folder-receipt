// Middle truncation for the folder name (file names use FileName.tsx, which
// never cuts the extension). The head shrinks with an ellipsis, the tail stays.
// Pure CSS, so it adapts to any width. Split by grapheme so emoji never break.

const TAIL_BEFORE_EXT = 6;

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function graphemes(s: string): string[] {
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}

export function splitForMiddleTruncate(name: string): [head: string, tail: string] {
  const g = graphemes(name);
  const dot = name.lastIndexOf('.');
  const extLen = dot > 0 && name.length - dot <= 12 ? graphemes(name.slice(dot)).length : 0;
  const tailLen = extLen + TAIL_BEFORE_EXT;
  if (g.length <= tailLen + 4) return [name, ''];
  return [g.slice(0, g.length - tailLen).join(''), g.slice(g.length - tailLen).join('')];
}

/**
 * inline-flex so it sits at the start (or end) of its line like text, and
 * dir="auto" so right-to-left names (Arabic, Hebrew) put head and tail on the right sides.
 */
export function MiddleTruncate({ text, className = '' }: { text: string; className?: string }) {
  const [head, tail] = splitForMiddleTruncate(text);
  return (
    <span dir="auto" title={text} className={`inline-flex max-w-full min-w-0 align-bottom ${className}`}>
      {/* The head takes almost all the squeeze (weight 1000). Once it's gone, the tail shrinks too,
          so it never runs into the next column. (A tail weight below 1 doesn't work: flexbox then
          hands out only that fraction of the overflow.) */}
      <span className="min-w-0 shrink-[1000] overflow-hidden text-ellipsis whitespace-pre">{head}</span>
      {tail && <span className="min-w-0 overflow-hidden text-ellipsis whitespace-pre">{tail}</span>}
    </span>
  );
}
