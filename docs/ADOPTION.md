# Adoption pattern — a field-service dispatch board

This guide shows how a consuming app builds a domain-specific scheduler **on top of** the
published library plus a thin, app-owned preset — without forking or modifying the library.
It mirrors the first real consumer (a field-service app: technicians = resources, jobs =
events, dispatch board = the resource timeline) and doubles as the reference for any adopter.

> **Key principle:** the library stays generic. Everything app-specific — the 7-status palette,
> the rich job card, the "unassigned jobs" interaction — lives in the **consumer**, expressed
> through the public API (inputs, templates, outputs). Nothing here requires library changes.

## 1. Configure once

```ts
// app.config.ts
provideCalendar(
  withDateAdapter(provideDateFnsAdapter()),
  withDefaults({ timezone: 'America/New_York', weekStartsOn: 0, slotMinutes: 30 }),
),
provideRruleAdapter(), // recurring availability / jobs
```

## 2. Map your domain to the model

- **Technicians → `CalendarResource`** (with `parentId` for region → team → tech grouping and
  `workHours` for each tech's shift; lunch/PTO are `isBlock` events).
- **Jobs → `CalendarEvent`** with `resourceIds: [techId]`, a `status`, and your domain payload
  in `meta` (typed via the component's `TMeta` generic).

## 3. The status preset (app-owned)

The field-service app's seven statuses are **data, not CSS** — a `statusColors` map the library
tints events from:

```ts
statusColors = {
  scheduled: '#3b82f6', active: '#16a34a', completed: '#7c3aed',
  cancelled: '#dc2626', paid: '#0891b2', drive: '#9a6700', event: '#64748b',
};
```

Per-status treatments beyond colour (e.g. completed = struck-through) go in your **rich card
template** (below) or via `event.cssClass`. The library guarantees a legible on-colour for each
status in light and dark.

## 4. The dispatch board

```html
<cal-timeline-view
  [events]="filteredJobs()"
  [resources]="technicians"
  [viewDate]="day()"
  [now]="now()"
  [days]="1"
  [dayStartMinutes]="420" [dayEndMinutes]="1260"
  [headerGroupings]="['day', 'hour']"
  [statusColors]="statusColors"
  (eventChanged)="dispatch.apply($event)"
  (slotSelected)="dispatch.newJobAt($event)"
>
  <!-- Rich, consumer-defined job card -->
  <ng-template calEventTemplate let-job>
    <my-job-card [job]="job" />   <!-- client name + address + assignee avatars + badges -->
  </ng-template>

  <ng-template calResourceHeader let-tech let-depth="depth">
    <my-tech-row [tech]="tech" [depth]="depth" />
  </ng-template>
</cal-timeline-view>
```

- **Week-as-rows** (days as rows, time as columns) is the same component over a multi-day range.
- **Now-indicator, off-hours shading, resource tree collapse** are built in.
- **Status filters** are a thin app control that narrows the event list with `filterByStatus`
  before binding (see the demo).

## 5. Own the data; commit changes

The board never mutates your data. `eventChanged` reports an intended move/resize/create/inline
edit; apply it to your store and feed new immutable data back in. Use `validateChange` to veto a
drop (e.g. outside a tech's shift) before it commits.

## 6. Unscheduled strip + drag-in

Render your unassigned jobs as a side list and drop them onto a tech's lane; resolve the drop to
`(time, resourceId)` and dispatch an `eventChanged` with `kind: 'create'`. (CDK DragDrop interop
for cross-list drag is the recommended bridge.)

## 7. Retire the interim calendar

Once adopted, the app wraps the library with this thin preset and retires any hand-rolled
calendar — one calendar, theme-matched via the four theming inputs, owned upstream.
