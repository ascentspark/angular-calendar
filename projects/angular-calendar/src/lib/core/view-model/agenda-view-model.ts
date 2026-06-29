import type { CalendarEvent } from '../model/calendar-event';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { ViewPeriod } from './view-period';

/** One day's worth of events in the agenda list. */
export interface AgendaDay<TMeta = unknown> {
  /** Start-of-day in the display zone. */
  readonly date: ZonedDateTime;
  readonly isToday: boolean;
  /** Events overlapping the day, all-day first then timed by start. */
  readonly events: readonly CalendarEvent<TMeta>[];
}

/** The agenda (list) view-model. */
export interface AgendaViewModel<TMeta = unknown> {
  readonly period: ViewPeriod;
  readonly days: readonly AgendaDay<TMeta>[];
}

/** Inputs to `buildAgendaView`. */
export interface AgendaViewArgs<TMeta = unknown> {
  readonly viewDate: ZonedDateTime;
  readonly events: readonly CalendarEvent<TMeta>[];
  /** Number of consecutive days to list. */
  readonly days: number;
  readonly today?: ZonedDateTime;
  /** Omit empty days from the list (default false → show every day). */
  readonly hideEmptyDays?: boolean;
}
