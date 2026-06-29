# Calendar libraries — competitive analysis & synthesis

This document records the discovery phase that precedes the design of this library. We
cloned and dissected three existing Angular calendars, scored each against a fixed rubric,
and distilled the patterns worth being inspired by, the pitfalls to avoid, and the ideas
worth re-implementing cleanly. We **learn and take inspiration; we do not copy code.**
DayPilot Lite is Apache-2.0 and angular-calendar is MIT (we may learn from both freely);
Syncfusion is commercial and was studied **from public documentation only** — never its
source — as a feature-completeness checklist.

The three references:

- **angular-calendar** (mattlewis92) — `angular-calendar` v0.32.x, MIT.
- **DayPilot Lite for Angular** — `@daypilot/daypilot-lite-angular` v5.9.0, Apache-2.0.
- **Syncfusion Scheduler** — `@syncfusion/ej2-angular-schedule` v3x, commercial.

---

## 1. Scoring rubric

Each library is scored 1–5 on ten dimensions: views & orientation flexibility; custom
templating; theming (how theme-agnostic); interactions (drag-move/create/resize, touch,
snap, keyboard); recurrence; performance (virtualization, large-dataset, change
detection); accessibility; modernity (signals/standalone/zoneless/SSR/Angular currency);
date model (adapter, timezone, i18n, RTL); and bundle/deps/license/code-quality/API.

---

## 2. angular-calendar (mattlewis92) — MIT

A mature month/week/day calendar. Its layout math lives in a separate, framework-free
package (`calendar-utils`), fed by a pluggable `DateAdapter`. Standalone-capable but
otherwise a 2018-era reactivity model.

| Dimension | Score | Justification |
|---|:--:|---|
| Views + orientation | 3 | Month/week/day only. Week is heavily parameterised (a "scheduler" is composed from week view) but there is **no native resource/agenda/year view and no orientation switch** — week is always day-columns × time-rows. |
| Templating | 4 | ~10 `TemplateRef` slots per view with well-shaped contexts. Powerful but verbose (every override is an `<ng-template>` wired by input, not content projection). |
| Theming | 3 | SCSS variables + Sass mixin (`cal-theme($overrides)`), ~13 tokens. **Compile-time only** — consumers must run Sass to re-skin; no runtime CSS-variable layer; Bootstrap-flavoured class names. |
| Interactions | 4 | Drag-move, drag-to-create, dual-edge resize, external drop, configurable snap, and a live `validateEventTimesChanged` veto. Pointer-based (touch works). **No keyboard drag/resize**; tooltips mouse-only. |
| Recurrence | 1 | **Not in the library.** A userland recipe expands RRULE in the `beforeViewRender` hook. Good pattern, zero implementation. |
| Performance | 2 | **No virtualization, no OnPush, no signals**, default change detection, full view recompute on `ngOnChanges`; O(n²) lane packing in places. Fine for hundreds of events, not thousands. |
| Accessibility | 3 | A DI-overridable `CalendarA11y` provider builds SR strings; `role=grid/row/gridcell`. But no roving-tabindex traversal, no keyboard path for drag/resize. SR-readable, not fully keyboard-operable. |
| Modernity | 2 | Standalone + `provideCalendar()` exist, but **zero `input()`/`signal`/`computed`**, manual `markForCheck()`, RxJS `Subject` refresh, zone-dependent, no explicit SSR. |
| Date model | 3 | **Best-in-class adapter abstraction** (~40-method `DateAdapter`, date-fns/moment/luxon/dayjs). i18n + auto RTL. But operates on native `Date` → **no real timezone**. |
| Bundle/deps/license/API | 4 | Lean deps, MIT, high code quality (TZ=UTC test runs, schematics). Date-adapter `exports` map is fiddly; only three view modules to tree-shake. |

**Does well:** the framework-agnostic `DateAdapter` contract (pure engine receives the
adapter as its first argument, so view math never imports a date library); the pure
view-model engine; the `beforeViewRender(period, viewModel)` decoration hook; DI-replaceable
provider services; the live drag/resize validation predicate.

**Does poorly:** no signals/OnPush/zoneless; imperative DOM measurement (`offsetWidth`,
`getComputedStyle`) that breaks SSR and forces reflows; no virtualization; timezone is
fiction; recurrence offloaded entirely; theming needs a Sass build; in-place mutation of
the view-model (fragile with immutable/signal data).

**Worth re-implementing (clean):** the `DateAdapter` contract — re-expressed as a TS
interface + `InjectionToken`, **widened to be timezone-aware from day one**; the all-day
**row lane-packing** algorithm (greedy interval-graph colouring → re-do with an interval
tree, O(n log n), immutable segments); the timed-event **side-by-side column packing**
(greedy left-packing + width back-fill → re-do with a sweep-line); the period-out hook
for async/lazy data; the validation-predicate + "preview is local, commit is an output"
separation, modelled as a `computed` over a `dragState` signal.

---

## 3. DayPilot Lite for Angular — Apache-2.0

A single imperative JS engine (~99 KB gzip, absolutely-positioned DOM) wrapped by a thin
Angular layer driven by one `[config]` object. Notable because the **resource timeline
(Scheduler) is free** in Lite, not Pro-gated.

| Dimension | Score | Justification |
|---|:--:|---|
| Views + orientation | 4 | Lite ships the **resource timeline** (resources-as-rows, time-on-X) **and** a resource calendar (resources-as-columns, time-on-Y), plus Day/Week/Month/Navigator. But orientation is a **different component**, not a toggle. |
| Templating | 2 | No `<ng-template>`. Customization via `onBeforeEventRender` mutation + an **`areas[]`** model (absolutely-positioned overlay boxes on events). Powerful but string/JSON-driven; you cannot drop design-system components into a cell. |
| Theming | 4 | Modern: themes are **CSS custom properties** (`--dp-*`) generated by an online designer. Low lock-in, but vendor-namespaced. |
| Interactions | 4 | First-class drag-move/create/resize with cancellable, async-capable *before* hooks (`preventDefault()`, `async`+`loaded()`), snap via `snapToGrid` + `cellDuration`. |
| Touch | 4 | Real touch in the engine (`tapAndHold`, `pointerdown`, touch-visible areas). Mature for a free lib. |
| Recurrence | 1 | **None in Lite.** Pro-gated. |
| Performance | 4 | Progressive row/event rendering, render cache + sweeping, scroll debouncing, `ResizeObserver`. Built for big grids. CD into the widget is manual `JSON.stringify` diffing. |
| Accessibility | 2 | Some `aria-label`/`role`, `keydown` listeners, but no keyboard DnD, no focus management, no roving-tabindex. Absolutely-positioned divs are hostile to SR. |
| Modernity | 3 | Accepts signal-or-plain config via an `effect()` bridge, but components are **NgModule (not standalone)**, legacy `@Input` + `ngDoCheck`, UA-sniffing + direct `document` access → not SSR/zoneless-clean. |
| Date model | 3 | Own immutable `DayPilot.Date`, i18n via `Locale.register`. **No real timezone** (naive wall-clock). **RTL only on Calendar**, not Scheduler. |
| Bundle/deps/license/API | 4 | ~99 KB gz, zero runtime deps, Apache-2.0, fully typed. **Single non-splittable bundle** (month-only app still pays for Scheduler). |

**Pro-gated / absent in Lite** (most painful for a dispatch board): collapsible/grouped
resource tree, frozen first column, **now indicator**, recurrence, external cross-control
drag-and-drop, RTL on the Scheduler, undo/redo, PDF/print export.

**Worth re-implementing (clean):** the **pixel↔time projection layer** as the core
timeline primitive (`(start,end,resource) → {left,width,top}` and reverse
`getDate(pixels)`), rendered with Angular `@for` + `transform: translate()` +
`contain: strict`, virtualized with CDK; **multi-level time headers as a declarative data
array** (`[{groupBy:'Month'},{groupBy:'Day'},{groupBy:'Hour'}]`); the **before/after
interaction protocol** with `async` + `loaded()` + `preventDefault()`; the **`areas[]`
overlay model** for declarative interactive zones on event cards (re-expressed as Angular
directives); the CSS-custom-property theme contract; progressive/sweepable-cache rendering.

---

## 4. Syncfusion Scheduler — commercial (docs only; feature checklist)

A ~decade-developed commercial component with a very large feature surface. We treat it as
the bar a mature scheduler sets, and tag each capability for our scope.

**Highlights (12 view modes incl. five timeline variants):** Day/Week/Work-Week/Month/
Year/Agenda/Month-Agenda + Timeline Day/Week/Work-Week/Month/Year; custom interval views.
**Resources:** multi-level grouping/nesting, swimlanes, per-resource work hours/days,
`allowGroupEdit`, dynamic add/remove, resource header templates. **Recurrence:** RFC 5545
RRULE, a standalone recurrence-editor control, exceptions, and three-way edit (this /
this-and-following / entire series) with automatic exception bookkeeping. **Timezone:**
scheduler-level + per-event `startTimezone`/`endTimezone`, IANA, UTC mode. **Interactions:**
drag/drop incl. cross-resource, external drag-in, multi-drag, auto-scroll/auto-navigate,
resize incl. timeline. **Templates:** ~12 slots. **Performance:** timeline virtual
scrolling + lazy loading (server gets visible resource IDs + date range). **A11y:** WCAG
2.2, documented keyboard map. **Editor/data:** quick-info popup, editor dialog, "+ more"
overflow, all-day/spanned events, **block-out** (`isBlock`), read-only, **overlap/conflict
detection** (`allowOverlap:false`), custom fields, CRUD API, Excel/CSV/ICS export+import,
print, current-time indicator, work-hours highlight.

**Tagged for our v1** (everything in Syncfusion's surface is now in-scope for v1 — we match
or beat the mature bar; nothing is deferred):
- **Must-match (v1):** Day/Week/Work-Week/Month/**Year** + Timeline-Day/Week/**Year** +
  Agenda; multi-level resources + swimlanes; RRULE + editor + 3-way edit/exceptions;
  drag/drop incl. cross-resource + external drag-in; resize with snap; **inline editing**
  (single-click title edit); now-indicator; work-hours highlight; timescale; block-out &
  read-only; overlap/conflict detection; quick-info + editor + "+ more"; **print / print-to-PDF**;
  **adaptive/responsive layout incl. mobile drawer**; full keyboard map; theme-agnostic;
  signals + zoneless + SSR.
- **Should-match (v1):** timezone (scheduler + per-event, day-one in the model) + a
  **configurable timezone-picker collection** (host restricts/orders the IANA subset);
  Month-Agenda; virtual scroll + lazy loading; ICS import/export; Excel/CSV export; RTL +
  i18n; **non-Gregorian calendar systems (e.g. Islamic/Hijri, Buddhist, Japanese) via the
  pluggable date adapter + `Intl` calendar support**; per-resource work hours; custom
  interval views; header-rows; tooltips; multi-drag.
- **Deferred (post-v1, niche):** none from Syncfusion's documented surface — the items
  previously parked (Year & Timeline-Year, adaptive drawer UI, inline editing, print,
  custom timezone-collection editing, Islamic/non-Gregorian calendars) are all promoted into
  v1 above.

**Where we can be better:** free/OSS vs paid; signals + zoneless + SSR vs imperative
`dataBind`; theme-agnostic CSS custom properties vs heavy prebuilt themes that fight
specificity; native Angular template projection vs string/HTMLElement templates;
tree-shakable entry points vs monolith; lean `Intl`/`Temporal`/adapter dates vs bundled
CLDR; **virtual scroll extended to vertical views** (their documented gap); **PDF export**
(they lack it); clean axe in multi-resource mode (they admit complex-table warnings).

**Keyboard map to adopt as our baseline:** focus-scheduler (Alt+J), Tab/Shift+Tab through
header → events, Enter (open), Esc (close), Arrows (cell nav), Shift+Arrow (multi-select),
Delete, Ctrl+Click (multi-select), Alt+1…6 (switch view), Ctrl+◀/▶ (prev/next period),
Home (first cell), Shift+Alt+Y (today), Shift+Alt+N (open editor). **We add:**
roving-tabindex across resource lanes, type-ahead resource jump, and `aria-live`-announced
drag/resize deltas.

---

## 5. Synthesis — what this means for our design

1. **Headless core, pure layout math.** Adopt angular-calendar's strongest idea —
   framework-free, DOM-free view-model + layout functions that receive a date adapter as a
   parameter — but modernise to signal `computed`s and immutable geometry, with sweep-line /
   interval-tree packing (O(n log n)).
2. **Timezone-correct date adapter from day one.** Widen the adapter contract to carry an
   explicit IANA zone (default `date-fns` + `date-fns-tz`; Temporal later). This fixes the
   single biggest gap shared by both free libraries.
3. **Timeline as a pixel↔time projection primitive.** Take DayPilot's projection model and
   declarative multi-level time headers, render in idiomatic Angular (`@for` + transforms +
   `contain`), virtualised with CDK. **A single orientation toggle** (time on X or Y) — the
   thing neither free library offers cleanly — is a first-class config, not a separate
   component.
4. **Recurrence built in.** RRULE engine (RFC 5545) behind our own interface, with the
   standalone recurrence-editor control and three-way edit/exception semantics that
   Syncfusion proves users expect — but free, signal-based, and ours.
5. **Theme-agnostic by construction.** CSS custom properties (`--cal-*`) derived from a few
   color inputs via the in-house image editor's OKLCH `deriveTheme`/`applyTheme` machinery,
   with a per-status/per-event color map. Runtime re-skin, no Sass build, no global leak.
6. **Templates as native Angular projection** with typed `$implicit` contexts and a
   declarative interactive-zones model (DayPilot's `areas[]` re-imagined) — strictly more
   ergonomic than string/`TemplateRef`-by-input approaches.
7. **Interaction protocol with cancellable async hooks.** Borrow DayPilot's before/after +
   `preventDefault()` + async-commit protocol and angular-calendar's live validation
   predicate, modelled as signals: preview is a `computed` over a `dragState` signal; commit
   is an `output`. Custom pointer layer for precision/touch; CDK drag-drop for external
   drag-in.
8. **Performance + a11y as features, not afterthoughts.** Virtualization (incl. vertical
   views), progressive rendering with an evictable cache, explicit perf budgets; full
   keyboard operability incl. keyboard drag/resize and roving-tabindex — the areas where all
   three references are weakest, and therefore our differentiators.

These decisions feed the formal specification in `docs/SPEC.md` and the phased roadmap in
`docs/ROADMAP.md`.
