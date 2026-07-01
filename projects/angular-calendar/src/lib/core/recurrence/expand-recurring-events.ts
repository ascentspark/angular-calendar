import type { DateAdapter } from '../date-adapter/date-adapter';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { CalendarEvent } from '../model/calendar-event';
import type { RecurrenceAdapter } from './recurrence-adapter';

/** Context for {@link expandRecurringEvents}. */
export interface ExpandContext {
  readonly recurrence: RecurrenceAdapter;
  readonly dates: DateAdapter;
  readonly windowStart: ZonedDateTime;
  readonly windowEnd: ZonedDateTime;
  readonly zone: string;
}

/**
 * Expand any event carrying a `recurrenceRule` into concrete occurrences within
 * the window, passing non-recurring events through untouched. Each occurrence is
 * a fresh immutable event with a deterministic id (`<id>::<epochMs>`), the
 * original duration preserved, `recurrenceId` set to the series id, and its own
 * `recurrenceRule` cleared (it is now a concrete instance).
 *
 * Pure: adapters are passed in; inputs are never mutated. Windowed via the
 * recurrence adapter so infinite rules never materialise unbounded.
 */
export function expandRecurringEvents<TMeta = unknown>(
  events: readonly CalendarEvent<TMeta>[],
  ctx: ExpandContext,
): CalendarEvent<TMeta>[] {
  const out: CalendarEvent<TMeta>[] = [];
  for (const event of events) {
    if (event.recurrenceRule === undefined || event.recurrenceRule === '') {
      out.push(event);
      continue;
    }
    const start = ctx.dates.toZoned(event.start, ctx.zone);
    const end = event.end === undefined ? start : ctx.dates.toZoned(event.end, ctx.zone);
    const durationMinutes = ctx.dates.differenceInMinutes(end, start);
    const exceptions = (event.recurrenceExceptions ?? []).map((ex) =>
      ctx.dates.toZoned(ex, ctx.zone),
    );
    const occurrences = ctx.recurrence.expand({
      rule: event.recurrenceRule,
      dtStart: start,
      exceptions,
      windowStart: ctx.windowStart,
      windowEnd: ctx.windowEnd,
      zone: ctx.zone,
    });
    // Omit the series-level recurrence fields; each occurrence is concrete.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- fields intentionally omitted from `rest`
    const { recurrenceRule, recurrenceExceptions, ...rest } = event;
    for (const occ of occurrences) {
      const occEnd = ctx.dates.addMinutes(occ, durationMinutes);
      out.push({
        ...rest,
        id: `${event.id}::${occ.epochMs}`,
        start: occ,
        end: occEnd,
        recurrenceId: event.id,
      });
    }
  }
  return out;
}
