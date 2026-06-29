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
**"+N more" overflow popover** done — clicking the indicator opens an accessible `role="dialog"`
popover listing **every** event covering that day (start-sorted, status-dot + localized time + title),
sourced from a new pure `MonthDay.dayEvents` builder field so hidden events stay reachable; focus
moves into the popover on open and returns to the trigger on Escape/close; backdrop + outside-click
dismiss; **verified via UI** (June 15 "+1 more" → all four events listed) and **axe-zero with the
popover open** (added to the e2e gate). Dependency-free (matches the codebase's native-DnD choice).
**Remaining:** none for the overflow popover;
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

## Phase 5 — Interactions 🟡 IN PROGRESS

**Done:** pure drag-preview engine (`computeDragTimes` — move/resize/create snap math, min-duration,
direction-agnostic create; property-tested) + `EventChange`/`EventChangeRequest` model.
**Drag-move + edge-resize on the time-grid** via Pointer Events: `dragState` signal, live `computed`
preview (no event mutation), snap to `snapMinutes`, `validateChange` veto, tap-vs-drag threshold,
`setPointerCapture` (guarded), `touch-action:none` for touch. **Drag-create** on the time-grid (empty-grid drag → new event with dashed ghost preview, snap, slot
click → `slotSelected`). **Inline title edit** (double-click → field, Enter commits, Escape cancels).
**Keyboard grab-and-move/resize** (Enter grab, arrows move, Shift resize, Esc cancel — a11y).
**External drag-in** on the timeline (`externalDrop` output resolves time + resource + payload;
dep-free native DnD) — **verified via UI**: an unassigned job dragged onto a tech's lane became a
scheduled job at the drop time and left the strip. **In-grid block drag on the timeline** (Pointer
Events): drag a dispatch block to **reschedule along the time axis and reassign across resource
lanes** in one gesture — `drag` signal + live `translateX` preview, snap to `snapMinutes`,
tap-vs-drag threshold, `setPointerCapture` (guarded), `touch-action:none`, duration preserved, drop
resolves the target lane via `elementFromPoint` (SSR/jsdom-guarded) and emits `eventChanged`
`kind:'move'` with `{start,end,resourceId}`. **Verified via real mouse drag**: "AC install" dragged
from Alice 09:00 to Bob's lane at 14:30 reassigned + rescheduled (avatar followed). All pointer
flows verified via real mouse drag. **228 unit tests.** **Remaining:** touch long-press tuning;
edge-resize on timeline blocks (move shipped).

Custom Pointer-Events engine: drag-move, drag-create, edge resize, snap, touch long-press,
`dragState` signal + `computed` preview, `validateChange` veto, cancellable async commit
outputs, CDK external drag-in, full keyboard drag/resize + roving-tabindex. Plus
**single-click inline editing** of an event title (F2/Enter to edit, Escape to cancel,
text-only, commit via `eventChanged` `kind:'inline-edit'`).

**Exit:** Playwright e2e incl. touch emulation for move/create/resize **and inline-edit**
across all views; keyboard-only operability verified; axe-clean.

## Phase 6 — Recurrence + advanced 🟡 IN PROGRESS

**Done:** `RecurrenceAdapter` contract + `RECURRENCE_ADAPTER` token (core, pure) and the
default RFC 5545 `rrule` engine in the tree-shakable `/recurrence` entry — **windowed,
DST-stable** expansion (naive-wall-clock space; a 09:00 weekly meeting stays 09:00 across DST),
exceptions, `parse`/`serialize` round-trip (Sun=0 ↔ rrule Mon=0 weekday mapping). Pure
`expandRecurringEvents` pre-pass (concrete occurrences, preserved duration, `recurrenceId`).
Three-way edit helpers: `addRecurrenceException` (this/delete) and `splitSeriesAt` (this-and-
following, with a real `UNTIL`-naive-space bug fixed via cynical testing). `detectConflicts`
(resource-aware sweep) + `filterByStatus`. **Recurrence wired into month + week + day + timeline
views** (probe-window + expand) — **verified via UI** (a `FREQ=WEEKLY;BYDAY=WE` event renders on
every Wednesday). **`<cal-recurrence-editor>`** standalone control done (signal `model()` on the
RRULE string; frequency/interval/weekday/end; live preview; parse/serialize). Native `title`
tooltips on time-grid + timeline events (full title + localized time range). **Three-way
"edit which occurrences?" flow** — editing a recurring occurrence (it carries `recurrenceId`)
raises a This / This-and-following / All prompt; the demo applies it through the pure core helpers
(`addRecurrenceException` for *this* → series exception + detached concrete event; `splitSeriesAt`
for *following* → `UNTIL`-terminated head + new tail series; series mutation for *all*) —
**verified via UI** (renamed one Wednesday: *All* relabelled every Wednesday; *This* relabelled
only that date and left the rest). **Density modes** — a `density` input (`'comfortable' |
'compact'`) on the time-grid: compact shrinks the hour-row height (3rem→2rem), all-day rows, and
type via `:host(.cal-tg--compact)` token overrides, so a dense day/week fits more on screen —
**verified via UI** (demo "Compact" toggle: the full 06:00–22:00 range fits where 06:00–19:00 did).
**201 unit tests** (TZ=UTC + DST). **Remaining:** none for density/tooltips (native `title` tooltips
+ the month overflow popover ship now).

**Exit:** recurrence expansion property-tested (DST-correct); editor e2e; 3-way edit flows;
overlap detection asserted.

## Phase 7 — A11y + i18n + RTL + timezone + calendar systems + adaptive + perf hardening 🟡 IN PROGRESS

**Done:** `CalCalendarA11y` (SR strings) from Phase 2; `CalCalendarIntl` provider for
DI-overridable visible labels (all-day / no-events / resources-header / "+N"), wired across all
views; roving-tabindex keyboard nav in month + year; reduced-motion in every component;
calendar systems supported by the adapter (`getEra`/`format`) and used by month/year/timeline
labels. **RTL verified via UI** — month mirrors correctly (weekday order, alignment, multi-day
spans, recurring events) thanks to logical CSS properties throughout. **Keyboard map fully
documented** (`docs/KEYBOARD.md`) and verified against the code: month/year roving arrows +
Home/End + Enter/Space; time-grid event grab-and-move (Enter/Space grab, arrows move, Shift+arrows
resize, Enter drop, Esc cancel) and **`F2` inline rename** (added so editing is keyboard-reachable,
not dblclick-only — verified via UI). **axe-zero gate across the full matrix** (all seven views ×
light/dark + the "+N more" popover) is a CI check via Playwright + axe-core. **Perf + bundle budgets
are CI assertions** — `perf-bench.spec.ts` (`toBeLessThan` ceilings on view-model builds, runs in
the vitest suite) + `check-bundle-size.mjs` gzip gate. **Remaining (scoped follow-ups):**
keyboard drag on the *timeline* (pointer drag ships; the time-grid has keyboard drag); large-fleet
**virtualization** (the view-models are pure + memoized off the render path, so moderate datasets
are fast; windowing 100×2000 needs a dedicated CDK-virtual-scroll pass against the frozen/sticky
timeline layout).

Full keyboard map, `CalCalendarA11y` strings, reduced-motion; `CalCalendarIntl`, locale,
12/24h, **RTL in every view incl. timeline**; per-event timezone surfacing + a
**configurable timezone-picker collection** (`timezonePickerZones`); **non-Gregorian
calendar systems** (Islamic/Hijri, Buddhist, Japanese, Persian) wired through every view via
the Phase-1 adapter primitives; **responsive/adaptive layout** (container-query driven
mobile drawer, single-resource collapse, swipe nav, month→agenda fallback); virtualization
extended to vertical views; perf budgets encoded as CI assertions.

**Axe-zero achieved (real-browser sweep):** ran axe-core 4.10 against the live rendered demo
(not jsdom) across **every view — month, week, day, timeline, agenda, year, week-rows — in both
light and dark**, iterating to **zero WCAG 2.0/2.1 A & AA violations**. Real bugs fixed, not
suppressed: the time-grid and timeline had **malformed grid ARIA** (gridcells without `row`
parents, rows without a grid container) — restructured to valid `grid → row → gridcell/columnheader`
(the time-grid all-day band gained a `gridcell` wrapper; the timeline groups each resource
header+lane into one `row` via a `display:contents` wrapper; the year mini-months wrap each week in a
`display:contents` `row` and drop all-blank trailing weeks). **Contrast** fixes that hold for *any*
theme: out-of-month / weekend / gutter / tick text moved off the decorative `--cal-ink-faint` onto
AA-guaranteed `--cal-ink-700`; the timeline "now" header-cell and agenda "today" heading no longer
use **raw `--cal-accent` as text** (which can't guarantee AA for an arbitrary accent) — they keep ink
text and mark state with an accent underline / rule instead.

**Adaptive done:** every view host is `container-type: inline-size`; agenda + year carry
`@container` breakpoints, and **month + time-grid now tighten at ≤640/≤420px** (smaller day
numbers, denser chips, condensed weekday rail) so they stay tappable on a phone without
horizontal scroll. The **month→agenda fallback** is demonstrated in the demo: a `ResizeObserver`
drives a `narrow` signal, and below 600px the dense month grid auto-degrades to the agenda list
with a "compact screen" status banner — **verified via UI** (390px → agenda + banner; 1200px →
month grid restored).

**Exit:** axe zero-violations gate across all views/modes/orientations/RTL **and calendar
systems and adaptive (mobile) layout**; timezone picker honours the restricted subset; all
perf budgets pass in CI; bundle-size budget passes.

## Phase 8 — Docs, Storybook, demo, optional token bridge, publish 🟡 IN PROGRESS

**Done:** `/export` secondary entry with **RFC 5545 ICS** (UTC/all-day/RRULE, escaping,
line-folding) and **RFC 4180 CSV** serialisation, both pure + unit-tested. **Print / print-to-PDF**
— pure `eventsToPrintHtml` (day-grouped agenda, zone/locale/12-24h aware, HTML-escaped, empty-state),
`CAL_PRINT_STYLES`, SSR-safe `printDocument` (opens + prints), and the injectable `CalPrintService`
+ `provideCalendarPrint(defaults)` (the `withPrint()` deliverable, located in `/export` so core stays
DOM-free) — plus `@media print` rules on month/time-grid/timeline (exact colours, hide live chrome,
page-break-friendly). **Excel export** — dependency-free SpreadsheetML 2003 (`eventsToExcelXml`,
typed `DateTime` cells, XML-escaped) that Excel/Sheets/LibreOffice open natively. **All export paths
verified through the demo UI** (Print → paginated agenda screenshot; CSV/Excel/ICS → real downloads
inspected: valid SpreadsheetML, RFC 4180, VCALENDAR). Public `docs/ARCHITECTURE.md` + `docs/THEMING.md`
(plus existing README/SECURITY/CONTRIBUTING/CODE_OF_CONDUCT/CHANGELOG from Phase 1) and
`docs/MIGRATION.md`. SSR-safe demo app exercising all seven views + export toolbar, with a
**fully token-driven shell**: the demo derives the `--cal-*` set from two colour inputs (base +
accent) plus light/dark and applies it to its own host, so the top bar, segmented view switcher,
filters and panel re-theme in lockstep with the calendar — change one swatch and the whole UI
follows (the image-editor theming contract). Live **base/accent swatches + custom pickers** and a
mode toggle; responsive top bar (scrollable view switcher, month→agenda fallback) — **verified via
UI** at desktop and 390px, light and dark, across multiple accent/base combinations.
**`withTokenBridge()`** — the optional design-token adapter: `applyTheme` takes an optional
`CalTokenBridge` overlay (re-applied after the derived theme so bridged `--cal-*` always win),
`CAL_TOKEN_BRIDGE` is injected by every view, and `withTokenBridge({ '--cal-accent': '--brand' })`
maps calendar tokens to a host's own design-system variables — **verified through the demo UI** (the
host `--brand` token recolours the calendar accent — today pill — to pink while status colours and
unbridged tokens keep their derived values). **CI-only release:** `release.yml` (tag-triggered
build→test→`npm publish --provenance`) + `RELEASING.md` runbook + `ci.yml`/`codeql.yml` present.
**Remaining:** Storybook (per-state, a11y addon, visual regression) and the multi-line
(20.x/21.x) repo hardening (per-branch CI check names, multi-target Dependabot, branch ruleset) —
both deferred until the maintenance branches are cut and the API stabilises.

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

## Phase 9 — Field-service proof surface (consumer demo) ✅ COMPLETE

**Done:** the demo app proves the API against the charter §1 requirements using only the public
surface — resource dispatch board (`<cal-timeline-view>`), 7-status theming via `statusColors`,
**rich consumer-defined job cards** via `*calEventTemplate` (title + status badge), **status
filters** via `filterByStatus`, now-indicator, off-hours/block-out shading, resource-tree
collapse — **all verified via UI** (rich cards render; toggling a status hides those jobs).
`docs/ADOPTION.md` documents the reference adoption pattern (preset lives in the consumer, not
core). **Unscheduled-jobs strip + external drag-in** wired in the demo — **verified via UI** (drag
an unassigned job onto a tech's lane → it schedules at the drop time and leaves the strip).
**Assignee-avatar card** — the dispatch-board job template now renders a coloured initials bubble
(deterministic per-tech hue) beside the title/status badge — **verified via UI** (AN/BR/CD avatars).
**Week-as-rows preset** — a "Week rows" demo view built purely on the public timeline API: one lane
per weekday with the week's timed events projected onto a shared single-day hour axis via a
**timezone-correct adapter remap** (`startOfWeek`/`getDayOfWeek`/`getMinutesIntoDay`/`addMinutes`),
recurrence materialised to concrete occurrences — **verified via UI** (Mon's four events + Wed's 1:1
land in the right lanes at the right hours). Also fixed the demo's invisible active-segment label
(`background: currentColor` resolved to the white text). **Remaining:** none — Phase 9 complete.

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
