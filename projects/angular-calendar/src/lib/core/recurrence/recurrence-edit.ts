import type { DateAdapter } from '../date-adapter/date-adapter';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { CalendarEvent } from '../model/calendar-event';
import type { RecurrenceAdapter } from './recurrence-adapter';

/**
 * "Edit/Delete this occurrence": return the series event with `occurrenceStart`
 * added to its exception list (so the occurrence stops being generated). Pure.
 */
export function addRecurrenceException<TMeta = unknown>(
  series: CalendarEvent<TMeta>,
  occurrenceStart: ZonedDateTime,
): CalendarEvent<TMeta> {
  const existing = series.recurrenceExceptions ?? [];
  return { ...series, recurrenceExceptions: [...existing, occurrenceStart] };
}

/** Result of splitting a series for "this and following". */
export interface SeriesSplit<TMeta = unknown> {
  /** The original series, terminated the day before `occurrenceStart`. */
  readonly head: CalendarEvent<TMeta>;
  /** A new series id to assign to the tail (caller creates the tail event). */
  readonly tailRule: string;
  readonly tailStart: ZonedDateTime;
}

/**
 * "Edit this and following": terminate the existing series just before
 * `occurrenceStart` (RRULE `UNTIL`) and return the rule + start for a new series
 * beginning at `occurrenceStart`. The caller builds the tail event (applying the
 * user's changes) and commits both. Pure; uses the recurrence adapter to rewrite
 * the rule's end.
 */
export function splitSeriesAt<TMeta = unknown>(
  series: CalendarEvent<TMeta>,
  occurrenceStart: ZonedDateTime,
  ctx: { readonly recurrence: RecurrenceAdapter; readonly dates: DateAdapter },
): SeriesSplit<TMeta> {
  const rule = series.recurrenceRule ?? '';
  const parts = ctx.recurrence.parse(rule);
  const untilInstant = ctx.dates.addMinutes(occurrenceStart, -1);
  const headParts = { ...parts, end: { type: 'until' as const, until: untilInstant } };
  const headRule = ctx.recurrence.serialize(headParts);
  const head: CalendarEvent<TMeta> = { ...series, recurrenceRule: headRule };
  // The tail keeps the original cadence but no explicit end unless the original had a count.
  const tailParts = { ...parts };
  return { head, tailRule: ctx.recurrence.serialize(tailParts), tailStart: occurrenceStart };
}
