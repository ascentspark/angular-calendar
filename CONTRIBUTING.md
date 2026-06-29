# Contributing

Thanks for your interest in improving `@ascentsparksoftware/angular-calendar`.

## Reporting bugs vs. requesting features

- **Bugs:** open an issue using the **Bug report** form. A **minimal reproduction is
  required** — the smallest standalone example (StackBlitz or a repo) that shows the problem.
- **Features:** open a **Feature request** and **discuss the API first**. We care a lot about
  a small, consistent, signal-first public surface; let's agree the shape before code.
- **Security:** do **not** open a public issue. See [`SECURITY.md`](./SECURITY.md) and report
  privately.

## Release lines

The package **major tracks the Angular major**: `22.x` (current, `main`), `21.x`, `20.x`
(maintenance branches). Land cross-cutting fixes on `main` first, then cherry-pick to older
lines newest→oldest. Each branch pins one Angular major in `peerDependencies` and keeps its
own lockfile.

## Setup & commands

```bash
npm install
npm run build                 # ng build angular-calendar
ng serve demo                 # the docs/example app
npm test                      # ng test angular-calendar --watch=false (Vitest, not Karma)
ng test angular-calendar -- -t "name"   # run a single test by name
npm run lint
npm run format
```

Date/adapter specs run under both `TZ=UTC` and a pinned DST zone
(`TZ=America/New_York`) — run them the same way locally before pushing.

## Coding conventions

- **Signals-first** (`input()`/`model()`/`output()`, `computed`; `effect` only for imperative
  glue), **standalone**, **zoneless-safe**, **OnPush**, **SSR-safe**.
- **Headless core is pure** — no DOM, no date library, no `rrule` imports in `src/lib/core`
  (adapters are injected). Pure functions return new immutable values.
- **Theme-agnostic** — component CSS reads only `var(--cal-*)`; no hard-coded colours.
- **Security** — caller text is rendered as **text nodes only**; never `innerHTML` of caller
  content; no `eval`.
- **No `any`**, strict TypeScript, no non-null `!` assertions in core math.

## Pull request checklist

- [ ] Tests pass (`npm test`), lint passes (`npm run lint`), build succeeds (`npm run build`)
- [ ] Tests added/updated for the change
- [ ] Public API and docs updated if the surface changed
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] No `innerHTML` of caller content; zoneless-safe; OnPush
