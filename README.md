<div align="center">

# @ascentsparksoftware/angular-calendar

A modern, theme-agnostic **calendar & scheduler** for Angular — month, week, day, year,
agenda and a resource **timeline** — signals-first, standalone, zoneless, SSR-safe,
timezone-correct, with RFC 5545 recurrence and a touch-first drag/resize engine.

by&nbsp;<a href="https://ascentspark.com" target="_blank" rel="noopener"><img src="https://cdn.ascentspark.com/assets/images/asc-logo-full.svg" alt="Ascentspark" height="22" valign="middle"></a>

[![npm version](https://img.shields.io/npm/v/@ascentsparksoftware/angular-calendar.svg?color=dd0031)](https://www.npmjs.com/package/@ascentsparksoftware/angular-calendar)
[![downloads](https://img.shields.io/npm/dm/@ascentsparksoftware/angular-calendar.svg)](https://www.npmjs.com/package/@ascentsparksoftware/angular-calendar)
[![Angular 20 · 21 · 22](https://img.shields.io/badge/Angular-20%20%C2%B7%2021%20%C2%B7%2022-dd0031.svg)](https://angular.dev)
[![license MIT](https://img.shields.io/github/license/ascentspark/angular-calendar?color=3b82f6)](https://github.com/ascentspark/angular-calendar/blob/main/LICENSE)

**[✨ Features](#features)** &nbsp;·&nbsp;
**[🚀 Quick start](#quick-start)** &nbsp;·&nbsp;
**[🎨 Theming](#theming)** &nbsp;·&nbsp;
**[🧩 API](#api)** &nbsp;·&nbsp;
**[♿ Accessibility](#accessibility)** &nbsp;·&nbsp;
**[🔢 Versions](#versions)**

</div>

---

A complete scheduling toolkit you drop into an Angular app as standalone components. Render
your own events through the built-in views — `month`, `week`/`work-week`/`day`, `year`,
`agenda`, and a resource **timeline** (dispatch board) — bind your data as signal inputs, and
read interactions back as typed outputs. It targets **Angular 22, 21 and 20** (one package
major per Angular major), is signal-driven, standalone, `OnPush` and **zoneless** — no
`NgModule`, no `zone.js`.

Everything is **headless-first**: all date math, recurrence expansion, overlap-lane layout and
view-model construction are pure functions with no DOM, unit-tested in isolation, and exported
for advanced use. The presentational components render those view models and never compute them
inline. It is **timezone-correct from day one** (an explicit IANA zone travels through the whole
model — it never leans on the host's local `Date`), renders caller content as **plain text only**
(never `innerHTML`; Trusted-Types / strict-CSP clean), and derives its entire palette from a few
color inputs so it drops onto any brand in light or dark with **WCAG 2.2 AA** contrast guaranteed.

## Features

- **Seven views** — `month`, `week`, `work-week`, `day` (a shared time-grid), `year`, `agenda`,
  and a hierarchical resource **`timeline`** with a configurable time axis, collapsible resource
  groups, and working-hours / block-out shading.
- **Signals-first, standalone, zoneless, `OnPush`, SSR-safe.** `input()` / `model()` / `output()`,
  `computed` view models, `effect` only for imperative glue. No `NgModule`, no `zone.js`.
- **Timezone-correct** — a pluggable date adapter carries an explicit IANA zone through the whole
  model. Default adapter is `date-fns` + `date-fns-tz`; a Temporal adapter is a drop-in later.
- **RFC 5545 recurrence** — RRULE series expansion behind an adapter (default `rrule`), exceptions,
  and **edit this / this-and-following / all** semantics, plus a standalone recurrence editor.
- **Touch-first interactions** — a custom pointer-events layer for drag / create / resize with
  snap, long-press, and sub-pixel projection; fully keyboard-operable move/resize and inline title
  edit. External **drag-in** (native HTML drag-and-drop, no extra deps) drops jobs from an outside
  list onto a timeline lane.
- **Theme-agnostic** — `baseColor` + `accentColor` + `themeMode` + a `statusColors` map derive the
  whole palette as scoped `--cal-*` CSS variables, with guaranteed AA contrast (AAA for primary
  ink). Any single token is host-overridable for the long tail.
- **Bring your own markup** — structural directives override the event chip, day cell, "+N more"
  popover, resource header and the event-detail dialog body, so you keep full control of rendering.
- **Accessible** — correct ARIA `grid` / roving-tabindex patterns, visible `:focus-visible` rings,
  `prefers-reduced-motion`, and a Playwright + axe suite that gates **zero** WCAG 2.1 A/AA
  violations across every view in light and dark.
- **Export** — iCalendar (`.ics`), CSV (RFC 4180), Excel (SpreadsheetML) and printable HTML, all as
  pure serializers in a tree-shakable secondary entry point.
- **Tree-shakable** — heavy features (`/date-fns`, `/recurrence`, `/export`) are secondary entry
  points; you only pay for what you import. `sideEffects: false`, no `any`, strict TypeScript.

## Install

```bash
# Angular 22 (latest)
npm install @ascentsparksoftware/angular-calendar

# Angular 21 → npm i @ascentsparksoftware/angular-calendar@ng21
# Angular 20 → npm i @ascentsparksoftware/angular-calendar@ng20
```

One package major per Angular major — pick the line that matches your app (see
[Versions](#versions)).

- **Peer dependencies:** `@angular/core`, `@angular/common`, `@angular/platform-browser`
  (`^22` on the latest line, `^21` / `^20` on the maintenance lines).
- **Runtime dependencies** (installed automatically): `date-fns`, `date-fns-tz`, `rrule`. They power
  the optional date/recurrence adapters and are only pulled into your bundle if you import the entry
  point that uses them.

## Quick start

**1. Register a date adapter** (and, if you use recurring events, the RRULE adapter) once at
bootstrap:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideCalendar, withDateAdapter, withDefaults } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';

export const appConfig: ApplicationConfig = {
  providers: [
    provideCalendar(
      withDateAdapter(provideDateFnsAdapter()),
      withDefaults({ timezone: 'America/New_York', weekStartsOn: 0 }),
    ),
    provideRruleAdapter(), // only if you render RRULE series
  ],
};
```

**2. Drop a view on the page.** Each view is a standalone component — import it directly and bind
your events:

```ts
import { Component, signal } from '@angular/core';
import { CalMonthView, CalendarEvent } from '@ascentsparksoftware/angular-calendar';

@Component({
  selector: 'app-schedule',
  imports: [CalMonthView],
  template: `
    <cal-month-view
      [events]="events()"
      [viewDate]="viewDate()"
      accentColor="#02375e"
      [statusColors]="{ confirmed: '#16a34a', tentative: '#ca8a04' }"
      (eventClicked)="open($event.event)"
      (daySelected)="createOn($event.date)" />
  `,
})
export class ScheduleComponent {
  readonly viewDate = signal(new Date());
  readonly events = signal<CalendarEvent[]>([
    { id: '1', title: 'Kickoff', start: new Date(), status: 'confirmed' },
  ]);

  open(ev: CalendarEvent) { /* … */ }
  createOn(date: unknown) { /* … */ }
}
```

Give the view a size — it fills its container. Views set `container-type: inline-size` and adapt to
their own width, so they work in a sidebar, a modal or full-page:

```css
cal-month-view { display: block; height: 640px; }
```

## Views

All views are standalone components sharing the same theming and locale/timezone inputs. Import only
the ones you use.

| Component | Selector | What it shows |
| --- | --- | --- |
| `CalMonthView` | `cal-month-view` | Month grid with lane-packed multi-day events and a "+N more" overflow popover. |
| `CalTimeGridView` | `cal-time-grid` | Week / work-week / day time-grid (`[days]` + `[excludeDays]`), all-day band, now-line, drag/create/resize. |
| `CalTimelineView` | `cal-timeline-view` | Resource schedule / dispatch board: hierarchical lanes, configurable time axis, external drag-in. `[orientation]` is `'horizontal'` (resources as rows, time on X — default) or `'vertical'` (resources as columns, time down Y). |
| `CalYearView` | `cal-year-view` | 12 mini-months with per-day density; drill into a day or month. |
| `CalAgendaView` | `cal-agenda-view` | Chronological list over N days (`[hideEmptyDays]`). |
| `CalRecurrenceEditor` | `cal-recurrence-editor` | Standalone RRULE builder (`[(rule)]`). |
| `CalTimezonePicker` | `cal-timezone-picker` | GMT-offset-labelled IANA zone picker (`[(value)]`). |

## The event model

Events are plain data. Only `id` and `start` are required; everything else is optional. Titles are
rendered as **text, never HTML**.

```ts
interface CalendarEvent<TMeta = unknown> {
  id: string;                       // stable identity (tracking + change events)
  start: Date | ZonedDateTime;
  end?: Date | ZonedDateTime;       // omitted ⇒ zero-duration point event
  allDay?: boolean;
  title?: string;                   // plain text
  resourceIds?: readonly string[];  // timeline lanes this event belongs to
  status?: string;                  // key into statusColors → --cal-event-<status>
  recurrenceRule?: string;          // RFC 5545 RRULE
  recurrenceExceptions?: readonly (Date | ZonedDateTime)[];
  recurrenceId?: string;            // links a detached occurrence to its series
  editable?: boolean;               // per-event override of global editability
  resizable?: { beforeStart?: boolean; afterEnd?: boolean };
  draggable?: boolean;
  isBlock?: boolean;                // unavailable / block-out shading
  isReadonly?: boolean;             // never drag/resize/inline-edit
  cssClass?: string;
  meta?: TMeta;                     // your arbitrary payload
}
```

Resources (for the timeline) are equally small: `{ id, name, parentId?, expanded?, color?, workHours?, meta? }`.

## Theming

Set a few inputs and the whole calendar blends into your brand, in light or dark, with WCAG **AA**
text contrast guaranteed:

- **`baseColor`** — neutral anchor; surfaces, ink and lines are tinted toward its hue.
- **`accentColor`** — interactive accent; today, selection, now-line, focus ring.
- **`themeMode`** — `'light'` or `'dark'`.
- **`statusColors`** — a `Record<string, string>` mapping your event `status` keys to colors. Each
  is deepened until white ink is legible on it, then emitted as a `--cal-event-<key>` / `-ink` /
  `-soft` triplet, so category chips stay high-contrast automatically.

Derived values are applied as scoped custom properties on the view's host element, so they never
leak to the page. Override any single token for the long tail:

```css
cal-month-view {
  --cal-radius-md: 12px;
  --cal-accent: #ff5a5f;
}
```

<details><summary>All <code>--cal-*</code> tokens</summary>

| token | role |
| --- | --- |
| `--cal-bg` | app/backdrop base |
| `--cal-surface` / `--cal-surface-2` / `--cal-surface-sunk` | surfaces (card / inset / sunk) |
| `--cal-ink` / `--cal-ink-700` / `--cal-ink-muted` / `--cal-ink-faint` | text scale |
| `--cal-line` / `--cal-line-strong` / `--cal-grid-line` | hairlines & grid |
| `--cal-accent` / `--cal-accent-ink` / `--cal-accent-hover` | accent + on-accent (AA) |
| `--cal-accent-soft` / `--cal-accent-soft-ink` | soft accent background + text (AA) |
| `--cal-ring` | focus ring |
| `--cal-selection` / `--cal-today-bg` / `--cal-now-line` | selection, today wash, now indicator |
| `--cal-allday-bg` | all-day band |
| `--cal-scrim` | modal scrim |
| `--cal-success` / `--cal-warning` / `--cal-error` | status colors |
| `--cal-event-<key>` / `-ink` / `-soft` / `-soft-ink` | per-`statusColors` category chip |
| `--cal-radius-sm` / `-md` / `-lg` / `-pill` | radii |
| `--cal-header-h` / `--cal-slot-h` | header / time-slot heights |
| `--cal-font-mono` | numeric readouts |

You can also call the pure helpers directly: `deriveTheme(baseColor, accentColor, mode, statusColors?)`
returns the full token map, and `applyTheme(host, tokens)` writes them. Register them app-wide with
`provideCalendar(withTokenBridge(...))`. Full guide: [docs/THEMING.md](docs/THEMING.md).
</details>

## Interactions

The time-grid and timeline are editable by default. Drag to move, drag an edge to resize, or drag on
empty space to create; everything snaps to `snapMinutes`. Read changes back as a single typed output:

```html
<cal-time-grid
  [events]="events()"
  [viewDate]="viewDate()"
  [days]="5"
  [editable]="true"
  [snapMinutes]="15"
  [validateChange]="allowChange"
  (eventChanged)="apply($event)"
  (slotSelected)="createAt($event.date, $event.minutes)" />
```

`eventChanged` emits an `EventChange` (`kind: 'move' | 'resize' | 'create' | 'inline-edit'`) with the
proposed new instants; return `false` from `validateChange` to veto a drag before it commits. Per-event
`editable` / `draggable` / `resizable` / `isReadonly` override the global flags. Move/resize/create are
also fully keyboard-driven (see [Keyboard shortcuts](#keyboard-shortcuts)). The pure projection —
`computeDragTimes(...)` — is exported for headless testing.

## Recurrence

Give an event an RFC 5545 `recurrenceRule` and register the RRULE adapter; the series expands into the
visible window automatically, honoring `recurrenceExceptions`. The standalone editor produces and edits
the rule string:

```html
<cal-recurrence-editor [(rule)]="rrule" />   <!-- e.g. "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10" -->
```

For "edit this / this-and-following / all" flows, the pure helpers `addRecurrenceException(...)` and
`splitSeriesAt(...)` (plus `expandRecurringEvents(...)`) implement the semantics without DOM. The
recurrence engine lives in the `/recurrence` entry point so it tree-shakes out when unused.

## Event-detail dialog

Clicking an event can open an accessible, theme-agnostic detail dialog (`role="dialog"` +
`aria-modal`, focus moves into the dialog on open, Esc / backdrop dismiss — dependency-free, no CDK).
It ships a sensible default body (title, status, time range, resources,
"repeats") and lets you replace it entirely with your own template — the "provide a default, allow
override" pattern:

```html
<cal-event-dialog [event]="selected()" [resources]="resources" (closed)="selected.set(null)">
  <!-- optional: your own body -->
  <ng-template calEventDetail let-event let-close="close">
    <h2>{{ event.title }}</h2>
    <button (click)="edit(event); close()">Edit</button>
  </ng-template>
</cal-event-dialog>
```

## Custom templates

Structural directives let you own the markup while the library owns the layout. Each provides a typed
context:

| Directive | Overrides |
| --- | --- |
| `*calEventTemplate` | the event chip / block (all views) |
| `*calCellTemplate` | a month/year day cell |
| `*calOverflow` | the month "+N more" trigger |
| `*calResourceHeader` | a timeline resource-lane header |
| `*calEventDetail` | the event-detail dialog body |

## Timezones

Every view accepts `timezone` (an IANA zone), `locale`, and `calendarSystem` inputs, or inherits them
from `withDefaults(...)`. The model carries an explicit `ZonedDateTime` end-to-end, so an event at
`09:00 America/New_York` renders at 09:00 regardless of the browser's local zone. The
`cal-timezone-picker` control offers GMT-offset-labelled zones with `[(value)]` two-way binding.

## Export & print

Pure serializers in the `/export` entry point — no DOM, you trigger the download/print:

```ts
import { eventsToIcs, eventsToCsv, eventsToExcelXml, printDocument }
  from '@ascentsparksoftware/angular-calendar/export';

const ics  = eventsToIcs(events, { zone: 'America/New_York' }); // iCalendar .ics
const csv  = eventsToCsv(events);                              // RFC 4180
const xlsx = eventsToExcelXml(events);                         // SpreadsheetML
```

## API

Every view shares these inputs: **`events`** (required), **`viewDate`** (required),
`today`, `timezone`, `locale`, `calendarSystem`, and the theming set
(`baseColor`, `accentColor`, `themeMode`, `statusColors`). View-specific highlights:

```ts
// cal-time-grid (week / work-week / day)
days = input(7); anchorToWeek = input(true); density = input<'comfortable'|'compact'>('comfortable');
slotMinutes / dayStartMinutes / dayEndMinutes / excludeDays / weekendDays = input(...);
editable = input(true); snapMinutes = input<number|null>(null); inlineEdit = input(true);
validateChange = input<((c: EventChange) => boolean) | null>(null);
// → eventClicked, slotSelected, eventChanged

// cal-timeline-view (resource schedule)
resources = input.required(); days = input(1); headerGroupings = input(['day','hour']);
orientation = input<'horizontal'|'vertical'>('horizontal'); // resources as rows | columns
hourWidth = input(60); laneHeight = input(34); editable = input(true);
// hourWidth = px per hour along the time axis; laneHeight = px per overlap sub-lane.
// In orientation="vertical" these transpose: hourWidth is the hour height (Y), laneHeight
// the sub-lane width (X, per overlapping card). Same eventChanged payload in both.
// → eventClicked, eventChanged, slotSelected, resourceToggled, externalDrop

// cal-month-view    → eventClicked, daySelected, viewPeriodChanged
// cal-year-view     → daySelected, monthSelected
// cal-agenda-view   [days], [hideEmptyDays] → eventClicked
```

Architecture, data flow, and the headless API layer: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Keyboard shortcuts

Grids use a **roving tabindex** (arrows move within the grid, <kbd>Tab</kbd> leaves it). In the
time-grid: focus an event, <kbd>Enter</kbd>/<kbd>Space</kbd> to **grab**, <kbd>↑</kbd>/<kbd>↓</kbd> to
move by a snap step, <kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> to resize, <kbd>Enter</kbd> to drop,
<kbd>Esc</kbd> to cancel; <kbd>F2</kbd> starts inline title edit. Full map:
[docs/KEYBOARD.md](docs/KEYBOARD.md).

### Headless engine

For headless or advanced use, the pure builders and layout primitives are all exported — no DOM
required: `buildMonthView` / `buildTimeGridView` / `buildTimelineView` / `buildYearView` /
`buildAgendaView`, the overlap packers `packRows` / `packColumns`, the projection helpers
(`offsetFraction`, `sizeFraction`, `snapValue`, …), `expandRecurringEvents`, `detectConflicts` /
`filterByStatus`, and the theming `deriveTheme` / `applyTheme`. Components render exactly these view
models.

## Accessibility

WCAG 2.2 AA color contrast (derivation-guaranteed), correct ARIA `grid` / roving-tabindex patterns,
keyboard-operable move/resize/create, visible `:focus-visible` rings, `prefers-reduced-motion`
honored, and plain-text-only rendering. A Playwright + axe suite gates **zero** WCAG 2.1 A/AA
violations across every view in light and dark as a required check.

## Security

The library never renders caller content as HTML — event titles and all consumer strings are bound as
text, so it is Trusted-Types / strict-CSP clean, with no `innerHTML`, `eval` or `Function`. Runtime
dependencies are declared and audited. Still treat event data from untrusted sources as untrusted at
your own boundaries. Full policy and private reporting:
[SECURITY.md](https://github.com/ascentspark/angular-calendar/blob/main/SECURITY.md).

## Versions

One package major per Angular major. Install the line that matches your app.

| Package | Angular | npm tag |
| ------- | ------- | ------- |
| `22.x`  | 22      | `latest` |
| `21.x`  | 21      | `ng21`  |
| `20.x`  | 20      | `ng20`  |

Each line is built and published against its own Angular major (separate `NN.x` branches) with the
matching `peerDependencies` range. The **major is the Angular version**, so picking the right line is
unambiguous and `npm update` within a line is always safe; within a line we follow semver (patch =
backward-compatible fix, minor = backward-compatible feature).

## Documentation

In-repo guides:

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — headless core, view models, full API surface.
- **[docs/THEMING.md](docs/THEMING.md)** — the OKLCH engine, every `--cal-*` token, custom themes.
- **[docs/KEYBOARD.md](docs/KEYBOARD.md)** — the complete keyboard interaction map.
- **[docs/ADOPTION.md](docs/ADOPTION.md)** — integration recipes and the preset/template layer.
- **[docs/MIGRATION.md](docs/MIGRATION.md)** — moving from other Angular calendars.

## Local development

Angular CLI multi-project workspace — library in `projects/angular-calendar`, demo in `projects/demo`:

```bash
npm install
npx ng serve demo                           # serve the demo (http://localhost:4200)
npx ng build angular-calendar               # build the publishable library to dist/
npx ng test angular-calendar --watch=false  # unit tests (Vitest)
npx ng lint
```

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Help keep it healthy

We genuinely try to keep this library current, bug-free and secure, and the best way to get there is
together. If something breaks, please
[open an issue](https://github.com/ascentspark/angular-calendar/issues) with a minimal reproduction;
if you can fix a bug or add something useful, pull requests are very welcome, big or small. Thank you
in advance for anything you send our way. 💛

## License

[MIT](./LICENSE), by [Ascentspark](https://ascentspark.com).
