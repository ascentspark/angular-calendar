import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { RruleRecurrenceAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { addRecurrenceException, splitSeriesAt } from './recurrence-edit';
import { expandRecurringEvents } from './expand-recurring-events';

const dates = new DateFnsDateAdapter();
const recurrence = new RruleRecurrenceAdapter();
const NY = 'America/New_York';
const at = (iso: string): ZonedDateTime => dates.toZoned(new Date(iso), NY);

describe('addRecurrenceException', () => {
  it('adds the occurrence to the exception list and stops generating it', () => {
    const series: CalendarEvent = {
      id: 's',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
      recurrenceRule: 'FREQ=DAILY;COUNT=3',
    };
    const edited = addRecurrenceException(series, at('2026-06-16T13:00:00Z'));
    expect(edited.recurrenceExceptions?.length).toBe(1);
    const occ = expandRecurringEvents([edited], {
      recurrence,
      dates,
      windowStart: at('2026-06-01T00:00:00Z'),
      windowEnd: at('2026-06-30T00:00:00Z'),
      zone: NY,
    });
    expect(occ.length).toBe(2); // Jun 16 excluded
  });
});

describe('splitSeriesAt', () => {
  it('terminates the head before the split and the tail starts at the split', () => {
    const series: CalendarEvent = {
      id: 's',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
      recurrenceRule: 'FREQ=DAILY',
    };
    const splitPoint = at('2026-06-18T13:00:00Z');
    const split = splitSeriesAt(series, splitPoint, { recurrence, dates });
    // head should now stop before Jun 18
    const headOcc = expandRecurringEvents([split.head], {
      recurrence,
      dates,
      windowStart: at('2026-06-01T00:00:00Z'),
      windowEnd: at('2026-06-30T00:00:00Z'),
      zone: NY,
    });
    const days = headOcc.map((o) => dates.format(dates.toZoned(o.start, NY), 'd MMM', 'en-US'));
    expect(days).toEqual(['Jun 15', 'Jun 16', 'Jun 17']);
    expect(split.tailStart.epochMs).toBe(splitPoint.epochMs);
    expect(split.tailRule).toContain('FREQ=DAILY');
  });
});
