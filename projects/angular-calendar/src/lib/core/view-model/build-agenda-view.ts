import type { DateAdapter } from '../date-adapter/date-adapter';
import type { AgendaDay, AgendaViewArgs, AgendaViewModel } from './agenda-view-model';
import type { ViewPeriod } from './view-period';

/**
 * Build the agenda (list) view-model: `days` consecutive days from `viewDate`,
 * each carrying the events that overlap it, ordered all-day-first then by start.
 * Pure and DST-correct via the adapter; an event spanning multiple days appears
 * under each day it covers.
 */
export function buildAgendaView<TMeta = unknown>(
  adapter: DateAdapter,
  args: AgendaViewArgs<TMeta>,
): AgendaViewModel<TMeta> {
  const zone = args.viewDate.zone;
  const start = adapter.startOfDay(args.viewDate);

  // Pre-resolve each event's covered day range.
  const resolved = args.events.map((event) => {
    const s = adapter.toZoned(event.start, zone);
    const startDay = adapter.startOfDay(s);
    const e = event.end === undefined ? s : adapter.toZoned(event.end, zone);
    const lastInstant = adapter.differenceInMinutes(e, s) > 0 ? adapter.addMinutes(e, -1) : s;
    const lastDay = adapter.startOfDay(lastInstant);
    return { event, startMs: s.epochMs, startDayMs: startDay.epochMs, lastDayMs: lastDay.epochMs };
  });

  const days: AgendaDay<TMeta>[] = [];
  for (let i = 0; i < args.days; i++) {
    const date = adapter.startOfDay(adapter.addDays(start, i));
    const dayMs = date.epochMs;
    const todays = resolved
      .filter((r) => r.startDayMs <= dayMs && r.lastDayMs >= dayMs)
      .sort((a, b) => {
        const aAll = a.event.allDay === true ? 0 : 1;
        const bAll = b.event.allDay === true ? 0 : 1;
        return aAll !== bAll ? aAll - bAll : a.startMs - b.startMs;
      })
      .map((r) => r.event);
    if (args.hideEmptyDays === true && todays.length === 0) {
      continue;
    }
    days.push({
      date,
      isToday: args.today !== undefined && adapter.isSameDay(date, args.today),
      events: todays,
    });
  }

  const period: ViewPeriod = {
    start,
    end: adapter.startOfDay(adapter.addDays(start, args.days)),
    zone,
  };
  return { period, days };
}
