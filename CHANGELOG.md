# Changelog

All notable changes to this project are documented here. The package major tracks the
Angular major. This project adheres to [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [20.1.0] - 2026-07-05

Angular 20 build of the 22.1.0 feature. Feature-parity with 22.1.0.

### Added

- **`orientation` input on `CalTimelineView`** (`'horizontal'` | `'vertical'`, default `'horizontal'`).
  Vertical renders the resource scheduler transposed: resources as columns across the top, time down
  the Y axis, side-by-side overlap packing, a horizontal now-line, and axis-swapped drag/keyboard
  (Y = time, X = resource). Additive and non-breaking; horizontal output is unchanged.


## [20.0.2] - 2026-07-02

Angular 20 build of the 22.0.2 changes. Feature-parity with 22.0.2: timeline pointer
edge-resize + drag-to-create, sub-hour (`slotMinutes`) gridlines with hourly labels,
readable two-line week-as-rows event titles, near-adjacent short events stacked to avoid
chip overlap, and the timeline short-event status-tag fix.


## [20.0.1] - 2026-07-02

Angular 20 build of the 22.0.1 adoption-audit fixes. Feature-parity with 22.0.1.


## [20.0.0] - 2026-07-01

### Added

- Angular 20 release line. Feature-parity with `22.0.0` — the same views, timezone-correct
  date adapter, RRULE recurrence, pointer drag/resize, OKLCH theming, and event-detail dialog —
  built and tested against Angular 20 with `^20.0.0` peer dependencies (TypeScript ~5.9,
  Vitest 3, ESLint 9). Install with `npm i @ascentsparksoftware/angular-calendar@ng20`.

### Added

- Initial workspace, OKLCH theming engine, timezone-correct date adapter, and headless
  layout/projection core.
