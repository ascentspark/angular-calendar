import type { DateAdapter } from '../date-adapter/date-adapter';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { CalendarEvent } from '../model/calendar-event';
import { packColumns } from '../layout/pack-columns';
import type { Interval } from '../layout/interval';
import { offsetFraction, type ProjectionRange } from '../layout/projection';
import { resolveTimeFormat } from '../config/calendar-config';
import { flattenResources } from './flatten-resources';
import type { PositionedEvent, ShadeBand } from './positioned-event';
import type {
  ResourceRow,
  TimeHeaderCell,
  TimeHeaderRow,
  TimeHeaderUnit,
  TimelineViewArgs,
  TimelineViewModel,
} from './timeline-view-model';
import type { ViewPeriod } from './view-period';

const LABEL_PATTERN: Record<TimeHeaderUnit, string> = {
  year: 'y',
  month: 'MMMM y',
  week: 'd MMM',
  day: 'EEE d',
  hour: 'HH:mm',
  minute: 'HH:mm',
};

/**
 * Build the resource × time timeline (dispatch board) view-model.
 *
 * The time axis is a continuous range of `days` consecutive days (single-day for
 * a classic dispatch board). Resources are flattened (honouring tree expand) into
 * lanes; each lane's events are time-projected and packed into sub-lanes via the
 * sweep-line {@link packColumns}. Multi-level headers (e.g. day over hour) are
 * generated declaratively. Off-hours (from `resource.workHours`) and block-out
 * (`isBlock`) events become shading bands. Pure, DOM-free, DST-correct.
 */
export function buildTimelineView<TMeta = unknown>(
  adapter: DateAdapter,
  args: TimelineViewArgs<TMeta>,
): TimelineViewModel<TMeta> {
  const zone = args.viewDate.zone;
  const base = adapter.startOfDay(args.viewDate);
  const rangeStart = adapter.addMinutes(base, args.dayStartMinutes);
  const lastDayBase = adapter.startOfDay(adapter.addDays(args.viewDate, args.days - 1));
  const rangeEnd = adapter.addMinutes(lastDayBase, args.dayEndMinutes);
  const total = Math.max(1, adapter.differenceInMinutes(rangeEnd, rangeStart));
  const range: ProjectionRange = { start: 0, total };

  /** Absolute minutes of an instant from the range start. */
  const minOf = (d: ZonedDateTime): number => adapter.differenceInMinutes(d, rangeStart);

  // ── header rows ─────────────────────────────────────────────────────────
  const headerRows: TimeHeaderRow[] = args.headerGroupings.map((unit) => ({
    groupBy: unit,
    cells: buildHeaderCells(adapter, unit, rangeStart, rangeEnd, range, args),
  }));

  // ── now indicator ────────────────────────────────────────────────────────
  let nowOffset: number | null = null;
  if (args.now !== undefined) {
    const nowMin = minOf(args.now);
    if (nowMin >= 0 && nowMin <= total) {
      nowOffset = offsetFraction(nowMin, range);
    }
  }

  // ── resource rows ─────────────────────────────────────────────────────────
  // Bucket events by resource id once (O(events)) instead of filtering the full
  // event list per resource (O(resources × events)).
  const eventsByResource = new Map<string, CalendarEvent<TMeta>[]>();
  for (const event of args.events) {
    for (const rid of event.resourceIds ?? []) {
      const bucket = eventsByResource.get(rid);
      if (bucket === undefined) {
        eventsByResource.set(rid, [event]);
      } else {
        bucket.push(event);
      }
    }
  }
  const flat = flattenResources(args.resources);
  const resourceRows: ResourceRow<TMeta>[] = flat.map(({ resource, depth, hasChildren }) => {
    const mine = eventsByResource.get(resource.id) ?? [];

    const intervals: Interval<{
      event: CalendarEvent<TMeta>;
      cs: number;
      ce: number;
      cb: boolean;
      ca: boolean;
    }>[] = [];
    const blockBands: ShadeBand[] = [];

    for (const event of mine) {
      const start = adapter.toZoned(event.start, zone);
      const end = event.end === undefined ? start : adapter.toZoned(event.end, zone);
      const sMin = minOf(start);
      const eMin = minOf(end);
      if (!(eMin > 0 && sMin < total)) {
        continue;
      }
      const cs = Math.max(0, sMin);
      const ce = Math.min(Math.max(eMin, cs), total);
      if (event.isBlock === true) {
        blockBands.push({ startOffset: cs / total, span: (ce - cs) / total, kind: 'block' });
        continue;
      }
      intervals.push({
        start: cs,
        end: ce,
        data: { event, cs, ce, cb: sMin < 0, ca: eMin > total },
      });
    }

    const packed = packColumns(intervals);
    let laneCount = 0;
    const events: PositionedEvent<TMeta>[] = packed.items.map((item) => {
      laneCount = Math.max(laneCount, item.column + 1);
      return {
        event: item.data.event,
        lane: item.column,
        laneCount: item.columns,
        columnSpan: item.span,
        startOffset: offsetFraction(item.data.cs, range),
        span: (item.data.ce - item.data.cs) / total,
        continuesBefore: item.data.cb,
        continuesAfter: item.data.ca,
      };
    });

    const offBands = buildOffHoursShade(adapter, resource.workHours, args, base, rangeStart, total);

    return {
      resource,
      depth,
      hasChildren,
      events,
      laneCount: Math.max(1, laneCount),
      shade: [...offBands, ...blockBands],
    };
  });

  const period: ViewPeriod = { start: rangeStart, end: rangeEnd, zone };

  return {
    period,
    orientation: args.orientation,
    headerRows,
    resourceRows,
    nowOffset,
  };
}

function buildHeaderCells<TMeta>(
  adapter: DateAdapter,
  unit: TimeHeaderUnit,
  rangeStart: ZonedDateTime,
  rangeEnd: ZonedDateTime,
  range: ProjectionRange,
  args: TimelineViewArgs<TMeta>,
): TimeHeaderCell[] {
  const cells: TimeHeaderCell[] = [];
  let cursor = startOfUnit(adapter, rangeStart, unit, args.weekStartsOn);
  const minOf = (d: ZonedDateTime): number => adapter.differenceInMinutes(d, rangeStart);
  const nowMin = args.now !== undefined ? minOf(args.now) : null;

  for (let guard = 0; guard < 5000; guard++) {
    if (cursor.epochMs >= rangeEnd.epochMs) {
      break;
    }
    const next = nextUnit(adapter, cursor, unit);
    const cellStartMs = Math.max(cursor.epochMs, rangeStart.epochMs);
    const cellEndMs = Math.min(next.epochMs, rangeEnd.epochMs);
    const sMin = (cellStartMs - rangeStart.epochMs) / 60000;
    const eMin = (cellEndMs - rangeStart.epochMs) / 60000;
    const pattern =
      unit === 'hour' || unit === 'minute'
        ? resolveTimeFormat(args.hour12 ?? null)
        : LABEL_PATTERN[unit];
    cells.push({
      offset: offsetFraction(sMin, range),
      span: (eMin - sMin) / range.total,
      label: adapter.format(cursor, pattern, args.locale),
      isNow: nowMin !== null && nowMin >= sMin && nowMin < eMin,
    });
    cursor = next;
  }
  return cells;
}

function startOfUnit(
  adapter: DateAdapter,
  d: ZonedDateTime,
  unit: TimeHeaderUnit,
  weekStartsOn: number,
): ZonedDateTime {
  switch (unit) {
    case 'day':
      return adapter.startOfDay(d);
    case 'hour': {
      const into = adapter.getMinutesIntoDay(d);
      return adapter.addMinutes(adapter.startOfDay(d), Math.floor(into / 60) * 60);
    }
    case 'minute': {
      const into = adapter.getMinutesIntoDay(d);
      return adapter.addMinutes(adapter.startOfDay(d), Math.floor(into));
    }
    case 'week':
      return adapter.startOfWeek(d, weekStartsOn);
    case 'month':
      return adapter.startOfMonth(d);
    case 'year': {
      let m = adapter.startOfMonth(d);
      for (let i = 0; i < 11 && adapter.getEra(m, 'gregory').month !== 1; i++) {
        m = adapter.startOfMonth(adapter.addMonths(m, -1));
      }
      return m;
    }
  }
}

function nextUnit(adapter: DateAdapter, d: ZonedDateTime, unit: TimeHeaderUnit): ZonedDateTime {
  switch (unit) {
    case 'day':
      return adapter.startOfDay(adapter.addDays(d, 1));
    case 'hour':
      return adapter.addMinutes(d, 60);
    case 'minute':
      return adapter.addMinutes(d, 1);
    case 'week':
      return adapter.addDays(d, 7);
    case 'month':
      return adapter.startOfMonth(adapter.addMonths(d, 1));
    case 'year':
      return adapter.startOfMonth(adapter.addMonths(d, 12));
  }
}

/** Off-hours shading bands (complement of the resource's working windows). */
function buildOffHoursShade<TMeta>(
  adapter: DateAdapter,
  workHours: readonly { daysOfWeek: readonly number[]; startMinutes: number; endMinutes: number }[] | undefined,
  args: TimelineViewArgs<TMeta>,
  base: ZonedDateTime,
  rangeStart: ZonedDateTime,
  total: number,
): ShadeBand[] {
  if (workHours === undefined || workHours.length === 0) {
    return [];
  }
  const minOf = (d: ZonedDateTime): number => adapter.differenceInMinutes(d, rangeStart);
  const work: [number, number][] = [];
  for (let d = 0; d < args.days; d++) {
    const dayBase = adapter.startOfDay(adapter.addDays(base, d));
    const dow = adapter.getDayOfWeek(dayBase);
    for (const wh of workHours) {
      if (!wh.daysOfWeek.includes(dow)) {
        continue;
      }
      const s = minOf(adapter.addMinutes(dayBase, wh.startMinutes));
      const e = minOf(adapter.addMinutes(dayBase, wh.endMinutes));
      const cs = Math.max(0, s);
      const ce = Math.min(total, e);
      if (ce > cs) {
        work.push([cs, ce]);
      }
    }
  }
  // Union then complement within [0, total].
  work.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of work) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  const off: ShadeBand[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) {
      off.push({ startOffset: pos / total, span: (s - pos) / total, kind: 'off' });
    }
    pos = Math.max(pos, e);
  }
  if (pos < total) {
    off.push({ startOffset: pos / total, span: (total - pos) / total, kind: 'off' });
  }
  return off;
}
