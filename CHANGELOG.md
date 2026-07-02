# Changelog

All notable changes to this project are documented here. The package major tracks the
Angular major. This project adheres to [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [22.0.2] - 2026-07-02

### Added

- **Timeline pointer resize + drag-to-create**: grab a block's start/end edge to resize its
  duration (live preview), and drag on an empty lane to create an event (create-ghost + `eventChanged`
  `kind: 'create'`). Both honour `validateChange`. Completes the timeline interaction parity with the
  time-grid (keyboard resize/move already shipped in 22.0.1).
- **Sub-hour gridlines**: `slotMinutes` now drives the time-grid gridline density (default 30 → a
  faint half-hour line between each hour; set `[slotMinutes]="15"` for quarter-hour lines). Axis
  labels stay on the hour so a fine slot subdivides the grid without crowding the axis. Applies to
  the vertical Week/Day grid and the horizontal week-as-rows layout. Short day windows stretch to
  fill the viewport width (the per-hour width is a minimum, not a fixed size); long windows scroll.

### Fixed

- **Horizontal week-as-rows** events now render as fixed-height chips centred in each day-row
  (stacked by overlap lane) instead of full-height slivers that clipped their titles; rows share
  the available height evenly with no dead space below. Titles wrap to two whole-word lines
  (a short event reads "Design" / "review", never a mid-word clip like "Des gn revi…").
- Timeline event chips shed the status tag (then the avatar) on short durations via a container
  query, instead of clipping the label mid-word.

## [22.0.1] - 2026-07-02

Adoption-audit fixes (see the integration review). No breaking API changes.

### Added

- **Time-axis `orientation` input** on `CalTimeGridView` (`'vertical'` | `'horizontal'`) —
  horizontal renders week-as-rows (time left→right, days stacked), with axis-aware drag/create.
- **Timeline keyboard operability**: focus a block, Enter to grab, arrows to move in time / across
  resource lanes, Shift+arrows to resize, Enter/Esc to drop/cancel — announced via a live region.
- **`validateChange`** on the timeline (synchronous veto of an in-flight move/resize).
- **`withVirtualization()`** provider + horizontal event culling on the timeline (rows were already
  windowed); a dependency-free **`CalFocusTrap`** and a focus trap on the event dialog.
- **`accentInk`** override input on every view (+ a `deriveTheme` param) to control on-accent text.
- Recurrence expansion now runs in the **Agenda and Year** views too.

### Fixed

- **DST**: time-grid events and the now-line are positioned by wall-clock time, fixing a one-row
  drift on spring-forward / fall-back weeks.
- **Time formatting** is unified through the `hour12` config (12/24-hour or locale default) across
  every view instead of mixed hardcoded formats.
- **Print export** builds its document via DOM APIs (no `document.write`) — Trusted-Types / strict-CSP
  safe; popup-blocked `window.open` is handled.
- Month view: date-number padding, and the "+N more" pill now sits under the day's events; on-accent
  ink prefers white for legibility on saturated accents.
- Perf: cached `Intl.DateTimeFormat` in the adapter; timeline events pre-bucketed by resource
  (O(events), not O(resources×events)).

### Changed

- Removed the never-constructed `EventChangeRequest` type; documented the host-authoritative state
  contract on `EventChange`. `anchorToWeek` now defaults to a smart `null` (`[days]="1"` shows
  `viewDate`). `viewPeriodChanged` is emitted from all views.

- Initial workspace, OKLCH theming engine, timezone-correct date adapter, and headless
  layout/projection core.
