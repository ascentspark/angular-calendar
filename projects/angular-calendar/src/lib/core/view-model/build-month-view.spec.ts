import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { buildMonthView } from './build-month-view';

const adapter = new DateFnsDateAdapter();
const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => adapter.toZoned(new Date(iso), zone);

/** Flatten all day cells. */
const allDays = (vm: ReturnType<typeof buildMonthView>) => vm.weeks.flatMap((w) => w.days);
/** Find a day cell by its 'd MMM' label. */
const dayLabeled = (vm: ReturnType<typeof buildMonthView>, label: string) =>
  allDays(vm).find((d) => adapter.format(d.date, 'd MMM', 'en-US') === label);

describe('buildMonthView — grid', () => {
  // June 2026: Jun 1 is Monday; with weekStartsOn=0 the grid starts Sun May 31, 5 weeks.
  const vm = buildMonthView(adapter, {
    viewDate: at('2026-06-15T12:00:00Z'),
    events: [],
    weekStartsOn: 0,
    today: at('2026-06-15T12:00:00Z'),
  });

  it('produces 5 weeks of 7 days covering the month', () => {
    expect(vm.weeks.length).toBe(5);
    expect(vm.weeks.every((w) => w.days.length === 7)).toBe(true);
  });

  it('first cell is Sun May 31 (leading, not in month)', () => {
    const first = vm.weeks[0]!.days[0]!;
    expect(adapter.format(first.date, 'd MMM', 'en-US')).toBe('May 31');
    expect(first.inMonth).toBe(false);
    expect(first.isWeekend).toBe(true); // Sunday
  });

  it('marks in-month days and today correctly', () => {
    const jun15 = dayLabeled(vm, 'Jun 15')!;
    expect(jun15.inMonth).toBe(true);
    expect(jun15.isToday).toBe(true);
    expect(dayLabeled(vm, 'Jun 14')!.isToday).toBe(false);
  });

  it('weekend flags fall on Sun (col0) and Sat (col6)', () => {
    for (const week of vm.weeks) {
      expect(week.days[0]!.isWeekend).toBe(true);
      expect(week.days[6]!.isWeekend).toBe(true);
      expect(week.days[3]!.isWeekend).toBe(false);
    }
  });

  it('period spans the grid (start = first cell, end exclusive)', () => {
    expect(vm.period.start.epochMs).toBe(vm.weeks[0]!.days[0]!.date.epochMs);
    const lastDay = vm.weeks[4]!.days[6]!.date;
    // end is the day after the last cell
    expect(vm.period.end.epochMs).toBe(adapter.startOfDay(adapter.addDays(lastDay, 1)).epochMs);
  });
});

describe('buildMonthView — multi-day chip packing', () => {
  const event: CalendarEvent = {
    id: 'trip',
    start: at('2026-06-05T10:00:00Z'), // Fri Jun 5
    end: at('2026-06-09T12:00:00Z'), // Tue Jun 9
    title: 'Trip',
  };
  const vm = buildMonthView(adapter, {
    viewDate: at('2026-06-15T12:00:00Z'),
    events: [event],
    weekStartsOn: 0,
  });

  it('splits a cross-week event into one chip per week with continuation flags', () => {
    // Week 0 (May31–Jun6): Fri Jun5 col5, spans Jun5–Jun6 (2), continues after.
    const w0 = vm.weeks[0]!;
    const chip0 = w0.days[5]!.events.find((c) => c.event.id === 'trip')!;
    expect(chip0.span).toBe(2);
    expect(chip0.startColumn).toBe(5);
    expect(chip0.isStart).toBe(true);
    expect(chip0.continuesAfter).toBe(true);
    expect(chip0.isEnd).toBe(false);

    // Week 1 (Jun7–13): Sun Jun7 col0, spans Jun7–Jun9 (3), continues before, ends here.
    const w1 = vm.weeks[1]!;
    const chip1 = w1.days[0]!.events.find((c) => c.event.id === 'trip')!;
    expect(chip1.span).toBe(3);
    expect(chip1.startColumn).toBe(0);
    expect(chip1.continuesBefore).toBe(true);
    expect(chip1.isEnd).toBe(true);
    expect(chip1.isStart).toBe(false);
  });

  it('a single-day timed event covers exactly its day (span 1)', () => {
    const vm1 = buildMonthView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [{ id: 'm', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') }],
      weekStartsOn: 0,
    });
    const chip = dayLabeled(vm1, 'Jun 15')!.events.find((c) => c.event.id === 'm')!;
    expect(chip.span).toBe(1);
    expect(chip.isStart && chip.isEnd).toBe(true);
  });

  it('an event ending exactly at midnight does not cover the next day (half-open)', () => {
    const vm1 = buildMonthView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      // 2026-06-15 00:00 EDT → 2026-06-16 00:00 EDT (all of Jun 15 only)
      events: [{ id: 'allday', start: at('2026-06-15T04:00:00Z'), end: at('2026-06-16T04:00:00Z') }],
      weekStartsOn: 0,
    });
    const chip = dayLabeled(vm1, 'Jun 15')!.events.find((c) => c.event.id === 'allday')!;
    expect(chip.span).toBe(1);
    // Jun 16 should not carry the chip
    expect(dayLabeled(vm1, 'Jun 16')!.events.some((c) => c.event.id === 'allday')).toBe(false);
  });
});

describe('buildMonthView — overlap lanes & overflow', () => {
  const sameDay = (n: number): CalendarEvent => ({
    id: `e${n}`,
    start: at('2026-06-15T13:00:00Z'),
    end: at('2026-06-15T14:00:00Z'),
  });

  it('stacks overlapping same-day events onto distinct lanes', () => {
    const vm = buildMonthView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [sameDay(1), sameDay(2), sameDay(3)],
      weekStartsOn: 0,
    });
    const cell = dayLabeled(vm, 'Jun 15')!;
    expect(cell.events.length).toBe(3);
    expect([...cell.events.map((c) => c.lane)].sort()).toEqual([0, 1, 2]);
    expect(cell.overflowCount).toBe(0);
  });

  it('hides events beyond maxLanes and reports them as overflow', () => {
    const vm = buildMonthView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [sameDay(1), sameDay(2), sameDay(3), sameDay(4)],
      weekStartsOn: 0,
      maxLanes: 2,
    });
    const cell = dayLabeled(vm, 'Jun 15')!;
    expect(cell.events.length).toBe(2);
    expect(cell.events.every((c) => c.lane < 2)).toBe(true);
    expect(cell.overflowCount).toBe(2);
  });
});

describe('buildMonthView — DST month', () => {
  it('builds a valid grid for March 2026 (spring-forward) without error', () => {
    const vm = buildMonthView(adapter, {
      viewDate: at('2026-03-15T12:00:00Z'),
      events: [{ id: 'x', start: at('2026-03-08T12:00:00Z'), end: at('2026-03-08T13:00:00Z') }],
      weekStartsOn: 0,
    });
    expect(vm.weeks.length).toBeGreaterThanOrEqual(5);
    expect(vm.weeks.every((w) => w.days.length === 7)).toBe(true);
    // every day cell is a true local midnight in the zone
    for (const d of allDays(vm)) {
      expect(adapter.format(d.date, 'HH:mm', 'en-US')).toBe('00:00');
    }
  });
});
