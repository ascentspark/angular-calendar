import type { DateAdapter } from '../date-adapter/date-adapter';
import type { YearDay, YearMonth, YearViewArgs, YearViewModel } from './year-view-model';

const DAYS_PER_WEEK = 7;
const WEEKS_PER_MINI_MONTH = 6; // uniform 6×7 mini grids
const MONTHS_PER_YEAR = 12;

/**
 * Build the 12-month year overview: one uniform 6×7 mini-grid per month of the
 * focused (Gregorian) year, each day carrying an event-density count. Month/year
 * labels are rendered through the active calendar system via {@link DateAdapter}.
 *
 * Pure and DOM-free; all date math is DST-correct via the adapter. Event density
 * is computed once from the events' covered day-ranges, then bucketed per day.
 */
export function buildYearView<TMeta = unknown>(
  adapter: DateAdapter,
  args: YearViewArgs<TMeta>,
): YearViewModel {
  const system = args.calendarSystem ?? 'gregory';
  const zone = args.viewDate.zone;

  // First day of the focused year (Gregorian January), at local midnight.
  const monthStart0 = adapter.startOfMonth(args.viewDate);
  // Walk back to January by subtracting months until month index 1.
  let january = monthStart0;
  for (let guard = 0; guard < 11; guard++) {
    const month = adapter.getEra(january, 'gregory').month;
    if (month === 1) {
      break;
    }
    january = adapter.startOfMonth(adapter.addMonths(january, -1));
  }

  // Pre-bucket event counts by local day epoch.
  const countByDay = new Map<number, number>();
  for (const event of args.events) {
    const start = adapter.toZoned(event.start, zone);
    const startDay = adapter.startOfDay(start);
    const end = event.end === undefined ? start : adapter.toZoned(event.end, zone);
    const lastInstant =
      adapter.differenceInMinutes(end, start) > 0 ? adapter.addMinutes(end, -1) : start;
    const lastDay = adapter.startOfDay(lastInstant);
    let cursor = startDay;
    // Bound the walk so a pathological range can't loop unbounded.
    for (let guard = 0; guard < 1000 && cursor.epochMs <= lastDay.epochMs; guard++) {
      countByDay.set(cursor.epochMs, (countByDay.get(cursor.epochMs) ?? 0) + 1);
      cursor = adapter.startOfDay(adapter.addDays(cursor, 1));
    }
  }

  const months: YearMonth[] = [];
  for (let m = 0; m < MONTHS_PER_YEAR; m++) {
    const monthStart = adapter.startOfMonth(adapter.addMonths(january, m));
    const gridStart = adapter.startOfWeek(monthStart, args.weekStartsOn);
    const monthIndex = adapter.getEra(monthStart, 'gregory').month;

    const days: YearDay[] = [];
    for (let i = 0; i < WEEKS_PER_MINI_MONTH * DAYS_PER_WEEK; i++) {
      const date = adapter.startOfDay(adapter.addDays(gridStart, i));
      days.push({
        date,
        inMonth: adapter.getEra(date, 'gregory').month === monthIndex,
        isToday: args.today !== undefined && adapter.isSameDay(date, args.today),
        eventCount: countByDay.get(date.epochMs) ?? 0,
      });
    }

    months.push({
      label: adapter.format(monthStart, 'MMMM', args.locale, system),
      days,
    });
  }

  const year = adapter.getEra(january, system).year;
  return { year, months };
}
