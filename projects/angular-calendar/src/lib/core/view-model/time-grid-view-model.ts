import type { CalendarEvent } from '../model/calendar-event';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { TimeAxisOrientation } from '../model/view';
import type { PositionedChip } from './positioned-chip';
import type { PositionedEvent, ShadeBand } from './positioned-event';
import type { ViewPeriod } from './view-period';

/** One day column of the time grid. */
export interface TimeColumn<TMeta = unknown> {
  /** Start-of-day in the display zone. */
  readonly date: ZonedDateTime;
  readonly isToday: boolean;
  readonly isWeekend: boolean;
  /** Timed events, packed side-by-side and clipped to the day window. */
  readonly events: readonly PositionedEvent<TMeta>[];
  /** Working-hours / off-hours shading bands. */
  readonly shade: readonly ShadeBand[];
  /** Now-indicator fraction (0–1) if "now" falls in this column's window, else null. */
  readonly nowOffset: number | null;
}

/** Time-axis tick used to render the time gutter. */
export interface TimeTick {
  /** Fraction (0–1) along the time axis. */
  readonly offset: number;
  /** Minutes from midnight this tick represents. */
  readonly minutes: number;
  /** Pre-formatted label (e.g. "09:00"); empty on minor (unlabelled) gridlines. */
  readonly label: string;
  /**
   * A major tick sits on an hour boundary and carries a label; minor ticks are the
   * finer `slotMinutes` gridlines between labels (drawn lighter, no label).
   */
  readonly major: boolean;
}

/** Week / work-week / day time-grid view-model. */
export interface TimeGridViewModel<TMeta = unknown> {
  readonly period: ViewPeriod;
  readonly orientation: TimeAxisOrientation;
  readonly columns: readonly TimeColumn<TMeta>[];
  readonly ticks: readonly TimeTick[];
  readonly slotMinutes: number;
  /** Visible day window start/end, minutes from midnight. */
  readonly dayStartMinutes: number;
  readonly dayEndMinutes: number;
  /** All-day / multi-day events spanning the day columns (row-packed). */
  readonly allDay: readonly PositionedChip<TMeta>[];
}

/** Inputs to `buildTimeGridView`. */
export interface TimeGridViewArgs<TMeta = unknown> {
  readonly viewDate: ZonedDateTime;
  readonly events: readonly CalendarEvent<TMeta>[];
  /** Number of day columns (1 = day view, 7 = week, etc.). */
  readonly days: number;
  readonly weekStartsOn: number;
  readonly orientation: TimeAxisOrientation;
  readonly slotMinutes: number;
  readonly dayStartMinutes: number;
  readonly dayEndMinutes: number;
  readonly today?: ZonedDateTime;
  readonly now?: ZonedDateTime;
  /** Weekday indices to exclude (work-week), 0=Sun … 6=Sat. */
  readonly excludeDays?: readonly number[];
  readonly weekendDays?: readonly number[];
  /** Locale for tick labels. */
  readonly locale: string;
  /** Force 12/24-hour tick labels, or `null`/omitted for the locale default. */
  readonly hour12?: boolean | null;
  /** Whether to anchor the window to the week start (week) or the viewDate (day). */
  readonly anchorToWeek: boolean;
}
