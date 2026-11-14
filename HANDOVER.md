# Handover — Folder Receipt, 13 Nov 2026

Branch `v1` (pushed). Not merged to `main`.

## Done

| Slice | What | Commits |
|---|---|---|
| 1 | Scaffold, `tokens.css`, CSP (meta tag at build and `vercel.json` header), page shell | `5e4ccb7`, typecheck fix `ed1ef33` |
| 2 | Stats engine as pure functions, 72 tests (duplicates normalise copy suffixes; breakdown always sums to 100) | `6a187e5` |
| 3 | Folder ingest (drag-and-drop walker + `webkitdirectory` fallback), scanning state, sample data. 100k files: 0 long tasks | `f6ec59c` |
| 4 | Static receipt + break-ui (dev-only worst-case toggle). Largest-file row removed; extensions never truncated | `2f990ef`, `a39544f` |
| 5 | Print animation: print-while-feeding, only the paper moves, header first (rises from a slot below the receipt) | `60d221e`, `1d9b4c7`, final commit on `v1` (header-first + this handover) |

Verified at the last commit: `pnpm verify` exits 0. That covers typecheck, lint, 121 unit tests, build, check:prod, and the e2e suite in Chromium and WebKit, including:
- a print frame trace with 0 frames over 25ms;
- skip by click and by key;
- reduced motion;
- once per session;
- a drop mid-print.

## Ship-check (static-site parts, 14 Nov)

| Item | Result | Evidence |
|---|---|---|
| CSP | ✓ | The meta tag is in `dist/index.html` and `dist/404.html` (e2e). The header is in `vercel.json`. `csp.test.ts` keeps them in sync, and `csp.headers.test.ts` asserts there's no `unsafe-*`. Export embeds fonts without any CSP change. |
| Security headers | ✓ (config) | `vercel.json` sets nosniff, `no-referrer`, `X-Frame-Options: DENY`, HSTS for 2 years, a Permissions-Policy (no camera, mic or location), COOP and CORP same-origin. Checked by unit test. **Not verified live: run `curl -I` after deploy.** |
| pnpm audit | ✓ prod / note dev | `pnpm audit --prod`: no known vulnerabilities. All deps: 1 moderate (`minimatch` < 11.0.1, ReDoS), reachable only through ESLint, a dev tool that doesn't ship. |
| Secrets | ✓ | Nothing in git history matches key or secret patterns. `.env*` is ignored. |
| Title, description, canonical | ✓ | Injected from `copy.meta` at build time. **The canonical uses the placeholder `SITE_URL` (`folder-receipt.vercel.app`).** |
| OG image and Twitter card | ✓ | `public/og.png` is 1200×630, made from a real torn export of the sample (`OG=1` spec). There are og:* and `twitter:card=summary_large_image` tags. The absolute image URL uses the placeholder domain. **Link preview not checked (needs a deploy).** |
| Favicon | ✓ | `public/favicon.svg`, returns 200 (e2e). No apple-touch-icon PNG: iOS home-screen icons fall back. |
| 404 page | ✓ | `dist/404.html` with its own CSP, `noindex`, and a link home (e2e). Vercel serves it for unknown paths; **not verifiable before deploy.** |
| robots.txt | ✓ | `public/robots.txt` allows all. No sitemap (one page). |
| Lighthouse, mobile | ✓ perf 98, a11y 100 | Best practices 96, SEO 100. LCP 2.1s, TBT 10ms, CLS 0. The 4 best-practices points: about 30% of the text is under 12px (11px labels, receipt mono at its 390px minimum). That's a design call. |
| Lighthouse, desktop | ✓ 100 / 100 | Best practices 100, SEO 100. LCP 0.5s. |
| Auth, DB, rate limits, spend caps, AI | N/A | Static site: no backend, no accounts, no paid APIs. |
| Analytics, error tracking, privacy policy | N/A | Nothing is collected. |
| Real phone | ✗ not done | Needs Hamid: tear on touch, folder picker hidden on phones, iOS export download. |

## D is the real page (branch `design`, 14 Nov)

The prototype switcher, A/B/C and their theme files have been removed. D's values now live in `tokens.css`; `receipt.css` holds the paper structure (token-only).
- **Box: dark.** Hamid's reply left the dark/light choice blank, so I chose dark (the case he gave instructions for). It has a slot lip: a dark seam drawn over the paper's top edge, so the paper emerges from under it. The light box values are in a comment at the end of `tokens.css` and swap in with one edit.
- **Desktop:** the column widens to 30rem from the `sm` breakpoint. The receipt mono reaches 15px. The 390px behaviour and the no-wrap e2e are unchanged.
- **Legend:** an even grid with the percentage under each name. 6 entries make 3+3; 4 make 2+2. e2e checks two rows of three.
- **Privacy line:** inside the device, under the subtitle. Nothing sits below the paper.
- **NAMES:** has an on/off light in the STATUS light style, and `aria-pressed` is checked by e2e.
- **Footer copy:** "Keep this receipt. Your files did." (no longer a TODO).
- **Status line** (skipped counts, errors, Safari note): now inside the device, under the counter.
- **Export:** one path. The thermal paper with Space Mono and Manrope embedded, CSP-safe.
- **Fonts:** only Manrope and Space Mono remain installed.
- **Screenshots:** `screens/final/` holds idle, scanning, mid-print, done and torn export at 1280px and 390px, plus a WebKit end state.
- **Idle in screenshots** means a return visit, where the sample shows without printing; there's no receipt-less state in the real page.

## Design phase (branch `design`, 14 Nov). History: D was chosen; A/B/C have been removed

Three directions behind a dev-only switcher. Run `pnpm dev`, then open `http://localhost:5173/?proto=A` (or `B`, `C`). Production never ships it: the same gate as the worst-case toggle applies, and `check:prod` also greps for `proto-picker`.
- **Keys:** 1–3 or ←/→ switch direction; R replays the scan and print; F swaps the font pairing (`?font=1|2`).
- **Fixed moments for screenshots:** `?state=idle|scanning|printing|done`.

| Dir | Pairing 1 / 2 (sans + mono) | Slot and feed | Tear |
|---|---|---|---|
| A Thermal | Space Grotesk + Space Mono / IBM Plex Sans + IBM Plex Mono | slot under the printer, paper feeds down (footer first) | yes |
| B Object | Manrope + JetBrains Mono / DM Sans + DM Mono | slot under the device, feeds down | yes |
| C Editorial | Geist Sans + Geist Mono / Hanken Grotesk + Martian Mono | slot below the card, rises (header first, as now) | no (button only) |

- **Theme files:** `src/styles/themes/{thermal,object,editorial}.css`, scoped to `:root[data-proto]`. To adopt one, `@import` it in `tokens.css` and drop the scoping.
- **Fonts:** `@fontsource`, latin subset, self-hosted woff2. Vite is set never to inline fonts as `data:`, so the CSP is unchanged.
- **Tear-to-export (A, B):**
  - The paper tracks the pointer 1:1, rubber-banded towards the slot.
  - It tears at more than 120px or on a flick faster than 0.6px/ms.
  - Otherwise it snaps back on a velocity-seeded spring (a CSS `linear()` curve generated from a damped spring).
  - On touch, only the grip strip under the paper starts a tear, so the receipt still scrolls.
  - A tear exports a redacted tall PNG, then a fresh receipt prints.
- **Screenshots:** `screens/design/{A,B,C}-{idle,midprint,done,done-font2}-{1280,390}.png`, plus `{A,B}-torn-export.png`.

### D · Combined (art direction, 14 Nov): `?proto=D`
- **Paper:** A's thermal (Space Mono, dotted rules, zigzag edge, barcode, warm ink), feeding down out of the device's slot, footer first.
- **Device:** B's structure.
  - Labels: INPUT, FILES and STATUS. STATUS has a job: its word (Ready, Scanning, Printing, Printed) plus a blue light. OUTPUT was dropped.
  - A large Space Mono counter, and Choose-a-folder inside the box.
  - TALL, SQUARE and a NAMES toggle (`aria-pressed`, off = redacted) on the device. The row under the receipt is gone.
- **Colour:** C's dark page and button, with C's blue for the breakdown bar and legend. No orange and no amber.
- **Box colour:** key B, or `?box=dark|light`. Dark is C's surface; light is B's off-white with the button inverted.
- **Fonts:** exactly two families. Manrope (page and box) and Space Mono (receipt and counter), self-hosted.
- **No label wraps:** the receipt's mono size follows the paper's width (`--receipt-font`, container query, 11–14px). Captions and links scale with it. Checked by e2e at 1280px and 390px, and it holds on the worst-case fixture too.
- **Controls and the tear hint** are hidden (inert, no transition) during the print, then fade in (`--duration-fade`, ease-out) once the paper lands.
- **After a tear the top edge is zigzag too:** it appears the instant it rips, stays on later receipts (the roll was torn), and is in the export.
- **Export fonts, CSP unchanged.** modern-screenshot's default path puts an inline `<style>` into a scratch document that inherits the page's CSP. Passing `font: { cssText }` skips that path. `src/lib/export/fontFaceCss.ts` fetches our own woff2 (`connect-src 'self'`) into `data:` URLs inside `@font-face` rules, which are written straight into the SVG image. The e2e checks the font fetch and zero CSP violations, and the exported PNG visibly uses Space Mono. **This resolves the earlier open question.**
- **New strings** are in `copy.ts` (`device.*` and `export.*Short`). A/B/C still use `protoCopy.ts`.
- **review-animations:** one finding. Under reduced motion, a short pull jumped back with no settle; it now gets a 150ms settle. Verdict: Approve.
- **break-ui:** `?proto=D&data=worst` holds at 1280px and 390px. Nothing goes past the paper edge, no label wraps, there's no sideways scroll, and no NaN.
- **Screenshots:** `screens/design-d/` holds `{idle,done}-{dark,light}`, `scanning`, `midprint`, `torn-export` and `worst-done`, each at 1280px and 390px.
- **Left for polish:** the footer line "…Your files / did." wraps with one orphan word (TODO(Hamid) copy). Mid-print leaves the paper's full height reserved below it.

### Design-phase decisions (reversible)
- **A and B feed down, footer first.** A device on top with paper hanging below can't be header-first with upright text. C keeps the header-first rise.
- **The picker uses `?proto=A|B|C`** as asked, not the picker spec's `?v=`. Font switching is a key (F), not a picker button, to keep the picker verbatim.
- **The tear always exports a redacted tall PNG.** The "Show file names" box only applies to the buttons.
- **Proto-only strings** ("Ready", "Input", "Pull to tear off and save"…) live in `src/dev/proto/protoCopy.ts`, because `copy.ts` is frozen. They move into `copy.ts` on promotion.

### Design-phase open questions
- **Resolved in D:** web fonts in exports now go into the SVG without any CSP change (see D). A/B/C exports still use system fonts; they're kept for reference only.

## Overnight run (13 Nov, ~30 min budget)

- **Done:** slice 6 (expandable sections) and slice 7 (PNG export). See below.
- **Done:** fresh-context review. No Critical or High findings; see "Review findings" at the end.
- **In progress:** nothing.
- **Done:** Medium finding 1 (an unreadable root folder now shows the error).
- **Next:** Medium findings 2–3, then ship-check and deploy.

### Slice 6 — expandable sections (done)
- "List n files" under Items (every file), Files not modified in a year, Leftover installers and Duplicates (extra copies).
- Table sortable by Name (natural, case-insensitive), Size and Modified, with `aria-sort`. The first click on a column uses its natural direction; clicking again reverses it.
- Hand-rolled fixed-row virtualisation: 32px rows (8 × `--spacing`, read from the token) and a 10-row viewport. Only the visible window plus 4 rows of overscan is in the DOM; e2e checks that 100k files stays under 30 rows, including at the bottom.
- Motion: `grid-template-rows` 0fr → 1fr over `--duration-expand` with `--ease-out`, and none under reduced motion. Closed lists are `inert`. review-animations: Approve (height animation is the sanctioned case for accordion-style disclosure).

### Slice 7 — export (done)
- "Save tall PNG" and "Save square PNG" under the receipt, plus a "Show file names" checkbox (off by default, so exports are redacted).
- Captured from a static clone: a separate React root rendered off-screen, with no print animation and no lists. `modern-screenshot` `domToBlob` at 2× with `font: false` (system fonts, nothing fetched).
- Sizes: tall 960×1948 and square 1948×1948 (the receipt centred on the page background).
- Redaction: file names become `▇▇▇▇.ext`, and the folder name becomes `▇▇▇▇`. The URL stays in the footer.
- **The CSP did not need loosening:** 0 violations in Chromium and WebKit.
- Tests:
  - A unit test renders the export receipt to HTML and checks redaction.
  - The e2e checks the downloads, the PNG dimensions, that ticking "Show file names" changes the image, no CSP violations and a clean console, and that the clone is removed afterwards.

## Decisions I made (reversible)

- **The folder name is redacted too** when names are hidden, because folder names can be personal. Undo: in `Receipt.tsx`, use `stats.folderName` when `redact` is set.
- **Square export = the tall receipt centred on a square of page background.** It's not a cropped or reflowed layout. Undo or change: `exportReceipt.tsx`.
- **Export file name:** `folder-receipt-<receipt no>-<tall|square>.png`.
- **Redaction is checked by a unit test rather than in the e2e.** Reading the off-screen clone's text from the page came back empty in both engines (the image was correct). The e2e instead checks that redacted and named exports differ.

- **The breakdown bar has no list.** Category lists would repeat the Items table filtered by type. Undo: add an `Expandable` per breakdown segment.
- **Expand control:** a muted underlined text button under each section ("List 1,210 files" / "Hide list"). These are placeholder visuals from tokens. The copy is new and lives in `copy.ts` under `receipt.expand`.
- **Tables mount on first open and stay mounted** so the collapse can animate. Undo: unmount on `transitionend`.

## Left

2. ~~Slice 7~~ (done in the overnight run). Possible follow-ups:
   - The square export is very tall-in-square. Hamid may want a reflowed square layout.
   - Check the export's look on a real phone (download behaviour on iOS Safari).
3. **Ship-check** (the light, static-site parts of the pack's checklist).
4. **Deploy to Vercel.** Check it supports `packageManager: pnpm@12.18.0` with a v9 lockfile. It may need `ENABLE_EXPERIMENTAL_COREPACK=1`, and old Corepack can't launch pnpm 12. Confirm the CSP header is served (`curl -I`).
5. **Hamid's design pass:**
   - `src/styles/tokens.css`: every value is a placeholder.
   - `src/content/copy.ts`: rewrite every line marked `TODO(Hamid)`.
   - Replace the placeholder `SITE_URL` in `src/config.ts`.

## Open questions

- **Print feel in real Safari and on a phone.** Only Playwright WebKit has been run. At 390px the slot (the bottom of the receipt) sits below the fold, so on a phone you see the paper rising up through the screen rather than out of a visible slot. Is that acceptable?
- **Duplicate matching on real data.** Name normalisation (`(1)`, `copy`, `copy 2`, ` 2`) needs the same size, so false positives should be rare. It hasn't been checked against a real Downloads folder beyond the manual drag test.
- **Safari never shows hidden files** (on drag or with the folder button). The status line says "hidden files and .git not visible in Safari". Keep that copy?
- **Items at 200% text on a phone** stack the size under long names (approved). The folder row is cut from both ends at that size (left as is).

## Commands

```bash
pnpm install
pnpm exec playwright install chromium webkit   # once, for e2e

pnpm dev                      # http://localhost:5173 (no CSP in dev; HMR needs inline scripts)
# Worst-case toggle (dev only, never in production):
#   http://localhost:5173/?data=worst
#   other values: demo | empty | one | 100k | one-category
# Replay the sample print: clear sessionStorage (key fr-sample-printed) and reload.

pnpm verify                   # typecheck, lint, unit tests, build, check:prod, e2e (~1.5 min)
pnpm build && pnpm preview    # production build with the CSP, http://localhost:4173
```

e2e uses its own build in `dist-e2e/` (with the toggle) on port 4174, with one worker so the timing tests don't share the CPU. Screenshots go to `screens/` (git-ignored).

## Review findings

Fresh-context subagent review of `git diff main...v1` against BRIEF.md and PLAN.md, run 13 Nov at commit `39fa2e0` (before slices 6–7). **Critical: none. High: none.** No fixes were required by the overnight-run rules. The Medium and Low findings below are left for the next session.

### Medium
1. **Fixed (overnight run).** **Unreadable root folder.** `src/lib/ingest/walkEntries.ts:38-44`: if the dropped root folder can't be read, the walk counts it as unreadable and prints an empty "0 files" receipt instead of the `unreadable` error. Fix: rethrow when the root read fails (`segs.length === 0`).
2. **Fixed (14 Nov).** The review had the engines backwards. Measured: clearing `input.value` empties an already-read FileList in place in **Chromium and WebKit** (5 → 0), but not in Firefox (5 → 5). A pick generation counter now means only the latest pick clears the input. The e2e proves it: without the fix, Chromium read 92 of 301 files. **A cancelled pick clears a newer pick's files.** `src/components/DropZone.tsx:93-99` with `useFolderScan.ts`: the cancelled scan's `finally` clears the file input. In Firefox the `FileList` is live, so a newer pick's scan could be cut short. Reasoned from Gecko's implementation, not run. Fix: a pick generation counter; only the latest pick clears the input.
3. **Fixed (14 Nov).** A `firefox` Playwright project now runs the whole suite. The only Firefox-specific difference was in a test: like Chromium, Firefox's folder picker lists hidden files. **Firefox isn't tested** (BRIEF drift). BRIEF names Chrome, Safari and Firefox, but e2e covers Chromium and WebKit only. Fix: add a `firefox` Playwright project for the ingest and print specs, plus a manual Firefox drag test.

### Low
4. **An invalid drop during a scan shows its error for one frame.** `useFolderScan.ts:79-85`: the next counter update overwrites it, and the old paper's fade restarts. Fix: ignore invalid drops while scanning, or abort the scan first.
5. **A superseded scan can briefly overwrite the new scan's status.** `useFolderScan.ts:49-52`: its pending frame update still fires. Fix: in `flush`, `if (current.current !== ac) return;`.
6. **`.photoslibrary` can still be truncated.** The extension is 13 characters, but `FileName.tsx` has `MAX_EXT = 12` and `MiddleTruncate.tsx` has 12. Fix: raise both to 13 and add a test.
7. **The privacy line slightly overclaims.** `copy.ts:43-44`: the CSP doesn't cover top-level navigation, `window.open` or WebRTC. Fix: soften the copy (Hamid's call), and optionally lint-ban those APIs.
8. **CSP checks are partial.** e2e only checks `connect-src`, `csp.test.ts` doesn't ban `unsafe-*`, and `check:prod` passes trivially if `dist/assets` is missing. Fix: assert the meta tag equals `CSP_META`, ban `unsafe-*`, and add `test -d dist/assets` to `check:prod`.
9. **The receipt break-ui e2e can check the sample instead of the fixture** (`receipt.spec.ts:25-32`). The toggle's pressed state renders before the fixture receipt arrives. Fix: wait for something only the fixture has, such as its folder name or total.
10. **Two print tests pass even if the print never starts** ("key skips" and "once per session" in `print.spec.ts`). Fix: assert `running` before the key press.
11. **The "drop mid-print" test never checks the fade or the finished print.** Fix: assert the opacity animation and the earlier print's `finished` state right after the pick.
12. **The frame-trace wall time includes frames after the print ended.** Fix: cap the window at `startTime + duration`. It also measures main-thread frames, not compositor frames.
13. **Hard wall-clock limits in the gates** (`computeStats` < 100ms; 0ms input blocking) can fail on slower machines. Fix: put them behind an env flag or give them generous margins.
14. **The synthetic "dropped a file" e2e may pass through the wrong code branch.** Fix: unit-test `folderFromDrop` with fake items.
