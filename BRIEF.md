# Folder Receipt — Brief

**One-liner:** Drop a folder onto a web page and it prints a receipt of what's inside. The receipt is interactive and you can export it. Nothing leaves your device.

Owner: Hamid (leads the project, designs the final look). Status: decisions locked, 13 Nov 2026.

---

## Must-haves (v1)

1. **Folder in, receipt out.** You drop a folder with drag and drop or pick it with the folder button. The page scans it with a live file counter and never freezes, then shows one receipt for that drop. There is built-in sample data, so the page is never empty.
2. **The receipt prints itself.** This is the signature element: paper feeds out of a slot, then rows reveal from top to bottom. It takes no more than ~2.5s and you can skip it. Once it has printed, each section expands into a sorted file table.
3. **Export.** You can save a tall PNG or a square PNG. File names are redacted by default (there is a toggle), and the site URL is in the footer.

## Receipt content (locked)

| Block | Content |
|---|---|
| Header | Receipt number, date/time, folder name |
| Summary | Total files · Total size · Largest file (name + size) · **Files not modified in a year** (exact wording; never "untouched" or "opened") |
| Items | Top 5 largest files, each priced by its size |
| Discounts | Leftover installers (`.dmg` `.pkg` `.exe` `.msi`) · Duplicates (same name + same size, no hashing) |
| Total savings | Space you could reclaim (installers + duplicate copies, nothing counted twice) |
| Space breakdown | A bar where every segment has a legend entry and the percentages add up to exactly 100 |
| Footer | Thank-you line, site URL |

- **Tone:** deadpan. Labels are literal. Humour appears only in the footer and the discount captions.
- **Look:** baseline is the clean card in CONTEXT.md §2: dark page, off-white receipt card, label left and value right, hairline dividers, one accent. No card inside the drop-zone card. At most 2 font families. `tabular-nums` on every number. **All values are placeholders.** Every visual token lives in `src/styles/tokens.css`.
- **Motion and hierarchy references** (provisional): NumberFlow (digit roll), Flighty (dense label/value, tabular numbers), transitions.dev (section expand). From these we take motion and hierarchy only, never layout, copy or branding.

## Constraints

- **Stack:** Vite + React + TypeScript (strict) + Tailwind v4, pnpm, Vitest for logic, static deploy.
- **Privacy:** no network calls carry file data. A strict CSP (`connect-src 'self'`) is in place, and the page says so.
- **Ingest:** drag and drop uses `webkitGetAsEntry` with repeated `readEntries` calls. A `<input webkitdirectory>` button is the fallback. `.DS_Store`, dotfiles, `node_modules` and `.git` are skipped and counted separately. `.app` and `.photoslibrary` bundles count as one item each.
- **Browsers:** Chrome, Safari and Firefox. Safari is tested early. Every UI slice is checked at 390px wide.
- **Dependencies:** none are added without approval. Proposals are in PLAN.md.

## Out of scope (v1)

- Accounts, backend, database or analytics on file data
- AI/LLM features
- Deleting or changing files (the browser has read-only access anyway)
- Content hashing for duplicates
- Treemap
- Comparing two receipts (before/after), and history
- Sound
- Themes (thermal paper realism, boarding pass, etc.)
- GitHub repos, `node_modules` audits or other sources
- Final visual design (Hamid does this)

## Success test

On Chrome and Safari, drop a real Downloads folder with 5,000+ files. The page should:

1. Keep the counter live and the page responsive during the scan.
2. Print the receipt within a few seconds of the scan finishing, and let a click or keypress skip the print.
3. Show total files and total size that match Finder for that folder, once skipped items are accounted for.
4. Expand any section into a sorted table.
5. Export a PNG with names redacted that is good enough to post.
6. Make no network request carrying file data (checked in the DevTools Network tab, and the CSP is present in the built page).

Also at 390px: the sample receipt prints, reads cleanly and exports.
