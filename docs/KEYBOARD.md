# Keyboard interaction map

All views are operable without a pointer. Focus styling uses the `--cal-ring` token
and is always visible (`:focus-visible`). Grids use a **roving tabindex**: one cell is in
the tab order at a time; arrow keys move focus within the grid, and <kbd>Tab</kbd> leaves it.

## Month view (`cal-month-view`)

The day grid is an ARIA `grid`; the focused day cell is the roving tab stop.

| Key | Action |
|-----|--------|
| <kbd>←</kbd> / <kbd>→</kbd> | Focus the previous / next day |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Focus the same weekday in the previous / next week |
| <kbd>Home</kbd> / <kbd>End</kbd> | Focus the first / last day of the focused week |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Select the focused day (`daySelected`) |
| <kbd>Tab</kbd> into a chip, then <kbd>Enter</kbd> | Activate an event chip (`eventClicked`) |

The **"+N more" overflow popover** opens from its trigger; focus moves into the
popover, <kbd>Esc</kbd> closes it and returns focus to the trigger, and the listed
events are ordinary buttons in the tab order.

## Year view (`cal-year-view`)

Each mini-month is a `grid`; arrow keys roam across the **whole year**, wrapping between
months.

| Key | Action |
|-----|--------|
| <kbd>←</kbd> / <kbd>→</kbd> | Previous / next day (crosses month boundaries) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Up / down one week |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last day of the focused week |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Drill into the focused day |

## Week / Day time-grid (`cal-time-grid`)

Each timed event is focusable. Selection, **keyboard move/resize**, and inline title
editing are all keyboard-driven.

| Context | Key | Action |
|---------|-----|--------|
| Event focused | <kbd>Enter</kbd> / <kbd>Space</kbd> | **Grab** the event (enter move mode) |
| Grabbed | <kbd>↑</kbd> / <kbd>↓</kbd> | Move the event earlier / later by one snap step |
| Grabbed | <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Resize the **end** by one snap step |
| Grabbed | <kbd>Enter</kbd> / <kbd>Space</kbd> | **Drop** — commit the change (`eventChanged`) |
| Grabbed | <kbd>Esc</kbd> | Cancel the move/resize (snaps back) |
| Event focused | <kbd>F2</kbd> | Start inline title edit |
| Editing | <kbd>Enter</kbd> | Commit the new title (`eventChanged`, `kind:'inline-edit'`) |
| Editing | <kbd>Esc</kbd> | Cancel the edit |

## Resource timeline (`cal-timeline-view`)

Each event block is focusable. Move, lane-reassign, and resize are keyboard-driven, with
screen-reader announcements on every step.

| Context | Key | Action |
|---------|-----|--------|
| Block focused | <kbd>Enter</kbd> / <kbd>Space</kbd> | **Grab** the block (enter move mode) |
| Grabbed | <kbd>←</kbd> / <kbd>→</kbd> | Move earlier / later by one snap step |
| Grabbed | <kbd>↑</kbd> / <kbd>↓</kbd> | Reassign to the previous / next resource lane |
| Grabbed | <kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd> | Resize the **end** by one snap step |
| Grabbed | <kbd>Enter</kbd> / <kbd>Space</kbd> | **Drop** — commit (runs `validateChange`, then `eventChanged`) |
| Grabbed | <kbd>Esc</kbd> | Cancel the move/resize (snaps back) |

## Recurrence editor (`cal-recurrence-editor`) and timezone picker

Standard form controls: native `<select>` / inputs, fully keyboard-operable, labelled
for screen readers.

## Verification

Accessibility (including visible focus order and operability) is gated by the Playwright
+ axe-core suite (`npm run e2e`) across every view in light and dark — zero WCAG 2.1 A/AA
violations is a required check.
