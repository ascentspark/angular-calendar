import type { DateAdapter } from '../date-adapter/date-adapter';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { CalendarEvent } from '../model/calendar-event';
import { packRows } from '../layout/pack-rows';
import type { Interval } from '../layout/interval';
import type { MonthDay, MonthViewArgs, MonthViewModel, MonthWeek } from './month-view-model';
import type { PositionedChip } from './positioned-chip';
import type { ViewPeriod } from './view-period';

const DAYS_PER_WEEK = 7;
const DEFAULT_WEEKEND: readonly number[] = [0, 6];

/** Absolute epoch ms of a `Date | ZonedDateTime` (for stable start-sorting). */
function epochOf(value: Date | ZonedDateTime): number {
  return value instanceof Date ? value.getTime() : value.epochMs;
}

/** Resolve an event endpoint to a `ZonedDateTime` in the display zone. */
function resolve(
  adapter: DateAdapter,
  value: Date | ZonedDateTime,
  zone: string,
): ZonedDateTime {
  return adapter.toZoned(value, zone);
}

/** A per-week segment of an event before lane assignment. */
interface Segment<TMeta> {
  readonly event: CalendarEvent<TMeta>;
  readonly startColumn: number;
  readonly span: number;
  readonly continuesBefore: boolean;
  readonly continuesAfter: boolean;
  readonly isStart: boolean;
  readonly isEnd: boolean;
}

/**
 * Build the month grid view-model: a stable 4–6 week grid covering the focused
 * month, with multi-day events packed into non-overlapping lanes per week.
 *
 * Pure and DOM-free; all date math is delegated to {@link DateAdapter} so it is
 * timezone- and DST-correct (each day is materialised via `addDays`/`startOfDay`,
 * never by adding fixed millisecond amounts). Geometry is abstract day-columns.
 */
export function buildMonthView<TMeta = unknown>(
  adapter: DateAdapter,
  args: MonthViewArgs<TMeta>,
): MonthViewModel<TMeta> {
  const zone = args.viewDate.zone;
  const weekendDays = args.weekendDays ?? DEFAULT_WEEKEND;
  const maxLanes = args.maxLanes ?? Number.POSITIVE_INFINITY;

  const monthStart = adapter.startOfMonth(args.viewDate);
  const nextMonthStart = adapter.startOfMonth(adapter.addMonths(args.viewDate, 1));
  const monthLastDay = adapter.startOfDay(adapter.addDays(nextMonthStart, -1));
  const gridStart = adapter.startOfWeek(monthStart, args.weekStartsOn);

  // Pre-resolve each event's covered day range [startDayEpoch, lastDayEpoch].
  const ranges = args.events.map((event) => {
    const start = resolve(adapter, event.start, zone);
    const startDay = adapter.startOfDay(start);
    const end = event.end === undefined ? start : resolve(adapter, event.end, zone);
    // Half-open: an event ending exactly at midnight does not cover that day.
    const lastInstant =
      adapter.differenceInMinutes(end, start) > 0 ? adapter.addMinutes(end, -1) : start;
    const lastDay = adapter.startOfDay(lastInstant);
    return { event, startDayEpoch: startDay.epochMs, lastDayEpoch: lastDay.epochMs };
  });

  const weeks: MonthWeek<TMeta>[] = [];
  let weekIndex = 0;

  while (true) {
    const weekStart = adapter.startOfDay(adapter.addDays(gridStart, weekIndex * DAYS_PER_WEEK));
    if (weekStart.epochMs > monthLastDay.epochMs) {
      break;
    }

    // Materialise the 7 day boundaries for this week.
    const dayStarts: ZonedDateTime[] = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
      dayStarts.push(adapter.startOfDay(adapter.addDays(weekStart, i)));
    }
    const dayEpochs = dayStarts.map((d) => d.epochMs);
    const weekStartEpoch = dayEpochs[0] ?? weekStart.epochMs;
    const weekEndEpoch = dayEpochs[DAYS_PER_WEEK - 1] ?? weekStart.epochMs;

    // Build segments for events intersecting this week.
    const segments: Segment<TMeta>[] = [];
    for (const { event, startDayEpoch, lastDayEpoch } of ranges) {
      if (lastDayEpoch < weekStartEpoch || startDayEpoch > weekEndEpoch) {
        continue;
      }
      const segStartEpoch = Math.max(startDayEpoch, weekStartEpoch);
      const segLastEpoch = Math.min(lastDayEpoch, weekEndEpoch);
      const startColumn = dayEpochs.indexOf(segStartEpoch);
      const lastColumn = dayEpochs.indexOf(segLastEpoch);
      if (startColumn === -1 || lastColumn === -1) {
        continue;
      }
      segments.push({
        event,
        startColumn,
        span: lastColumn - startColumn + 1,
        continuesBefore: startDayEpoch < weekStartEpoch,
        continuesAfter: lastDayEpoch > weekEndEpoch,
        isStart: startDayEpoch >= weekStartEpoch,
        isEnd: lastDayEpoch <= weekEndEpoch,
      });
    }

    // Lane-pack the segments across day-columns.
    const intervals: Interval<Segment<TMeta>>[] = segments.map((s) => ({
      start: s.startColumn,
      end: s.startColumn + s.span,
      data: s,
    }));
    const packed = packRows(intervals);
    const chips: PositionedChip<TMeta>[] = packed.items.map((item) => ({
      event: item.data.event,
      lane: item.lane,
      startColumn: item.data.startColumn,
      span: item.data.span,
      continuesBefore: item.data.continuesBefore,
      continuesAfter: item.data.continuesAfter,
      isStart: item.data.isStart,
      isEnd: item.data.isEnd,
    }));

    // Assemble day cells.
    const days: MonthDay<TMeta>[] = dayStarts.map((date, column) => {
      const anchored = chips
        .filter((c) => c.startColumn === column && c.lane < maxLanes)
        .sort((a, b) => a.lane - b.lane);
      const overflowCount = chips.filter(
        (c) => c.startColumn <= column && column < c.startColumn + c.span && c.lane >= maxLanes,
      ).length;
      const dayEpoch = dayEpochs[column] ?? date.epochMs;
      const dayEvents = ranges
        .filter((r) => r.startDayEpoch <= dayEpoch && dayEpoch <= r.lastDayEpoch)
        .map((r) => r.event)
        .sort((a, b) => epochOf(a.start) - epochOf(b.start));
      return {
        date,
        inMonth: adapter.startOfMonth(date).epochMs === monthStart.epochMs,
        isToday: args.today !== undefined && adapter.isSameDay(date, args.today),
        isWeekend: weekendDays.includes(adapter.getDayOfWeek(date)),
        events: anchored,
        overflowCount,
        dayEvents,
      };
    });

    weeks.push({ days });
    weekIndex++;
  }

  const lastWeek = weeks[weeks.length - 1];
  const periodEnd = adapter.startOfDay(
    adapter.addDays(gridStart, weeks.length * DAYS_PER_WEEK),
  );
  const period: ViewPeriod = {
    start: gridStart,
    end: lastWeek ? periodEnd : gridStart,
    zone,
  };

  return { period, weeks };
}
