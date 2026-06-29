import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { RruleRecurrenceAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { expandRecurringEvents } from './expand-recurring-events';

const dates = new DateFnsDateAdapter();
const recurrence = new RruleRecurrenceAdapter();
const NY = 'America/New_York';
const at = (iso: string): ZonedDateTime => dates.toZoned(new Date(iso), NY);
const ctx = (over: Partial<Parameters<typeof expandRecurringEvents>[1]> = {}) => ({
  recurrence,
  dates,
  windowStart: at('2026-06-01T00:00:00Z'),
  windowEnd: at('2026-06-30T00:00:00Z'),
  zone: NY,
  ...over,
});

describe('expandRecurringEvents', () => {
  it('passes non-recurring events through unchanged', () => {
    const e: CalendarEvent = { id: 'a', start: at('2026-06-15T13:00:00Z') };
    expect(expandRecurringEvents([e], ctx())).toEqual([e]);
  });

  it('expands a recurring event into concrete occurrences preserving duration', () => {
    const e: CalendarEvent = {
      id: 'series',
      title: 'Daily sync',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T13:30:00Z'),
      recurrenceRule: 'FREQ=DAILY;COUNT=3',
      status: 'scheduled',
    };
    const out = expandRecurringEvents([e], ctx());
    expect(out.length).toBe(3);
    // each occurrence carries the series id, a unique id, no rule, 30-min duration
    for (const occ of out) {
      expect(occ.recurrenceId).toBe('series');
      expect(occ.recurrenceRule).toBeUndefined();
      expect(occ.title).toBe('Daily sync');
      expect(occ.status).toBe('scheduled');
      const s = dates.toZoned(occ.start, NY);
      const en = dates.toZoned(occ.end!, NY);
      expect(dates.differenceInMinutes(en, s)).toBe(30);
    }
    expect(new Set(out.map((o) => o.id)).size).toBe(3); // unique ids
  });

  it('honours per-event exceptions', () => {
    const e: CalendarEvent = {
      id: 's',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
      recurrenceRule: 'FREQ=DAILY;COUNT=4',
      recurrenceExceptions: [at('2026-06-16T13:00:00Z')],
    };
    const out = expandRecurringEvents([e], ctx());
    expect(out.length).toBe(3);
  });

  it('mixes recurring and non-recurring events', () => {
    const events: CalendarEvent[] = [
      { id: 'one', start: at('2026-06-10T13:00:00Z') },
      { id: 'rec', start: at('2026-06-15T13:00:00Z'), recurrenceRule: 'FREQ=DAILY;COUNT=2' },
    ];
    const out = expandRecurringEvents(events, ctx());
    expect(out.length).toBe(3); // 1 + 2
    expect(out.filter((o) => o.recurrenceId === 'rec').length).toBe(2);
  });
});
