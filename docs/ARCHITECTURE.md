# Architecture

The library is organised in three strictly-separated layers so that correctness-critical logic
is pure, fast, and testable without a DOM, and the framework surface stays thin.

```
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION  — standalone components, OnPush, render only    │
│  cal-month-view · cal-year-view · cal-time-grid ·            │
│  cal-timeline-view · cal-agenda-view · cal-recurrence-editor  │
├─────────────────────────────────────────────────────────────┤
│ HEADLESS CORE — pure functions + signal computeds, NO DOM     │
│  date adapter contract · view-model builders · lane/column    │
│  packing · pixel↔time projection · recurrence expansion ·     │
│  conflict detection · theming derivation · interaction math   │
├─────────────────────────────────────────────────────────────┤
│ PLATFORM ADAPTERS — pluggable, tree-shakable secondary entries│
│  /date-fns (date engine) · /recurrence (rrule) · /export (ICS)│
└─────────────────────────────────────────────────────────────┘
```

## Principles

- **Headless core is pure.** Nothing under `core/` (except adapter implementations, which live
  in their own secondary entry points) imports a date library, `rrule`, or Angular DOM APIs.
  Builders receive a `DateAdapter` as a parameter; they return new immutable view-models and
  never mutate inputs. This makes the hard parts (DST, packing, recurrence, projection)
  unit-testable in isolation and reusable across views.
- **Signals everywhere.** Components expose `input()`/`model()`/`output()`, derive view-models
  with `computed`, and use `effect` only for imperative glue (applying the theme, focusing an
  inline editor, the now-tick). Zoneless and OnPush throughout; no `zone.js`.
- **Timezone-correct by construction.** An instant is `{ epochMs, zone }`. All view math runs in
  the display zone via the adapter; a DST day genuinely measures 23 h or 25 h. Recurrence is
  expanded in naive wall-clock space so an occurrence keeps its wall time across DST.
- **Geometry as fractions.** Packing and projection emit positions as fractions of the axis, so
  the DOM is measured only by `ResizeObserver`/`getBoundingClientRect` to convert fractions to
  pixels — never read synchronously mid-gesture — which keeps interactions smooth.
- **Pay for what you import.** The date engine, recurrence engine, and export helpers are
  separate entry points (`/date-fns`, `/recurrence`, `/export`); the core bundle pulls in none
  of them unless you do.

## The data flow

```
events + resources (consumer-owned, immutable)
        │
        ▼
[recurrence pre-pass]  expandRecurringEvents() — windowed, only if a recurrence adapter is present
        │
        ▼
[pure builder]  buildMonthView / buildTimeGridView / buildTimelineView / buildYearView / buildAgendaView
        │  (DateAdapter injected; output is an immutable view-model of fraction geometry)
        ▼
[component]  renders the view-model; emits outputs on interaction
        │
        ▼
outputs:  eventClicked · eventChanged (move/resize/create/inline-edit) · slotSelected ·
          daySelected · monthSelected · viewPeriodChanged · resourceToggled · externalDrop
        │
        ▼
consumer applies the change to its own store → feeds new immutable data back in
```

The library never mutates the consumer's data. Interactions produce an `EventChange` describing
the intended edit; the host commits it. A `validateChange` predicate can veto an in-flight
drag/resize before it commits (the preview snaps back).

## Extension points

- **Date adapter** — implement `DateAdapter` (default: `/date-fns`); Luxon/Temporal are drop-ins.
- **Recurrence adapter** — implement `RecurrenceAdapter` (default: `/recurrence`, RFC 5545).
- **Templates** — structural directives with typed `$implicit` contexts: `*calEventTemplate`,
  `*calCellTemplate`, `*calOverflow`, `*calResourceHeader`, `*calEventDetail`.
- **Services** — `CalCalendarA11y` (screen-reader strings) and `CalCalendarIntl` (visible labels)
  are DI-overridable for localisation.
- **Config** — `provideCalendar(withDateAdapter(...), withDefaults({...}))` seeds defaults; every
  default is also overridable per-instance via component inputs.

## Testing strategy

Pure modules (date adapter, packing, projection, recurrence, theming, view-model builders) carry
co-located unit tests run under `TZ=UTC` **and** a pinned DST zone, plus property-based tests for
packing invariants. Components are tested for rendering, outputs, keyboard, and signals
reactivity; the running app is verified visually in the browser (drag, recurrence, theming).
