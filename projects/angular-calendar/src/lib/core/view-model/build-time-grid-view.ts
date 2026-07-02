import type { DateAdapter } from '../date-adapter/date-adapter';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { CalendarEvent } from '../model/calendar-event';
import { packColumns } from '../layout/pack-columns';
import { packRows } from '../layout/pack-rows';
import type { Interval } from '../layout/interval';
import { offsetFraction, sizeFraction, type ProjectionRange } from '../layout/projection';
import { resolveTimeFormat } from '../config/calendar-config';
import type { PositionedChip } from './positioned-chip';
import type { PositionedEvent } from './positioned-event';
import type {
  TimeColumn,
  TimeGridViewArgs,
  TimeGridViewModel,
  TimeTick,
} from './time-grid-view-model';
import type { ViewPeriod } from './view-period';

const DEFAULT_WEEKEND: readonly number[] = [0, 6];

interface DayRange<TMeta> {
  readonly event: CalendarEvent<TMeta>;
  readonly startDayEpoch: number;
  readonly lastDayEpoch: number;
  readonly start: ZonedDateTime;
  readonly end: ZonedDateTime;
  readonly allDayLike: boolean;
}

/**
 * Minimum on-screen duration a horizontal (week-as-rows) event occupies for
 * lane-packing. A short chip is given a word-wide minimum width in CSS
 * (`--cal-tg` horizontal `.cal-tg__event` min-inline-size: 4.75rem ≈ 0.95h at the
 * 5rem/hour floor), so it can visually spill past its true end. Packing each event
 * as if it were at least this long forces two events that start within this window
 * onto separate lanes — so their widened chips stack vertically instead of
 * overlapping. Kept in sync with that CSS min-width; a no-op for vertical layout.
 */
const HORIZONTAL_MIN_VISUAL_MINUTES = 57;

/**
 * Build the week / work-week / day time-grid view-model.
 *
 * Timed events are clipped to the visible day window and packed side-by-side via
 * the sweep-line {@link packColumns}; all-day / multi-day events are row-packed
 * into the all-day band via {@link packRows}. Geometry is fraction-based (no DOM
 * reads); all date math is DST-correct through the adapter. Orientation is carried
 * in the model so the component can map the time axis to X or Y.
 */
export function buildTimeGridView<TMeta = unknown>(
  adapter: DateAdapter,
  args: TimeGridViewArgs<TMeta>,
): TimeGridViewModel<TMeta> {
  const zone = args.viewDate.zone;
  const weekend = args.weekendDays ?? DEFAULT_WEEKEND;
  const exclude = args.excludeDays ?? [];
  const range: ProjectionRange = {
    start: args.dayStartMinutes,
    total: Math.max(1, args.dayEndMinutes - args.dayStartMinutes),
  };

  // ── column day starts ──────────────────────────────────────────────────
  const base = args.anchorToWeek
    ? adapter.startOfWeek(args.viewDate, args.weekStartsOn)
    : adapter.startOfDay(args.viewDate);
  const columnDays: ZonedDateTime[] = [];
  for (let i = 0; i < 366 && columnDays.length < args.days; i++) {
    const day = adapter.startOfDay(adapter.addDays(base, i));
    if (!exclude.includes(adapter.getDayOfWeek(day))) {
      columnDays.push(day);
    }
  }
  const columnEpochs = columnDays.map((d) => d.epochMs);

  // ── resolve events to day ranges once ──────────────────────────────────
  const resolved: DayRange<TMeta>[] = args.events.map((event) => {
    const start = adapter.toZoned(event.start, zone);
    const end = event.end === undefined ? start : adapter.toZoned(event.end, zone);
    const startDay = adapter.startOfDay(start);
    const lastInstant =
      adapter.differenceInMinutes(end, start) > 0 ? adapter.addMinutes(end, -1) : start;
    const lastDay = adapter.startOfDay(lastInstant);
    const spansDays = lastDay.epochMs > startDay.epochMs;
    return {
      event,
      start,
      end,
      startDayEpoch: startDay.epochMs,
      lastDayEpoch: lastDay.epochMs,
      allDayLike: event.allDay === true || spansDays,
    };
  });

  // ── timed events per column ────────────────────────────────────────────
  const columns: TimeColumn<TMeta>[] = columnDays.map((day) => {
    // A normal day is 1439 min from its start to its end (23:59); a DST-transition day
    // is ~60 min shorter/longer. Only on those two days a year does elapsed-since-midnight
    // diverge from the wall clock, so we keep the cheap arithmetic path for every other day
    // and fall back to the exact (tz-aware) wall-clock read only when it actually matters.
    const isDstDay = Math.abs(adapter.differenceInMinutes(adapter.endOfDay(day), day) - 1439) > 1;
    // Wall-clock minutes into THIS column's day (DST-safe). Uses the entry's precomputed
    // start-of-day epoch (a cheap integer compare, no per-event tz call); instants on another
    // day resolve outside the window so they clamp with the continues flags.
    const wallMinInto = (instant: ZonedDateTime, instantDayEpoch: number): number => {
      if (instantDayEpoch !== day.epochMs) {
        return instant.epochMs < day.epochMs ? -1 : args.dayEndMinutes + 1;
      }
      return isDstDay
        ? adapter.getMinutesIntoDay(instant)
        : (instant.epochMs - day.epochMs) / 60_000;
    };
    const timed: Interval<{ entry: DayRange<TMeta>; cs: number; ce: number; cb: boolean; ca: boolean }>[] =
      [];
    for (const entry of resolved) {
      if (entry.allDayLike) {
        continue;
      }
      const evStartMin = wallMinInto(entry.start, entry.startDayEpoch);
      const evEndMin = wallMinInto(entry.end, entry.lastDayEpoch);
      const overlapsWindow = evEndMin > args.dayStartMinutes && evStartMin < args.dayEndMinutes;
      const pointInWindow =
        evStartMin === evEndMin &&
        evStartMin >= args.dayStartMinutes &&
        evStartMin <= args.dayEndMinutes;
      if (!overlapsWindow && !pointInWindow) {
        continue;
      }
      const cs = Math.max(evStartMin, args.dayStartMinutes);
      const ce = Math.min(Math.max(evEndMin, cs), args.dayEndMinutes);
      // Horizontal chips have a word-wide minimum width and can spill past their true
      // end; pack them as at least that wide so near-adjacent events stack onto
      // separate lanes rather than overlapping. Rendering still uses the real cs/ce.
      const packEnd =
        args.orientation === 'horizontal' ? Math.max(ce, cs + HORIZONTAL_MIN_VISUAL_MINUTES) : ce;
      timed.push({
        start: cs,
        end: packEnd,
        data: {
          entry,
          cs,
          ce,
          cb: evStartMin < args.dayStartMinutes,
          ca: evEndMin > args.dayEndMinutes,
        },
      });
    }

    const packed = packColumns(timed);
    const events: PositionedEvent<TMeta>[] = packed.items.map((item) => ({
      event: item.data.entry.event,
      lane: item.column,
      laneCount: item.columns,
      columnSpan: item.span,
      startOffset: offsetFraction(item.data.cs, range),
      span: sizeFraction(item.data.cs, item.data.ce, range),
      continuesBefore: item.data.cb,
      continuesAfter: item.data.ca,
    }));

    let nowOffset: number | null = null;
    if (args.now !== undefined && adapter.isSameDay(args.now, day)) {
      const nowMin = adapter.getMinutesIntoDay(args.now);
      if (nowMin >= args.dayStartMinutes && nowMin <= args.dayEndMinutes) {
        nowOffset = offsetFraction(nowMin, range);
      }
    }

    return {
      date: day,
      isToday: args.today !== undefined && adapter.isSameDay(day, args.today),
      isWeekend: weekend.includes(adapter.getDayOfWeek(day)),
      events,
      shade: [],
      nowOffset,
    };
  });

  // ── all-day band (row-packed across the visible columns) ────────────────
  const firstEpoch = columnEpochs[0] ?? base.epochMs;
  const lastEpoch = columnEpochs[columnEpochs.length - 1] ?? base.epochMs;
  const segments: {
    event: CalendarEvent<TMeta>;
    startColumn: number;
    span: number;
    continuesBefore: boolean;
    continuesAfter: boolean;
    isStart: boolean;
    isEnd: boolean;
  }[] = [];
  for (const entry of resolved) {
    if (!entry.allDayLike) {
      continue;
    }
    if (entry.lastDayEpoch < firstEpoch || entry.startDayEpoch > lastEpoch) {
      continue;
    }
    const segStart = Math.max(entry.startDayEpoch, firstEpoch);
    const segLast = Math.min(entry.lastDayEpoch, lastEpoch);
    const startColumn = columnEpochs.indexOf(segStart);
    const lastColumn = columnEpochs.indexOf(segLast);
    if (startColumn === -1 || lastColumn === -1) {
      continue;
    }
    segments.push({
      event: entry.event,
      startColumn,
      span: lastColumn - startColumn + 1,
      continuesBefore: entry.startDayEpoch < firstEpoch,
      continuesAfter: entry.lastDayEpoch > lastEpoch,
      isStart: entry.startDayEpoch >= firstEpoch,
      isEnd: entry.lastDayEpoch <= lastEpoch,
    });
  }
  const allDayPacked = packRows(
    segments.map((s) => ({ start: s.startColumn, end: s.startColumn + s.span, data: s })),
  );
  const allDay: PositionedChip<TMeta>[] = allDayPacked.items.map((item) => ({
    event: item.data.event,
    lane: item.lane,
    startColumn: item.data.startColumn,
    span: item.data.span,
    continuesBefore: item.data.continuesBefore,
    continuesAfter: item.data.continuesAfter,
    isStart: item.data.isStart,
    isEnd: item.data.isEnd,
  }));

  // ── time-axis ticks ──────────────────────────────────────────────────────
  // Gridlines are drawn at the `slotMinutes` interval (min 5 as a sanity floor);
  // labels are attached only to the on-the-hour "major" ticks so a fine slot (15/30
  // min) subdivides the grid without crowding the axis with labels.
  const tickStep = Math.max(5, args.slotMinutes);
  const ticks: TimeTick[] = [];
  const tickAnchor = columnDays[0] ?? base;
  const timeFormat = resolveTimeFormat(args.hour12 ?? null);
  for (let m = args.dayStartMinutes; m <= args.dayEndMinutes; m += tickStep) {
    const major = m % 60 === 0;
    const instant = adapter.addMinutes(tickAnchor, m);
    ticks.push({
      offset: offsetFraction(m, range),
      minutes: m,
      label: major ? adapter.format(instant, timeFormat, args.locale) : '',
      major,
    });
  }

  const period: ViewPeriod = {
    start: columnDays[0] ?? base,
    end: adapter.startOfDay(adapter.addDays(columnDays[columnDays.length - 1] ?? base, 1)),
    zone,
  };

  return {
    period,
    orientation: args.orientation,
    columns,
    ticks,
    slotMinutes: args.slotMinutes,
    dayStartMinutes: args.dayStartMinutes,
    dayEndMinutes: args.dayEndMinutes,
    allDay,
  };
}
