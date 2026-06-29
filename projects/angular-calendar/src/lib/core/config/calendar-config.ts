import { InjectionToken } from '@angular/core';
import type { CalendarSystem } from '../date-adapter/zoned-date-time';

/**
 * Library-wide defaults, supplied once via {@link provideCalendar} and read by
 * the calendar components. Every field is also overridable per-instance through a
 * component `input()`; this token only seeds the defaults.
 */
export interface CalendarConfig {
  /** BCP-47 locale for labels and number/date formatting. */
  readonly locale: string;
  /** First day of the week, 0=Sun … 6=Sat. */
  readonly weekStartsOn: number;
  /** Calendar system for display/labelling (storage stays absolute). */
  readonly calendarSystem: CalendarSystem;
  /**
   * IANA display zone, or `null` to resolve the host's zone at runtime
   * (`Intl…resolvedOptions().timeZone`, falling back to `'UTC'` during SSR).
   */
  readonly timezone: string | null;
  /** Time-slot granularity in minutes (time-grid/timeline). */
  readonly slotMinutes: number;
  /** Visible day window start, minutes from midnight. */
  readonly dayStartMinutes: number;
  /** Visible day window end, minutes from midnight. */
  readonly dayEndMinutes: number;
  /** Drag/resize/create quantisation in minutes. */
  readonly snapMinutes: number;
  /** Force 12/24-hour clock, or `null` for the locale default. */
  readonly hour12: boolean | null;
}

/** Built-in defaults; merged with any `withDefaults(...)` overrides. */
export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  locale: 'en-US',
  weekStartsOn: 0,
  calendarSystem: 'gregory',
  timezone: null,
  slotMinutes: 30,
  dayStartMinutes: 0,
  dayEndMinutes: 1440,
  snapMinutes: 15,
  hour12: null,
};

/** DI token carrying the resolved {@link CalendarConfig}. */
export const CALENDAR_CONFIG = new InjectionToken<CalendarConfig>('cal.CalendarConfig', {
  providedIn: 'root',
  factory: () => DEFAULT_CALENDAR_CONFIG,
});
