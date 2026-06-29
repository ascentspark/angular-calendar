import type { CalendarEvent } from '../model/calendar-event';
import type { CalendarSystem, ZonedDateTime } from '../date-adapter/zoned-date-time';

/** A compact day cell in a year-view mini-month. */
export interface YearDay {
  /** Start-of-day in the display zone. */
  readonly date: ZonedDateTime;
  /** Whether the day belongs to that mini-month (vs leading/trailing alignment days). */
  readonly inMonth: boolean;
  readonly isToday: boolean;
  /** Number of events overlapping the day → density dot / heat intensity. */
  readonly eventCount: number;
}

/** One mini-month within the year overview. */
export interface YearMonth {
  /** Localised month name (calendar-system aware). */
  readonly label: string;
  /** Six aligned week rows × 7 days = 42 cells. */
  readonly days: readonly YearDay[];
}

/** The 12-month year overview view-model. */
export interface YearViewModel {
  /** The year number in the active calendar system. */
  readonly year: number;
  readonly months: readonly YearMonth[];
}

/** Inputs to {@link buildYearView}. */
export interface YearViewArgs<TMeta = unknown> {
  readonly viewDate: ZonedDateTime;
  readonly events: readonly CalendarEvent<TMeta>[];
  readonly weekStartsOn: number;
  readonly today?: ZonedDateTime;
  readonly locale: string;
  readonly calendarSystem?: CalendarSystem;
}
