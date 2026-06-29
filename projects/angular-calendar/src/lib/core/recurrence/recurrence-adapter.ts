import { InjectionToken } from '@angular/core';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';

/** Recurrence frequency (RFC 5545 FREQ). */
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** How a recurrence-end is expressed. */
export type RecurrenceEnd =
  | { readonly type: 'never' }
  | { readonly type: 'count'; readonly count: number }
  | { readonly type: 'until'; readonly until: ZonedDateTime };

/** Parsed, editor-friendly representation of an RRULE. */
export interface RecurrenceParts {
  readonly freq: RecurrenceFreq;
  /** Interval between occurrences (≥ 1). */
  readonly interval: number;
  /** Weekdays 0=Sun … 6=Sat (weekly BYDAY). */
  readonly byWeekday?: readonly number[];
  /** Days of month 1–31 (monthly BYMONTHDAY). */
  readonly byMonthday?: readonly number[];
  /** Months 1–12 (yearly BYMONTH). */
  readonly byMonth?: readonly number[];
  /** Ordinal position within the period (BYSETPOS, e.g. -1 = last). */
  readonly bySetPos?: readonly number[];
  readonly end: RecurrenceEnd;
}

/** Which occurrences a recurrence edit applies to. */
export type RecurrenceEditScope = 'this' | 'this-and-following' | 'all';

/**
 * Pluggable recurrence engine. The default implementation (RFC 5545 via `rrule`)
 * lives in the tree-shakable `/recurrence` secondary entry. The core never imports
 * `rrule` directly — it calls this contract through {@link RECURRENCE_ADAPTER}.
 */
export interface RecurrenceAdapter {
  /**
   * Expand a rule into concrete occurrence start instants within
   * `[windowStart, windowEnd)`. Windowed so an infinite rule never materialises
   * unbounded. Occurrences keep their wall-clock time across DST (the series is
   * expanded in the event's zone).
   */
  expand(input: {
    readonly rule: string;
    readonly dtStart: ZonedDateTime;
    readonly exceptions: readonly ZonedDateTime[];
    readonly windowStart: ZonedDateTime;
    readonly windowEnd: ZonedDateTime;
    readonly zone: string;
  }): ZonedDateTime[];

  /** Parse an RRULE string into editor parts. */
  parse(rule: string): RecurrenceParts;

  /** Serialize editor parts back into an RRULE string. */
  serialize(parts: RecurrenceParts): string;
}

/** DI token for the active {@link RecurrenceAdapter}. Provided by `provideRruleAdapter()`. */
export const RECURRENCE_ADAPTER = new InjectionToken<RecurrenceAdapter>('cal.RecurrenceAdapter');
