# Changelog

All notable changes to this project are documented here. The package major tracks the
Angular major. This project adheres to [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [21.0.2] - 2026-07-02

Angular 21 build of the 22.0.2 changes. Feature-parity with 22.0.2: timeline pointer
edge-resize + drag-to-create, sub-hour (`slotMinutes`) gridlines with hourly labels,
readable two-line week-as-rows event titles, near-adjacent short events stacked to avoid
chip overlap, and the timeline short-event status-tag fix.


## [21.0.1] - 2026-07-02

Angular 21 build of the 22.0.1 adoption-audit fixes (orientation input, timeline keyboard +
validateChange, DST fix, print Trusted-Types, recurrence in agenda/year, hour12 unification,
virtualization, focus trap, on-accent ink, and month/timeline polish). Feature-parity with 22.0.1.


## [21.0.0] - 2026-07-01

### Added

- Angular 21 release line. Feature-parity with `22.0.0` — the same month/week/day/timeline/
  agenda/year views, timezone-correct date adapter, RRULE recurrence, pointer drag/resize,
  OKLCH theming, and event-detail dialog — built and tested against Angular 21 with `^21.0.0`
  peer dependencies. Install with `npm i @ascentsparksoftware/angular-calendar@ng21`.
