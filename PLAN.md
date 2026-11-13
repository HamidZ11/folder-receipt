# Folder Receipt — Plan

Status: **approved 13 Nov 2026** (with changes, applied below).
Today's target: slices 1–5. Slices 6–7 follow in a later session.

Every slice ends with verify-done, then a commit, then the slice is ticked here. Work happens on branch `v1` and merges to `main` only when you say so.

---

## Risks (read first)

1. **pnpm on PATH is the old Corepack shim, which can't launch pnpm 12** (it expects `pnpm.cjs`; pnpm 12 ships a native binary). The session uses the pnpm 12.18.0 binary by full path. Before deploy, check that Vercel supports the pnpm 12 lockfile.
2. **I can't automate a real folder drag.** Playwright can't drop an OS folder, so the `webkitGetAsEntry` path will be verified in two ways:
   - unit tests with fake entry objects, including `readEntries` returning batches of 100, then 100, then 37, then empty;
   - a manual drop by you in real Safari and Chrome (about 1 minute per slice 3 check).
   Playwright *can* drive the `webkitdirectory` input with a real directory.
3. **iPhone can't pick folders.** iOS Safari has no folder drop and no `webkitdirectory`, so at 390px on a phone the sample receipt is the whole experience. The page should say so honestly rather than show a dead button.
4. **The walk can't run fully in a Worker.** `FileSystemEntry` objects can't be transferred to a Worker, so the walk runs on the main thread in yielded batches (`scheduler.yield()` where available, `setTimeout(0)` otherwise). The counter updates once per frame. Stats run on the main thread too. They move to a Worker only if measurement shows a long task over 50ms at 100k files.
5. **Drop data expires.** `DataTransfer` items become invalid after the drop event, so every `webkitGetAsEntry()` call must happen synchronously inside the handler.
6. **The CSP blocks Vite dev's HMR** (it uses inline scripts and websockets). The CSP is therefore injected only into the production build. A small inline plugin in `vite.config.ts` does this, so there's no dependency. It's verified on `vite preview`.
7. **NumberFlow and export may clash.** NumberFlow renders digits in shadow DOM, which DOM-to-PNG libraries may not capture. If we adopt it, export renders a static clone. This matters for slice 7.
8. **Duplicate name normalisation can produce false positives.** `Invoice 2` and `Invoice` are different documents but would match if their sizes were also identical. Same-size is the guard, and the tests cover the false-positive case.

---

## Proposed dependencies (approve or strike)

**Baseline (required by the stack you chose)**
- `react`, `react-dom`
- dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/vite`, `vitest`

**Approved:** baseline, `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`, `@playwright/test`.
**Ask in the slice:** `@number-flow/react` (slice 5), `modern-screenshot` (slice 7).
**Rejected:** `@tanstack/react-virtual`. Virtualisation is hand-rolled in slice 6.

No fonts are loaded. The placeholders are the system sans and `ui-monospace`, declared in `tokens.css`, so swapping them later is one line each. This also keeps export simple.

---

## Data model (shared by every slice)

```ts
// src/lib/stats/types.ts
type FileRecord = {
  path: string;          // relative to the dropped root
  name: string;          // basename
  ext: string;           // lower-case, no dot; "" if none
  size: number;          // bytes (bundle = sum of contents)
  lastModified: number;  // ms epoch (bundle = newest child)
  kind: 'file' | 'bundle';
};

type SkipCounts = { dsStore: number; dotfiles: number; nodeModules: number; git: number };

type ScanResult = { rootName: string; files: FileRecord[]; skipped: SkipCounts; scannedAt: number };

type ReceiptStats = {
  receiptNo: string; scannedAt: number; folderName: string;
  totalFiles: number; totalBytes: number;
  largest: FileRecord | null;
  notModifiedInAYear: FileRecord[];
  items: FileRecord[];                    // top 5 by size
  installers: FileRecord[];
  duplicateGroups: { name: string; size: number; files: FileRecord[]; reclaimable: number }[];
  totalSavings: number;                   // installers + dupes, union, never double counted
  breakdown: { category: Category; bytes: number; percent: number }[];
  skipped: SkipCounts;
};
```

**Rules, each covered by tests:**
- **Sizes:** decimal units (1 GB = 10⁹ B), the same as macOS Finder. Formatting uses `Intl`, en-GB, for example "18.4 GB" and "1,248".
- **Not modified in a year:** `lastModified` earlier than the same calendar date one year before `scannedAt`. `now` is injected so tests are deterministic.
- **Items:** sorted by size descending, ties broken by path ascending. A bundle counts as one item.
- **Installers:** matched by extension, case-insensitive.
- **Duplicates:** grouped by normalised basename + identical size, 0-byte files excluded. Reclaimable space is `(count − 1) × size`. Normalisation strips one copy suffix before the extension:
  - ` (n)`: Chrome and Firefox (`report (1).pdf`)
  - ` copy` and ` copy n`: Finder (`report copy.pdf`, `report copy 2.pdf`)
  - ` n`: Finder (`report 2.pdf`)
  Tests cover each pattern, plus a false positive that must not match (same normalised name, different size).
- **Total savings:** the union of installer bytes and duplicate reclaimable bytes. A file that is both is counted once.
- **Breakdown:** files are mapped to a category by extension (Videos, Images, Audio, Documents, Archives, Installers, Apps, Other). The bar shows at most 6 segments: the top 5 plus Other. Integer percentages use largest remainder, every non-zero segment gets at least 1%, and the total is **exactly 100**. An empty folder has no bar.
- **Skipped:** `.DS_Store` and dotfiles are counted per file. `node_modules` and `.git` are counted **per folder** and never walked into, because one `node_modules` can hold 100k files. Counts show in the scan status line, outside the receipt.
- **Bundles:** a directory whose name ends in `.app` or `.photoslibrary` becomes one `FileRecord` with `kind: 'bundle'`. This works the same for drag and drop (walk the subtree and sum it) and for the input fallback (group by path prefix).

---

## Slices

### 1. Scaffold, tokens, CSP, empty page shell
- [x] Vite React-TS template, `strict: true` plus `noUncheckedIndexedAccess`, Tailwind v4 via `@tailwindcss/vite`, Vitest config, and scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `screens`.
- [x] `src/styles/tokens.css` is **the only place visual values live**:
  - colours, type families and scale, spacing base, radii, hairline, shadows, motion durations and easings;
  - exposed through Tailwind v4 `@theme`, so utilities like `bg-paper` and `text-ink` work;
  - the default Tailwind palette is cleared (`--color-*: initial`), so no stray colours can creep in.
  Placeholder values come from the CONTEXT.md mock (#111 page, #F3F1EC paper, one blue accent).
- [x] All user-facing strings go in `src/content/copy.ts` and the site URL in `src/config.ts`. That way you can rewrite copy in one file.
- [x] The CSP is added to the built `index.html` as a meta tag: `default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`. The same policy, plus `frame-ancestors 'none'`, goes in `vercel.json` as real headers. It will be loosened (with your approval) only if export in slice 7 needs it.
- [x] `src/config.ts`: `SITE_URL = 'folder-receipt.vercel.app'` (placeholder).
- [x] Page shell: the page background, a drop-zone card (icon placeholder, title, privacy line) and an empty receipt slot below it as a **sibling**, not nested inside the drop zone.

**Verify:** `typecheck`, `lint`, `test` (one smoke test), `build`. Then `preview` with Playwright screenshots at 1280px and 390px in **Chromium and WebKit**, the console checked for CSP violations, and the CSP meta tag confirmed in `dist/index.html`. You also open the page once in real Safari.

### 2. Stats engine (pure functions, test first)
- [x] `src/lib/stats/`: `categories.ts`, `computeStats.ts`, `breakdown.ts`, `format.ts`, `receiptNo.ts` (a short deterministic hash of root name, count, bytes and time).
- [x] The tests are written first and cover:
  - totals;
  - largest, including ties and the empty case;
  - not modified in a year, including the boundary and leap day;
  - installers, including upper-case extensions;
  - duplicates, including 0-byte files and three or more copies;
  - savings without double counting;
  - the breakdown always summing to 100, as a property-style loop over random inputs, with each segment ≥1% and at most 6 segments;
  - formatting;
  - the 0-file case.
- [x] A perf check: a synthetic 100k-record fixture must compute in under 100ms. If it doesn't, it gets logged and Worker plans start. Measured: ~32ms in Node after bucketing duplicates by size first (was ~58ms).

**Verify:** `test` output showing all passing, plus `typecheck`, `lint` and `build`.

### 3. Folder ingest, scanning state, sample data
- [x] `src/lib/ingest/`:
  - `classify.ts` holds the skip and bundle rules. These are pure functions and tested.
  - `walkEntries.ts` does the drop walk: `readEntries` is called repeatedly until it returns empty, batches are yielded, and an `AbortSignal` cancels the walk when a new drop arrives.
  - `fromFileList.ts` handles the input fallback.
  - Both paths produce the same `ScanResult`.
- [x] Tests run the walker against fake entries (batched `readEntries`, nested folders, bundles, skipped folders) and check that the two ingest paths agree on the same tree.
- [x] Scanning state: a live counter (files found), updated each frame. A second drop cancels the first scan. One receipt per drop.
- [x] Sample folder: a hand-written `ScanResult` of about 1,200 files, generated by seeded code, so the page always has a receipt. It prints once on first load; later loads in the same session (`sessionStorage`) render it static.
- [x] Scan status line, outside the receipt: file count, and skipped counts once the scan finishes.
- [x] Error states, with copy in `copy.ts`:
  - permission denied;
  - a file dropped instead of a folder;
  - an empty folder;
  - an unsupported browser (iOS).

**Verify:**
- Tests, typecheck, lint and build.
- Playwright drives `webkitdirectory` on a generated `/tmp/fr-100k` tree (100k empty files, created and deleted by the script) in Chromium. A `longtask` observer must report **no task over 50ms**, and the counter is screenshotted mid-scan.
- WebKit runs the same flow on a 5k tree.
- 390px screenshots.
- You do a manual folder drag in Safari and in Chrome.

**Findings (slice 3):**
- `scheduler.yield()` starved React and timers during long scans (a `setTimeout(0)` waited 6.5s). The scan now yields through a `MessageChannel`.
- In Chromium, reading a picked File's size takes about 0.1ms, a synchronous metadata lookup. The budget is checked every 16 files.
- Chromium builds the 100k-entry FileList in one ~4s browser task before `change` fires. That's outside our code.
- Safari's folder picker leaves out hidden files (`.git`, `.env`, `.DS_Store`), so those counts read 0 on that path.
- Stats run in phases (`computeStatsSliced`) with a yield between each.

### 4. Static receipt render from stats
- [ ] `Receipt` components: Header, Summary, Items, Discounts, TotalSavings, Breakdown (bar + legend), Footer. Sections are collapsed and not yet interactive.
- [ ] Label left and value right, hairline dividers, `tabular-nums` on every number. Long names are truncated in the middle (`very-long-na…final.mov`) and the full name is kept in `title`. All values come from tokens.
- [ ] Every row carries `data-row` with its index, ready for slice 5. The receipt is `aria-live`-friendly: the content is in the DOM at once, not typed in.
- [ ] **break-ui** on the receipt, with a dev-only "Demo data / Worst case" toggle. Cases include:
  - 0 files;
  - 100k files;
  - 200-character names;
  - unbreakable names with no spaces;
  - non-Latin and emoji names;
  - one file only;
  - every file in a single category;
  - 2 TB totals.
  Everything that breaks gets fixed.

**Verify:** typecheck, lint, test and build, plus screenshots at 1280px and 390px in Chromium and WebKit for the sample data and each worst case. The console must be clean.

### 5. Print animation (signature)
- [ ] Design pass using **emil-design-eng → animate → choreograph** (I'll read the project's `.claude/skills/*` before writing any motion code). I'll show you the choreography as a timeline table before implementing it.
- [ ] Starting shape, to be refined by those skills:
  - A slot element sits above the receipt.
  - The slot is an `overflow: hidden` container. The paper feeds out with `translateY` at a fixed duration whatever its height. **No clip-path.**
  - Rows then reveal top to bottom (opacity plus a small `translateY`).
  - The stagger is clamped so that `feed + (rows−1)·stagger + row ≤ 2.5s`.
  - All durations and easings are read from `tokens.css`.
- [ ] It's driven by WAAPI, so **skip** (click, tap, or any non-modifier key outside inputs) calls `finish()` on every animation and lands on the exact end state.
- [ ] `prefers-reduced-motion`: a single opacity fade of the whole receipt, with no feed and no stagger.
- [ ] Only `transform` and `opacity` are animated. **animation-performance** runs if any frame drops.
- [ ] No auto-scroll. Rows below the fold are already revealed when you scroll to them.
- [ ] **review-animations** runs on the diff before commit, and every Block is fixed.

**Verify:**
- typecheck, lint, test and build.
- Playwright: a frame-timing trace of the print (Chromium), a measured total duration under 2.5s, skip tested by both click and key, and the reduced-motion emulation showing a fade only.
- Screenshots at mid-print and end state, at both widths and in both engines.
- You watch it once in Safari.

### 6. Expandable sections (later session)
- [ ] Each section expands into a sorted table, sortable by size, name or date. Long lists are virtualised.
- [ ] The expand motion follows the transitions.dev reference (motion only).
- [ ] review-animations runs, and 390px is checked.

### 7. Export with redaction (later session)
- [ ] Tall and square PNG.
- [ ] Redaction is on by default and toggleable. Names render as `▇▇▇▇▇.mov`, keeping the extension.
- [ ] The URL is in the footer, and export renders a static, non-animated clone.
- [ ] CSP is re-checked.

---

## Decisions (were open questions)

1. The sample prints once on first load. Later loads in the same session render it static.
2. Skipped counts go in the scan status line, outside the receipt.
3. Host: Vercel. Placeholder URL `folder-receipt.vercel.app` in `config.ts`. `vercel.json` carries the CSP plus `frame-ancestors 'none'` as headers, alongside the meta tag.
4. Duplicates normalise copy suffixes (see the data model).
5. No auto-scroll during the print.
6. Discount captions and footer copy: deadpan placeholders marked `TODO(Hamid)` in `copy.ts`.
