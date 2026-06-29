import type { CalendarEvent } from '../model/calendar-event';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { PositionedChip } from './positioned-chip';
import type { ViewPeriod } from './view-period';

/** A single day cell in the month grid. */
export interface MonthDay<TMeta = unknown> {
  /** Start-of-day in the display zone. */
  readonly date: ZonedDateTime;
  /** Whether the day belongs to the focused month (vs leading/trailing days). */
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly isWeekend: boolean;
  /** Visible chips anchored to this day's column (lane &lt; maxLanes). */
  readonly events: readonly PositionedChip<TMeta>[];
  /** Hidden events covering this day → drives the "+N more" indicator. */
  readonly overflowCount: number;
  /**
   * Every event covering this day (visible and overflowed), start-sorted. Powers
   * the "+N more" popover so hidden events stay reachable.
   */
  readonly dayEvents: readonly CalendarEvent<TMeta>[];
}

/** One week row. */
export interface MonthWeek<TMeta = unknown> {
  readonly days: readonly MonthDay<TMeta>[];
}

/** The complete month grid view-model. */
export interface MonthViewModel<TMeta = unknown> {
  readonly period: ViewPeriod;
  readonly weeks: readonly MonthWeek<TMeta>[];
}

/** Inputs to {@link buildMonthView}. */
export interface MonthViewArgs<TMeta = unknown> {
  /** Any instant in the target month (its zone is the display zone). */
  readonly viewDate: ZonedDateTime;
  readonly events: readonly CalendarEvent<TMeta>[];
  /** First day of the week, 0=Sun … 6=Sat. */
  readonly weekStartsOn: number;
  /** Omit ⇒ no day is marked "today". */
  readonly today?: ZonedDateTime;
  /** Visible chip lanes before overflow; omit ⇒ unlimited. */
  readonly maxLanes?: number;
  /** Days treated as weekend; default `[0, 6]`. */
  readonly weekendDays?: readonly number[];
}
