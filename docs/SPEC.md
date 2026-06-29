# `@ascentsparksoftware/angular-calendar` — Technical Specification

**Status:** approved design spec (pre-build). **Target:** Angular 22, signals-first,
standalone, zoneless, OnPush, SSR-safe. **License:** MIT. Derived from the project charter
and `docs/calendar-competitive-analysis.md`.

This spec defines the architecture, module boundaries, public API surface, data and
view-model contracts, theming engine, interaction model, recurrence and timezone handling,
accessibility, security, performance budgets, and testing strategy. The atomic build tasks
in `docs/build-plans/` implement it phase by phase.

---

## 1. Architectural overview

Three concentric layers, strictly separated:

```
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION  (standalone components, OnPush, render only)   │
│  cal-calendar host · per-view components · event/cell tmpls  │
├─────────────────────────────────────────────────────────────┤
│ HEADLESS CORE (pure functions + signal computeds, NO DOM)    │
│  date adapter · timezone model · recurrence expansion ·      │
│  view-model builders · overlap/lane layout · projection math │
├─────────────────────────────────────────────────────────────┤
│ PLATFORM ADAPTERS (pluggable, tree-shakable)                 │
│  date-fns(+tz) adapter · rrule adapter · CDK glue · export   │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- The core never imports Angular DOM APIs, a date library, or `rrule` directly — it
  receives a `DateAdapter` and `RecurrenceAdapter` as parameters / injected tokens.
- Components hold no layout math. They read `computed` view models and emit `output`s.
- Everything that can be a pure function is a pure function with a co-located `*.spec.ts`.
- All state is signals. `effect` is used **only** for imperative glue: `applyTheme`,
  `scroll-to-now`, `ResizeObserver`/`IntersectionObserver` wiring, live-region announcements.

---

## 2. Package & module layout

Single published package, tree-shakable. Library project `projects/angular-calendar/`.
Primary entry `@ascentsparksoftware/angular-calendar`; heavy/optional features behind
secondary entry points.

```
src/
  public-api.ts                      # the semver surface (the law)
  lib/
    core/
      date-adapter/                  # DateAdapter interface + token + ZonedDateTime model
      recurrence/                    # RecurrenceAdapter interface + token + expansion
      model/                         # CalendarEvent, CalendarResource, value types
      view-model/                    # pure builders: month/week/day/timeline/agenda
      layout/                        # lane packing (interval tree), pixel↔time projection
      time/                          # working hours, slots, now-tick service
      config/                        # provideCalendar() + CalendarConfig token
    theme/                           # oklch.ts color.ts tokens.ts derive-theme.ts apply-theme.ts
    a11y/                            # CalendarA11y provider, keyboard maps, live announcer glue
    i18n/                            # CalendarIntl provider (labels/formats), RTL helpers
    interactions/                    # pointer drag/create/resize engine + dragState signals
    components/
      calendar/                      # <cal-calendar> host (view switch, nav, toolbar)
      month-view/  week-view/  day-view/  timeline-view/  agenda-view/
      event/  now-indicator/  all-day-band/  overflow-popover/  resource-header/
    directives/                      # cal-event-template, cal-cell-template, cal-area (zones)
    testing/                         # fake adapters & harness helpers (secondary entry: /testing)
  recurrence-editor/                 # secondary entry: /recurrence-editor (standalone control)
  date-fns/                          # secondary entry: /date-fns (default adapter)
  export/                            # secondary entry: /export (ICS + PDF/print)
```

Secondary entry points (each its own `ng-package.json`): `/date-fns`, `/recurrence-editor`,
`/export`, `/testing`. Consumers pay only for what they import.

---

## 3. Core data model (public types)

```ts
/** Library-internal instant: a wall-clock value bound to an explicit IANA zone. */
export interface ZonedDateTime {
  readonly epochMs: number;        // absolute instant (UTC ms) — the source of truth
  readonly zone: string;           // IANA zone id, e.g. 'America/New_York'
}

export interface CalendarEvent<TMeta = unknown> {
  readonly id: string;
  readonly start: Date | ZonedDateTime;   // adapter normalises to ZonedDateTime
  readonly end?: Date | ZonedDateTime;     // omitted ⇒ point/zero-duration
  readonly allDay?: boolean;
  readonly title?: string;                 // plain text only; never rendered as HTML
  readonly resourceIds?: readonly string[];// which resource lane(s) it belongs to
  readonly status?: string;                // key into the statusColors map
  readonly recurrenceRule?: string;        // RFC 5545 RRULE string
  readonly recurrenceExceptions?: readonly (Date | ZonedDateTime)[];
  readonly recurrenceId?: string;          // links a detached occurrence to its series
  readonly editable?: boolean;             // per-event override of global editability
  readonly resizable?: { beforeStart?: boolean; afterEnd?: boolean };
  readonly draggable?: boolean;
  readonly isBlock?: boolean;              // unavailable/block-out time (non-bookable)
  readonly isReadonly?: boolean;
  readonly cssClass?: string;
  readonly meta?: TMeta;                   // arbitrary consumer payload (typed via generic)
}

export interface CalendarResource<TMeta = unknown> {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;              // tree grouping (region → team → tech)
  readonly expanded?: boolean;
  readonly color?: string;                 // optional per-resource accent
  readonly workHours?: readonly WorkingHours[];
  readonly cssClass?: string;
  readonly meta?: TMeta;
}

export interface WorkingHours {
  readonly daysOfWeek: readonly number[];  // 0=Sun … 6=Sat
  readonly startMinutes: number;           // minutes from midnight
  readonly endMinutes: number;
}

export type CalendarViewName =
  | 'month' | 'week' | 'work-week' | 'day'
  | 'year'                                   // 12-month overview; click a day → drill in
  | 'timeline'                               // resource × time (day/week range)
  | 'timeline-year'                          // resource × time over a full-year axis
  | 'agenda';

export type TimeAxisOrientation = 'horizontal' | 'vertical'; // time on X vs Y

/** Calendar system for display + arithmetic. Default 'gregory'. */
export type CalendarSystem =
  | 'gregory' | 'islamic' | 'islamic-umalqura' | 'buddhist' | 'japanese' | 'persian';
```

**Identity & immutability:** events/resources are treated as immutable; the consumer owns
the data, the library never mutates it. Change is communicated via `output`s; the consumer
applies the change to its own store and feeds new immutable data back in. `trackBy` is by
`id` everywhere.

---

## 4. Date adapter (timezone-correct from day one)

```ts
export interface DateAdapter {
  // construction / normalisation
  toZoned(value: Date | ZonedDateTime, zone: string): ZonedDateTime;
  now(zone: string): ZonedDateTime;
  // arithmetic (all return new values; never mutate)
  addMinutes(d: ZonedDateTime, n: number): ZonedDateTime;
  addDays(d: ZonedDateTime, n: number): ZonedDateTime;
  addMonths(d: ZonedDateTime, n: number): ZonedDateTime;
  // boundaries (DST-correct, zone-aware)
  startOfDay(d: ZonedDateTime): ZonedDateTime;
  endOfDay(d: ZonedDateTime): ZonedDateTime;
  startOfWeek(d: ZonedDateTime, weekStartsOn: number): ZonedDateTime;
  startOfMonth(d: ZonedDateTime): ZonedDateTime;
  // queries
  differenceInMinutes(a: ZonedDateTime, b: ZonedDateTime): number;
  isSameDay(a: ZonedDateTime, b: ZonedDateTime): boolean;
  getDayOfWeek(d: ZonedDateTime): number;
  getMinutesIntoDay(d: ZonedDateTime): number;   // DST-aware; used by projection
  // calendar-system-aware display fields (default 'gregory')
  getEra(d: ZonedDateTime, system: CalendarSystem): { year: number; month: number; day: number; eraName?: string };
  // formatting (locale + zone + calendar-system aware)
  format(d: ZonedDateTime, pattern: string, locale: string, system?: CalendarSystem): string;
}

export const DATE_ADAPTER = new InjectionToken<DateAdapter>('cal.DateAdapter');
export function provideDateFnsAdapter(): EnvironmentProviders; // default, from /date-fns
```

- **Default adapter** (`/date-fns`) is built on `date-fns` + `date-fns-tz`. A Luxon and a
  `Temporal` adapter are future drop-ins implementing the same interface.
- The model of record for an instant is `epochMs` (absolute) + `zone`. All view math runs
  in the **display zone** (scheduler-level `timezone` input, default the host's resolved
  zone). DST gaps/overlaps are handled by the adapter; `getMinutesIntoDay` is the single
  DST-correct primitive the pixel projection relies on (never `getTimezoneOffset` math).
- **Non-Gregorian calendar systems** (Islamic/Hijri, Buddhist, Japanese, Persian, …) are a
  **display + labelling** concern, not a storage concern: the absolute instant is always
  `epochMs`; only the rendered year/month/day labels and the month-grid headers change. The
  adapter resolves them via `Intl.DateTimeFormat` with the requested `calendar` option
  (`getEra`/`format`). Layout math (lanes, projection) is unaffected. The scheduler exposes
  a `calendarSystem` input (default `'gregory'`).

---

## 5. Recurrence (RFC 5545, in v1)

```ts
export interface RecurrenceAdapter {
  /** Expand a rule into concrete occurrences within [windowStart, windowEnd]. */
  expand(input: {
    rule: string;                              // RRULE
    dtStart: ZonedDateTime;
    exceptions: readonly ZonedDateTime[];
    windowStart: ZonedDateTime;
    windowEnd: ZonedDateTime;
    zone: string;
  }): ZonedDateTime[];
  /** Parse/serialize for the editor control. */
  parse(rule: string): RecurrenceParts;
  serialize(parts: RecurrenceParts): string;
}

export type RecurrenceEditScope = 'this' | 'this-and-following' | 'all';

export const RECURRENCE_ADAPTER = new InjectionToken<RecurrenceAdapter>('cal.Recurrence');
export function provideRruleAdapter(): EnvironmentProviders; // from /recurrence-editor or core
```

- Expansion is **windowed** to the visible period (computed from the view model) so an
  infinite rule never materialises unbounded.
- Three-way edits emit a structured `RecurrenceEditRequest` output `{ scope, occurrence,
  changes }`; the library provides pure helpers to compute the resulting parent rule +
  exception-date bookkeeping, but the consumer commits the data.
- A standalone `<cal-recurrence-editor>` (secondary entry `/recurrence-editor`) edits a
  rule independent of the grid; signal `model()` two-way binding on the RRULE string.

---

## 6. View-model contracts (pure builders)

Each builder is a pure function `(adapter, args) => ViewModel`, exposed also as a signal
`computed` inside a `CalendarViewModel` service. Representative shapes:

```ts
export interface ViewPeriod { start: ZonedDateTime; end: ZonedDateTime; zone: string; }

export interface MonthViewModel {
  readonly period: ViewPeriod;
  readonly weeks: ReadonlyArray<{ days: readonly MonthDay[] }>;
}
export interface MonthDay {
  readonly date: ZonedDateTime;
  readonly inMonth: boolean; readonly isToday: boolean; readonly isWeekend: boolean;
  readonly events: readonly PositionedChip[];   // lane-packed multi-day spans
  readonly overflowCount: number;               // drives "+N more"
}

export interface YearViewModel {                     // 12-month overview
  readonly year: number;                             // in the active calendar system
  readonly months: readonly YearMonth[];             // 12 compact month grids
}
export interface YearMonth {
  readonly label: string;                            // localized month name
  readonly days: readonly YearDay[];                 // compact day cells
}
export interface YearDay {
  readonly date: ZonedDateTime;
  readonly inMonth: boolean; readonly isToday: boolean;
  readonly eventCount: number;                       // density dot / heat intensity
}

export interface TimeGridViewModel {                 // week / work-week / day
  readonly period: ViewPeriod;
  readonly orientation: TimeAxisOrientation;
  readonly columns: readonly TimeColumn[];           // days (vertical) or time (horizontal)
  readonly slotMinutes: number;
  readonly allDay: readonly PositionedChip[];        // all-day band rows
  readonly nowOffset: number | null;                 // px/fraction along time axis
}
export interface PositionedEvent {
  readonly event: CalendarEvent; readonly lane: number; readonly laneCount: number;
  readonly startOffset: number; readonly span: number; // immutable geometry (fractions)
}

export interface TimelineViewModel {                 // resource × time
  readonly period: ViewPeriod;
  readonly orientation: TimeAxisOrientation;          // default horizontal
  readonly headerRows: readonly TimeHeaderRow[];      // declarative multi-level headers
  readonly resourceRows: readonly ResourceRow[];      // flattened (tree honoured) lanes
  readonly nowOffset: number | null;
}
export interface ResourceRow {
  readonly resource: CalendarResource; readonly depth: number; readonly events: readonly PositionedEvent[];
  readonly workingShade: readonly ShadeBand[];        // per-resource work hours / block-out
}
export interface TimeHeaderRow { readonly groupBy: 'year'|'month'|'week'|'day'|'hour'|'minute'; readonly cells: readonly TimeHeaderCell[]; }
```

**Layout algorithms (re-implemented clean, not copied):**
- **All-day / multi-day row packing:** sort by start asc then end desc; greedy first-fit
  into rows backed by an **interval tree**; emit immutable `{lane, startOffset, span}`. O(n log n).
- **Timed side-by-side column packing:** sweep-line over interval endpoints to find overlap
  clusters once; assign each event the lowest free lane; `laneCount` per cluster; width
  back-fill to consume trailing free lanes. Immutable geometry, fraction-based (DOM-unit-free).
- **Pixel↔time projection** (timeline + time-grid): `offset(t) = differenceInMinutes(t,
  periodStart) / totalMinutes`; `width(ev) = duration/totalMinutes`; inverse
  `timeAt(fraction)` for pointer → time. Rendered via CSS `transform`/`%`; DOM is measured
  only by `ResizeObserver` to convert fractions → px, never read mid-gesture.

---

## 7. Theming engine (`--cal-*`, OKLCH)

Mirrors the in-house image editor. See `CLAUDE.md` §5 and `docs/THEMING.md` (to be authored
in Phase 8). Public theming API exported from `public-api.ts`:

```ts
export type CalThemeMode = 'light' | 'dark';
export interface CalThemeTokens { /* Record<`--cal-${string}`, string> */ }
export function deriveTheme(base: string, accent: string, mode: CalThemeMode,
                           eventColors?: Record<string,string>): CalThemeTokens;
export function applyTheme(host: HTMLElement, tokens: CalThemeTokens): void;
```

- Color tokens (derived): `bg, surface, surface-2, surface-sunk, ink, ink-700, ink-muted,
  ink-faint, line, line-strong, accent, accent-ink, accent-hover, accent-soft,
  accent-soft-ink, ring, scrim, success, warning, error`. Calendar-specific:
  `now-line, today-bg, selection, grid-line, allday-bg`, plus per-status triplets
  `event-<key>` / `event-<key>-ink` / `event-<key>-soft`.
- Static tokens: `radius-{sm,md,lg,pill}, slot-h, header-h, font-mono`.
- `deriveTheme` runs each status/event color through the accent-derivation pipeline so every
  category gets a guaranteed-AA on-color in both modes. Invalid hex → warn + fall back to
  defaults (non-fatal). The host component wires `computed(theme)` + one `effect(applyTheme)`.
- Component CSS reads **only** `var(--cal-*)`; `:host { container-type: inline-size }`.

---

## 8. Public component & provider API

```ts
// host component
@Component({ selector: 'cal-calendar', standalone: true, changeDetection: OnPush })
export class CalCalendar<TMeta = unknown> {
  // data
  events = input.required<readonly CalendarEvent<TMeta>[]>();
  resources = input<readonly CalendarResource[]>([]);
  // view
  view = model<CalendarViewName>('week');
  viewDate = model<Date | ZonedDateTime>(/* today */);
  orientation = input<TimeAxisOrientation>('vertical');
  // time window
  timezone = input<string>(/* resolved host zone */);
  calendarSystem = input<CalendarSystem>('gregory'); // Gregorian / Islamic / Buddhist / …
  timezonePickerZones = input<readonly string[]>();   // restrict/order the IANA picker subset
  slotMinutes = input<number>(30);
  dayStartMinutes = input<number>(0);
  dayEndMinutes = input<number>(1440);
  weekStartsOn = input<number>(/* locale default */);
  workHours = input<readonly WorkingHours[]>([]);
  // theme
  baseColor = input<string>(); accentColor = input<string>(); themeMode = input<CalThemeMode>('light');
  statusColors = input<Record<string,string>>({});
  // interactions
  editable = input<boolean>(true); snapMinutes = input<number>(15);
  inlineEdit = input<boolean>(true);                  // single-click title edit in place
  // responsive / adaptive
  adaptive = input<boolean>(true);                    // mobile drawer + single-resource layout
  adaptiveBreakpoint = input<number>(768);            // px width below which adaptive engages
  // outputs (consumer commits to its own store)
  eventClicked = output<{ event: CalendarEvent<TMeta> }>();
  eventChanged = output<EventChange<TMeta>>();         // move/resize/create/inline-edit commit
  rangeSelected = output<{ start: ZonedDateTime; end: ZonedDateTime; resourceId?: string }>();
  recurrenceEdit = output<RecurrenceEditRequest<TMeta>>();
  viewPeriodChanged = output<ViewPeriod>();            // for lazy/async loading
  validateChange = input<(c: EventChange<TMeta>) => boolean>();  // live drag/resize veto
  // imperative API (host owns data; these are render/utility helpers)
  print(opts?: PrintOptions): void;                   // print / print-to-PDF the active view
}

export interface PrintOptions {
  readonly orientation?: 'portrait' | 'landscape';
  readonly title?: string;
  readonly range?: { start: Date | ZonedDateTime; end: Date | ZonedDateTime };
}

export function provideCalendar(...features: CalendarFeature[]): EnvironmentProviders;
// withDateAdapter(provider), withRecurrence(provider), withLocale(intl),
// withDefaults(config), withVirtualization(opts), withPrint(opts)
```

- **Templating** via structural directives + content projection with typed `$implicit`:
  `*calEventTemplate`, `*calCellTemplate`, `*calTimeSlotTemplate`, `*calResourceHeader`,
  `*calAllDayItem`, `*calOverflow`, `*calNowIndicator`. Each ships a sensible default.
- **Interactive zones on cards** via `cal-area` directive (DayPilot `areas[]` re-imagined):
  declarative `[calArea]="{ action: 'resize-end' | 'move' | ..., visibility: 'hover'|'touch' }"`.

---

## 9. Interaction model

- **Custom pointer engine** (`interactions/`) handles in-grid **move / drag-create /
  resize** using Pointer Events (unifies mouse/touch/pen): long-press to initiate on touch,
  `setPointerCapture`, snap to `snapMinutes`, sub-pixel projection via the core math.
- **Live preview is a `computed`** over a `dragState` signal (no in-place mutation of
  events). On pointer-up, a `validateChange` predicate runs; if it passes, an
  `eventChanged`/`rangeSelected` output fires for the consumer to commit; else the preview
  snaps back.
- **Cancellable async protocol:** outputs carry a `confirm(promise)`/`preventDefault()`
  handle so optimistic UI can await a backend round-trip (DayPilot-style).
- **External drag-in** (unassigned-jobs list → a resource lane) uses **CDK DragDrop**
  interop; drop resolves to `(time, resourceId)` via inverse projection and fires
  `eventChanged` with `kind: 'create'`.
- **Inline edit:** when `inlineEdit` is on, a single click (or F2 / Enter) on an event's
  title turns it into an in-place text field; commit (Enter/blur) fires `eventChanged` with
  `kind: 'inline-edit'`, Escape cancels. Text-only (no `innerHTML`); the consumer commits.
- **Keyboard:** every interaction is keyboard-operable — roving-tabindex grid navigation,
  arrow-key cell traversal, Enter/Space to act, and **keyboard drag/resize** (grab with a
  key, move by arrows in `snapMinutes` steps, drop with Enter), with `aria-live` delta
  announcements. Full shortcut map per `docs/calendar-competitive-analysis.md` §4.

---

## 10. Accessibility (WCAG 2.2 AA)

- Correct ARIA: month = `grid`/`row`/`gridcell`; agenda = `list`/`listitem`; timeline =
  `grid` with row/column headers; toolbar = `toolbar`; popovers via CDK overlay with focus
  trap + restore.
- Roving tabindex; arrow navigation; documented keyboard map (§9); keyboard drag/resize.
- `CalCalendarA11y` DI-overridable provider centralises every SR string via `Intl`.
- Reduced-motion honoured (`prefers-reduced-motion`); focus-visible rings from `--cal-ring`.
- **Gate:** axe-core returns **zero violations** in every view incl. multi-resource timeline.

---

## 11. Internationalisation / RTL

- `CalCalendarIntl` provider supplies labels + format patterns; locale-aware via `Intl` and
  the adapter's `format`. Configurable `weekStartsOn`, 12/24h.
- **RTL** in **every** view including the timeline (an explicit improvement over both free
  references). Logical CSS properties + `dir`-aware projection.
- **Non-Gregorian calendar systems** via the `calendarSystem` input (Gregorian default;
  Islamic/Hijri, Buddhist, Japanese, Persian through `Intl` calendar support in the adapter).
  Month/year labels and the month- and year-view grids honour the system; the stored instant
  and all layout math stay absolute (§4).
- **Configurable timezone picker:** the editor/quick-info timezone control draws from
  `timezonePickerZones` when supplied (host restricts and orders the IANA subset), else a
  sensible default list; per-event `startTimezone`/`endTimezone` are surfaced here.
- **Responsive / adaptive layout:** below `adaptiveBreakpoint` (container-query driven, not
  viewport) the host collapses to a mobile-friendly layout — a single-resource view with a
  resource **drawer**, swipe navigation, and month→agenda fallback on narrow widths.

---

## 12. Security

- Caller text (`title`, etc.) is rendered as **text nodes only** — never `innerHTML`.
- No `eval`/`Function`/`setTimeout(string)`. Trusted-Types compatible; works under a strict
  CSP (no inline-style injection beyond the host's own `--cal-*` custom properties, which
  are values, not script). `SECURITY.md` documents the trust boundary (consumer-supplied
  templates are the consumer's responsibility).
- Runtime deps declared as `peerDependencies` where they are framework, `dependencies`
  where they are genuine engine libs (`date-fns`, `date-fns-tz`, `rrule`); `npm audit`
  triaged shipped-vs-build per `internal_docs/github_standard.md`.

---

## 13. Performance budgets

- **Initial view-model build** (month/week with ≤500 events): **< 4 ms** on a mid-tier
  laptop (measured in a Vitest bench).
- **Timeline with 100 resources × 2,000 events**: virtualized; only visible rows/cells in
  the DOM; scroll stays **≥ 55 fps**; layout recompute on scroll **< 8 ms/frame**.
- **No layout thrash:** geometry is fraction-based; DOM measured only via `ResizeObserver`
  (batched), never read synchronously mid-gesture.
- **Drag/resize:** preview update **< 4 ms/frame**; pointer-to-paint **< 1 frame**.
- **Bundle:** core (month/week/day) gzip **< 45 KB** excluding the date adapter; each
  secondary entry independently tree-shakable. CI asserts size with a budget check.
- All budgets are encoded as failing CI assertions (bench + bundle-size), not aspirations.

---

## 14. Testing strategy

- **Unit (Vitest):** every pure function (adapter, recurrence expansion, all layout/packing,
  projection, theme derive/oklch/color) with co-located `*.spec.ts`; run with `TZ=UTC` and
  also pinned non-UTC zones to catch DST bugs; property-based tests for packing invariants
  (no two same-lane events overlap; geometry within bounds).
- **Component tests:** rendering, template overrides, keyboard nav, signals reactivity.
- **a11y:** axe assertions per view (zero violations gate).
- **e2e (Playwright):** drag/create/resize incl. **touch emulation**, view switching,
  recurrence edit flows, external drag-in; **visual-regression screenshots** per view × mode
  (light/dark) × orientation × RTL.
- **Bench:** perf-budget assertions (§13).
- **Coverage:** ≥ 90% on the core; pure layout/date/recurrence modules ≥ 95%.

---

## 15. Out of scope for v1 (host-owned)

Backend/persistence, RBAC, realtime transport. The library exposes change outputs +
optimistic async hooks; the host provides events and commits changes. Undo/redo,
mini-month navigator, and the field-service preset layer are post-v1 / consumer concerns
(the field-service look ships as **demos/presets**, not core).

**In v1 (promoted from the earlier deferred list):** Year view and Timeline-Year view;
single-click inline editing; print / print-to-PDF; non-Gregorian calendar systems
(Islamic/Hijri, Buddhist, Japanese, Persian); a configurable timezone-picker collection;
and responsive/adaptive (mobile drawer) layout — all specified above (§3, §4, §6, §8, §9,
§11) and scheduled across the phases in `docs/ROADMAP.md`.
