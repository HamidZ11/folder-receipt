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

## Left

1. **Slice 6 — expandable sections.** Each section expands into a sorted file table, with hand-rolled fixed-row virtualisation (no `@tanstack/react-virtual`). Run review-animations and check at 390px.
2. **Slice 7 — PNG export with redaction.**
   - Tall and square crops.
   - Names redacted by default, with a toggle.
   - URL in the footer.
   - Ask before adding `modern-screenshot`, and re-check the CSP (export may need `data:`/`blob:` or inline styles).
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
