import { InjectionToken } from '@angular/core';
import type { CalendarSystem, EraFields, ZonedDateTime } from './zoned-date-time';

/**
 * Pluggable date engine. The headless core never imports a date library directly;
 * it receives a `DateAdapter` (as a parameter or via {@link DATE_ADAPTER}) and
 * calls these primitives. The default implementation is the `date-fns(+tz)`
 * adapter in the `/date-fns` secondary entry point; Luxon / `Temporal` adapters
 * can implement the same contract.
 *
 * Contract notes:
 * - Every method is **pure** and returns **new** values — implementations must
 *   never mutate their arguments.
 * - Arithmetic that is *physical* (`addMinutes`) shifts the absolute instant.
 *   Arithmetic that is *calendar* (`addDays`, `addMonths`) operates on wall-clock
 *   fields in the value's zone, so it is DST-correct (adding one day keeps the
 *   same wall-clock time even across a DST transition).
 * - All "minutes" quantities are **physical** minutes derived from `epochMs`, so
 *   a DST day genuinely measures 23 h or 25 h. Projection relies on this being
 *   consistent (never on `getTimezoneOffset` arithmetic).
 */
export interface DateAdapter {
  // ── construction / normalisation ──────────────────────────────────────────
  /** Normalise a `Date` (absolute) or an existing `ZonedDateTime` into `zone`. */
  toZoned(value: Date | ZonedDateTime, zone: string): ZonedDateTime;
  /** The current instant, expressed in `zone`. */
  now(zone: string): ZonedDateTime;

  // ── arithmetic (return new values; never mutate) ──────────────────────────
  /** Shift the absolute instant by `n` minutes (physical). */
  addMinutes(d: ZonedDateTime, n: number): ZonedDateTime;
  /** Add `n` calendar days in the value's zone, preserving wall-clock time (DST-safe). */
  addDays(d: ZonedDateTime, n: number): ZonedDateTime;
  /** Add `n` calendar months in the value's zone, preserving wall-clock time. */
  addMonths(d: ZonedDateTime, n: number): ZonedDateTime;

  // ── boundaries (DST-correct, zone-aware) ──────────────────────────────────
  /** Local midnight (00:00) of the value's day, in its zone. */
  startOfDay(d: ZonedDateTime): ZonedDateTime;
  /** The last representable instant of the value's day (23:59:59.999 local). */
  endOfDay(d: ZonedDateTime): ZonedDateTime;
  /** Local midnight of the week start, with `weekStartsOn` 0=Sun … 6=Sat. */
  startOfWeek(d: ZonedDateTime, weekStartsOn: number): ZonedDateTime;
  /** Local midnight of the first day of the value's month. */
  startOfMonth(d: ZonedDateTime): ZonedDateTime;

  // ── queries ───────────────────────────────────────────────────────────────
  /** Physical minutes from `b` to `a` (`a - b`), may be fractional. */
  differenceInMinutes(a: ZonedDateTime, b: ZonedDateTime): number;
  /** Whether `a` and `b` fall on the same local calendar day in their zone. */
  isSameDay(a: ZonedDateTime, b: ZonedDateTime): boolean;
  /** Day of week in the value's zone, 0=Sun … 6=Sat (Gregorian). */
  getDayOfWeek(d: ZonedDateTime): number;
  /** Physical minutes since local midnight; on a DST day spans 0…1380 or 0…1500. */
  getMinutesIntoDay(d: ZonedDateTime): number;

  // ── calendar-system-aware display fields (default 'gregory') ──────────────
  /** Year/month/day (and era) of the value in the requested calendar system. */
  getEra(d: ZonedDateTime, system: CalendarSystem): EraFields;
  /**
   * Format the value for display. `pattern` is one of the library's semantic
   * format tokens (see the adapter's preset table); formatting is locale-, zone-
   * and calendar-system-aware via `Intl`.
   */
  format(d: ZonedDateTime, pattern: string, locale: string, system?: CalendarSystem): string;
}

/** DI token for the active {@link DateAdapter}. Provided by `provideDateFnsAdapter()`. */
export const DATE_ADAPTER = new InjectionToken<DateAdapter>('cal.DateAdapter');
