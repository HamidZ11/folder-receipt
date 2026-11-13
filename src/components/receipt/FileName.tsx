// File names: middle-truncate the stem only. The extension is never cut.
//
//   [head …][last 6 of stem][.ext]
//   Only the head shrinks. The stem tail and .ext never do: the sizer below
//   guarantees there is always room for them. (Letting the tail shrink even a
//   fraction of a pixel gives it its own ellipsis: "Report…fin….pdf".)
//
// An invisible sizer ("…" + stem tail + ext) sets the minimum width. In a
// flex-wrap row that means: if even the shortest form won't fit beside the
// size, the size wraps onto its own line (name stacked above size).

const STEM_TAIL = 6;
const MAX_EXT = 12; // ".photoslibrary" is the longest real one we care about

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = (s: string) => (segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s));

export function splitFileName(name: string): { head: string; stemTail: string; ext: string } {
  const dot = name.lastIndexOf('.');
  const hasExt = dot > 0 && name.length - dot <= MAX_EXT + 1;
  const stem = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : '';
  const g = graphemes(stem);
  if (g.length <= STEM_TAIL + 4) return { head: stem, stemTail: '', ext };
  return { head: g.slice(0, -STEM_TAIL).join(''), stemTail: g.slice(-STEM_TAIL).join(''), ext };
}

export function FileName({ name }: { name: string }) {
  const { head, stemTail, ext } = splitFileName(name);
  const cell = 'min-w-0 overflow-hidden text-ellipsis whitespace-pre';
  return (
    <span dir="auto" title={name} className="block">
      {/* contain:inline-size so the full-length text doesn't inflate the minimum width. */}
      <span className="flex w-full [contain:inline-size]">
        <span className={cell}>{head}</span>
        {stemTail && <span className="shrink-0 whitespace-pre">{stemTail}</span>}
        {ext && (
          <span data-ext className="shrink-0 whitespace-pre">
            {ext}
          </span>
        )}
      </span>
      {/* Sizer: invisible, zero height; only its width counts (min-content of the name column).
          It must come last: as first child its zero-height box became the row's baseline. */}
      <span aria-hidden="true" className="invisible block h-0 overflow-hidden whitespace-pre">
        {stemTail ? `…${stemTail}${ext}` : `${head}${ext}`}
      </span>
    </span>
  );
}
