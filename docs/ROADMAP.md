# `@ascentsparksoftware/angular-calendar` — Roadmap

Phased, gated delivery. **No phase begins until the prior phase's exit criteria are met and
verified with real command output.** Each phase has its own atomic task plan in
`docs/build-plans/phase-NN-*.md`. TDD throughout: test first, frequent commits, review gate
at each phase boundary.

---

## Decision log (locked)

| Topic | Decision | Rationale |
|---|---|---|
| Package | Single `@ascentsparksoftware/angular-calendar`, tree-shakable views + secondary entries (`/date-fns`, `/recurrence-editor`, `/export`, `/testing`) | Mirror image-editor single-package model; pay-for-what-you-import |
| Versioning | Package major == Angular major; **three supported lines 20.x.x / 21.x.x / 22.x.x** | Match in-house libs; version tracks the Angular it targets |
| Angular support | **20, 21, 22** — `main`=22.x + `21.x`/`20.x` maintenance branches; each line's peerDeps pin its major; per-line lockfiles | Broad adoption across current Angular majors |
| Publishing | **CI-only** via a GitHub Actions release workflow on `v*.*.*` tags (build→test→`npm publish --provenance`, dist-tag from major); **no manual publish/copying**; npm token only as `NPM_TOKEN` Actions secret | Reproducible, auditable, no local credentials |
| Timezone | Correct from day one; `ZonedDateTime` model; default `date-fns` + `date-fns-tz` | Multi-site field service; biggest gap in references |
| Recurrence | In v1; RFC 5545 via `rrule` behind our adapter; standalone editor; 3-way edit | Availability/recurring jobs needed early |
| Drag engine | Custom Pointer-Events layer (precision/touch) + CDK drag-drop for external drag-in | Mobile-precise is a hard requirement |
| Scope | General-purpose v1; field-service look = demos/presets on top, not core | Reusable beyond one org |
| Reactivity | Signals-first, standalone, zoneless, OnPush, SSR-safe | Modern Angular 22; differentiator |
| Theming | `--cal-*` CSS custom properties via OKLCH `deriveTheme`/`applyTheme` | Theme-agnostic; no Sass build |
| Layout | Pure, DOM-free builders; interval-tree / sweep-line packing; fraction geometry | Testable, fast, no thrash |
| Feature scope | **Full Syncfusion parity in v1** — Year & Timeline-Year views, inline editing, print/print-to-PDF, non-Gregorian calendar systems, configurable timezone-picker, responsive adaptive (mobile drawer) layout are all v1, not deferred | Match/beat the mature commercial bar from the first release |

---

## Phase 0 — Discovery & analysis ✅ DONE

Cloned and dissected the three references; produced `docs/calendar-competitive-analysis.md`
(rubric tables + does-well / does-poorly / worth-borrowing per library + synthesis). This
spec and roadmap are the synthesized output.

**Exit (met):** competitive-analysis doc committed; SPEC + ROADMAP approved.

---

## Phase 1 — Scaffold + theming engine + headless core foundations ✅ DONE

**Completed.** Angular 22 CLI workspace (`angular-calendar` lib + SSR `demo`), strict TS
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strictTemplates`), ng-packagr
with the published `@ascentsparksoftware/angular-calendar@22.0.0` manifest + a tree-shakable
`/date-fns` secondary entry, Vitest (zoneless providers, coverage thresholds), angular-eslint
flat config (prefix `cal`, no-`any`/no-`!`), Prettier, and community/Dependabot/CI files.
Theming engine (`color`/`oklch`/`tokens`/`derive-theme`/`apply-theme`, `--cal-*`, OKLCH,
AA-guaranteed, per-status colour map). Timezone-correct `ZonedDateTime` + `DateAdapter` +
`date-fns(+tz)` adapter with calendar-system primitives (Gregorian/Islamic/Buddhist/
Japanese/Persian via `Intl`). Pure layout core (interval row-packing, sweep-line column
packing with back-fill, projection) — property-tested. `provideCalendar()` + config + public
API. **77 unit tests green under `TZ=UTC` and `TZ=America/New_York`** (DST-verified); coverage
~99% statements/functions/lines (residual branch % = provably-unreachable `noUncheckedIndexedAccess`
guards); `ng build` builds both entry points; `npm pack` dry-run clean; lint clean; no shipped
fingerprints. **Deferred to Phase 8:** the multi-line (20.x/21.x) CI matrix + per-branch
check names — the maintenance branches don't exist until the library stabilises; `main` has a
single-line CI workflow now.

Repo, Angular-22 CLI workspace (lib `angular-calendar` + demo), ng-packagr, lint/format/
test (Vitest) wiring, CI + community files (single-branch variant of `github_standard.md`).
Theming engine (`oklch`/`color`/`tokens`/`derive-theme`/`apply-theme`, `--cal-*`). Date
adapter interface + `ZonedDateTime` + default `date-fns(+tz)` adapter, including the
**calendar-system primitives** (`getEra`/calendar-aware `format` via `Intl`, `CalendarSystem`
type) that the non-Gregorian display builds on. `provideCalendar()`. Pure view-model +
lane-packing + projection primitives (no DOM), fully unit-tested.

**Exit:** `ng build angular-calendar` + `ng test` green; theming + adapter (incl.
calendar-system) + packing have ≥95% coverage incl. DST cases; CI green on all three Angular
lines (distinct check names); published-package manifest shape correct (peerDeps pin the
line's major); `npm pack` dry-run clean. **Gate review.**

## Phase 2 — Month view + Year view 🟡 IN PROGRESS

**Done:** `buildMonthView` (grid, cross-week multi-day chip packing via the interval-tree
row packer, overflow counting) + `<cal-month-view>` (spanning chips, status colours,
selection, click outputs, `viewPeriodChanged`, default + overridable templates via
`*calCellTemplate`/`*calEventTemplate`/`*calOverflow`, ARIA grid semantics, roving-tabindex
arrow-key navigation, "+N more"). `buildYearView` + `<cal-year-view>` (12 mini-months,
event-density heat + dots, today, drill-down day/month, non-Gregorian labels, roving
keyboard). `CalCalendarA11y` DI provider. **106 unit tests** (TZ=UTC + DST). Demo app with a
Month/Year toggle + light/dark theme switch — **visually verified via Playwright** (month
light+dark, year light): spanning, status colours, today pill, density all correct.
**Remaining:** richer "+N more" CDK-overlay popover (currently the control selects the day);
formal Playwright e2e + axe-zero gate + committed screenshot baselines (light/dark/RTL); RTL
visual pass (CSS already uses logical properties). These land with the shared e2e/axe harness.

`<cal-month-view>` (chips, "+N more" overflow popover, multi-day spans, today, selection),
default templates + override directives, a11y grid semantics, theming applied. Plus
`<cal-year-view>` (12-month overview, per-day event-density dots, click a day to drill into
month/day) built on the same pure builders and honouring `calendarSystem` for month/year
labels.

**Exit:** month-view + year-view components + e2e + axe-clean + screenshot baselines
(light/dark/RTL); year view verified under a non-Gregorian `calendarSystem`.

## Phase 3 — Week / Day time-grid (both orientations) 🟡 IN PROGRESS

**Done:** `buildTimeGridView` (day-window clipping, sweep-line side-by-side packing via
`packColumns`, all-day band via `packRows`, multi-day spans, work-week `excludeDays`,
now-indicator offset, hourly ticks — 116→121 tests incl. DST). `<cal-time-grid>` component
(time gutter, day headers with today pill, all-day band, hour lines, status-coloured timed
events with lane geometry, live now-line, slot click→`slotSelected`, `eventClicked`,
overridable `*calEventTemplate`, theming). Demo Week + Day views — **visually verified via
Playwright** (week light): correct time placement, status colours, all-day band, now-line,
weekend shading. **Remaining:** thin `<cal-week-view>`/`<cal-day-view>` selector wrappers
(currently `<cal-time-grid days=7/1>`); **horizontal orientation** CSS (vertical done; host
class toggles, X-axis layout pending); working-hours/off-hours shading bands (model has the
`shade` slot, builder emits `[]` for now); keyboard nav across slots; axe + screenshot gate.

`<cal-week-view>` / `<cal-day-view>` with `orientation` toggle (time on X or Y), now-line,
all-day band, working-hours shading, side-by-side lane packing, slot granularity.

**Exit:** both orientations render correctly; now-indicator ticks; axe-clean; screenshots.

## Phase 4 — Resource / timeline view 🟡 IN PROGRESS

**Done:** cycle-safe `flattenResources` (tree → depth-ordered, collapse-aware). `buildTimelineView`
(continuous multi-day range, multi-level declarative headers day/hour/week/month, per-resource
lanes with sweep-line sub-lane packing, off-hours shading from `workHours`, block-out shading
from `isBlock`, now-indicator). `<cal-timeline-view>` dispatch board (single-scroll grid with
sticky time headers + frozen resource column, resource-tree expand/collapse, positioned event
blocks with status colours, off-hours/block shading, now-line, slot click → `slotSelected`,
`eventClicked`, overridable `*calEventTemplate`/`*calResourceHeader`). `buildAgendaView` +
`<cal-agenda-view>` (day-grouped list, all-day-first ordering, status dots, empty-day handling,
hide-empty). **148 unit tests**; **visually verified via Playwright** (timeline dispatch board +
agenda, light) — resource tree, job blocks on correct lanes/times, off-hours shading, now-line,
collapse all correct. **Remaining:** CDK virtual-scroll for large fleets (100 res × 2000 ev
≥55 fps bench); **Timeline-Year** range mode; thin `<cal-week-view>`/`<cal-day-view>` selectors;
axe + screenshot gate.

`<cal-timeline-view>`: resources × time, declarative multi-level time headers, resource
tree (group/expand), per-resource work hours / block-out shading, pixel↔time projection,
CDK virtual scroll for many rows/events. The field-service dispatch-board core. Includes the
**Timeline-Year** range mode (resources × a full-year axis with year/month/week header rows)
and `<cal-agenda-view>`.

**Exit:** 100 resources × 2,000 events virtualized at ≥55 fps (bench); Timeline-Year renders
a full year virtualized; axe-clean; screenshots.

## Phase 5 — Interactions

Custom Pointer-Events engine: drag-move, drag-create, edge resize, snap, touch long-press,
`dragState` signal + `computed` preview, `validateChange` veto, cancellable async commit
outputs, CDK external drag-in, full keyboard drag/resize + roving-tabindex. Plus
**single-click inline editing** of an event title (F2/Enter to edit, Escape to cancel,
text-only, commit via `eventChanged` `kind:'inline-edit'`).

**Exit:** Playwright e2e incl. touch emulation for move/create/resize **and inline-edit**
across all views; keyboard-only operability verified; axe-clean.

## Phase 6 — Recurrence + advanced

RRULE adapter + windowed expansion + exceptions; `<cal-recurrence-editor>` standalone
control; three-way edit semantics + exception bookkeeping helpers; conflict/overlap
detection; status filtering; tooltips/popovers; density modes.

**Exit:** recurrence expansion property-tested (DST-correct); editor e2e; 3-way edit flows;
overlap detection asserted.

## Phase 7 — A11y + i18n + RTL + timezone + calendar systems + adaptive + perf hardening

Full keyboard map, `CalCalendarA11y` strings, reduced-motion; `CalCalendarIntl`, locale,
12/24h, **RTL in every view incl. timeline**; per-event timezone surfacing + a
**configurable timezone-picker collection** (`timezonePickerZones`); **non-Gregorian
calendar systems** (Islamic/Hijri, Buddhist, Japanese, Persian) wired through every view via
the Phase-1 adapter primitives; **responsive/adaptive layout** (container-query driven
mobile drawer, single-resource collapse, swipe nav, month→agenda fallback); virtualization
extended to vertical views; perf budgets encoded as CI assertions.

**Exit:** axe zero-violations gate across all views/modes/orientations/RTL **and calendar
systems and adaptive (mobile) layout**; timezone picker honours the restricted subset; all
perf budgets pass in CI; bundle-size budget passes.

## Phase 8 — Docs, Storybook, demo, optional token bridge, publish

Public docs (`README`, `ARCHITECTURE.md`, `THEMING.md`, `MIGRATION.md`, `SECURITY.md`),
Storybook (per-state, a11y addon, visual-regression), demo app (SSR-safe), optional
`provideCalendar(withTokenBridge())` adapter for design-token systems. **Print / print-to-PDF**
(`/export` entry, `withPrint`, `print()` API, print stylesheet) and ICS/Excel/CSV export.
Repo hardening (multi-line Dependabot, per-branch CI with distinct check names, CodeQL,
ruleset). **CI-only release:** a GitHub Actions `release.yml` on `v*.*.*` tags builds, tests,
and `npm publish --provenance` with the dist-tag derived from the tag's major (`latest` for
22, `ng21`/`ng20` for maintenance). No manual publish; `NPM_TOKEN` is the only credential and
lives solely as an Actions secret. `RELEASING.md` runbook documents tag→Actions→verify.

**Exit:** GitHub Community Standards green; CI/CodeQL clean on all three lines; the release
workflow performs a successful tagged publish (verified on npm) with **no manual step**;
print/print-to-PDF produces correct paginated output (e2e); docs site builds; the shipped
tree contains no build-tool or assistant fingerprints.

## Phase 9 — Field-service proof surface (consumer demo)

A demo/preset proving the API against the "Lust for Dust" requirements: resource schedule,
week-as-rows, 7-status theming, rich event cards, unscheduled strip, status filters,
external drag-in — built **on top of** the published library, not in core.

**Exit:** the field-service wireframe requirements (charter §1) reproduced using only the
public API + a thin preset; documented as the reference adoption pattern.

---

## Per-phase ritual (every phase)

1. Read the phase plan in `docs/build-plans/`. 2. Create a todo per task. 3. TDD each task
(test → fail → implement → pass → commit). 4. Run the full verification suite. 5. Update
`CHANGELOG.md`. 6. Phase gate review (real command output, screenshots, axe + bench
results) before advancing. Never claim done without verification evidence.
