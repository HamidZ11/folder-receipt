# Folder Receipt

Project brief: `BRIEF.md`. Plan and slice status: `PLAN.md`. Handover: `HANDOVER.md`.

- Every visual value lives in `src/styles/tokens.css`; every user-facing string in `src/content/copy.ts`.
- `pnpm verify` is the definition of done (typecheck, lint, unit tests, build, check:prod, e2e).

## Lessons

- 2026-11-13 — Commit only when pnpm verify itself exits 0; never gate on a piped command's exit code — a grep hid a failing test in 60d221e.
