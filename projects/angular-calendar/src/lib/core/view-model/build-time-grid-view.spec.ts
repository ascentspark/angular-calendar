import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { buildTimeGridView } from './build-time-grid-view';

const adapter = new DateFnsDateAdapter();
const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => adapter.toZoned(new Date(iso), zone);

const baseArgs = {
  weekStartsOn: 0,
  orientation: 'vertical' as const,
  slotMinutes: 60,
  dayStartMinutes: 0,
  dayEndMinutes: 1440,
  locale: 'en-US',
};

describe('buildTimeGridView — columns', () => {
  it('day view produces 1 column; week view produces 7', () => {
    const day = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      days: 1,
      anchorToWeek: false,
    });
    expect(day.columns.length).toBe(1);

    const week = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      days: 7,
      anchorToWeek: true,
    });
    expect(week.columns.length).toBe(7);
  });

  it('work-week excludes weekend days', () => {
    const ww = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      days: 5,
      anchorToWeek: true,
      excludeDays: [0, 6],
    });
    expect(ww.columns.length).toBe(5);
    expect(ww.columns.every((c) => !c.isWeekend)).toBe(true);
  });
});

describe('buildTimeGridView — timed placement', () => {
  it('positions a 9–10am event at the right offset/size of a full-day window', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      // 09:00–10:00 EDT == 13:00–14:00Z
      events: [{ id: 'a', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') }],
      days: 1,
      anchorToWeek: false,
    });
    const ev = vm.columns[0]!.events[0]!;
    expect(ev.startOffset).toBeCloseTo(540 / 1440, 6);
    expect(ev.span).toBeCloseTo(60 / 1440, 6);
    expect(ev.continuesBefore).toBe(false);
  });

  it('clips an event to the visible window and flags continuation', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      dayStartMinutes: 480, // 08:00
      dayEndMinutes: 1080, // 18:00
      viewDate: at('2026-06-15T12:00:00Z'),
      // 07:00–09:00 EDT == 11:00–13:00Z; starts before the 08:00 window
      events: [{ id: 'a', start: at('2026-06-15T11:00:00Z'), end: at('2026-06-15T13:00:00Z') }],
      days: 1,
      anchorToWeek: false,
    });
    const ev = vm.columns[0]!.events[0]!;
    expect(ev.continuesBefore).toBe(true);
    expect(ev.startOffset).toBeCloseTo(0, 6); // clipped to window start
    expect(ev.span).toBeCloseTo(60 / 600, 6); // 08:00–09:00 within a 10h window
  });

  it('packs overlapping events into distinct lanes', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [
        { id: 'a', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
        { id: 'b', start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T16:00:00Z') },
      ],
      days: 1,
      anchorToWeek: false,
    });
    const evs = vm.columns[0]!.events;
    expect(evs.length).toBe(2);
    expect(evs.every((e) => e.laneCount === 2)).toBe(true);
    expect(new Set(evs.map((e) => e.lane))).toEqual(new Set([0, 1]));
  });

  it('horizontal stacks near-adjacent short events onto separate lanes (min visual width)', () => {
    // Two back-to-back 30-min events do not overlap in time, but a horizontal chip's
    // word-wide min-width would make them spill and collide — so they must lane apart.
    const events = [
      { id: 'a', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T13:30:00Z') },
      { id: 'b', start: at('2026-06-15T13:30:00Z'), end: at('2026-06-15T14:00:00Z') },
    ];
    const shared = {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events,
      days: 1,
      anchorToWeek: false,
    };

    // Vertical: true time-width, no spill → they share a single lane.
    const vertical = buildTimeGridView(adapter, shared);
    expect(vertical.columns[0]!.events.every((e) => e.laneCount === 1)).toBe(true);

    // Horizontal: packed as ≥57 min each → stacked onto two lanes, no overlap.
    const horizontal = buildTimeGridView(adapter, { ...shared, orientation: 'horizontal' });
    const hevs = horizontal.columns[0]!.events;
    expect(hevs.every((e) => e.laneCount === 2)).toBe(true);
    expect(new Set(hevs.map((e) => e.lane))).toEqual(new Set([0, 1]));
  });
});

describe('buildTimeGridView — all-day band', () => {
  it('routes all-day events to the band, not the columns', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [{ id: 'a', allDay: true, start: at('2026-06-15T04:00:00Z'), end: at('2026-06-16T04:00:00Z') }],
      days: 7,
      anchorToWeek: true,
    });
    expect(vm.allDay.length).toBe(1);
    expect(vm.columns.every((c) => c.events.length === 0)).toBe(true);
  });

  it('a multi-day timed event spans the band across columns', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      // Tue 16th 13:00Z → Thu 18th 14:00Z spans 3 days
      events: [{ id: 'a', start: at('2026-06-16T13:00:00Z'), end: at('2026-06-18T14:00:00Z') }],
      days: 7,
      anchorToWeek: true,
    });
    expect(vm.allDay.length).toBe(1);
    expect(vm.allDay[0]!.span).toBe(3);
  });
});

describe('buildTimeGridView — now indicator & ticks', () => {
  it('sets nowOffset only on the column matching "now"', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      days: 7,
      anchorToWeek: true,
      now: at('2026-06-15T16:00:00Z'), // noon EDT on Mon Jun 15
    });
    const withNow = vm.columns.filter((c) => c.nowOffset !== null);
    expect(withNow.length).toBe(1);
    expect(withNow[0]!.nowOffset).toBeCloseTo(720 / 1440, 4);
  });

  it('emits hourly tick labels across the window', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      dayStartMinutes: 480,
      dayEndMinutes: 600,
      slotMinutes: 60,
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      days: 1,
      anchorToWeek: false,
      hour12: false, // 24-hour labels regardless of locale
    });
    expect(vm.ticks.map((t) => t.label)).toEqual(['08:00', '09:00', '10:00']);
    expect(vm.ticks[0]!.offset).toBe(0);
    expect(vm.ticks[2]!.offset).toBe(1);
  });
});

describe('buildTimeGridView — DST day', () => {
  it('handles a spring-forward day window without error', () => {
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: at('2026-03-08T12:00:00Z'),
      events: [{ id: 'a', start: at('2026-03-08T12:00:00Z'), end: at('2026-03-08T13:00:00Z') }],
      days: 1,
      anchorToWeek: false,
    });
    expect(vm.columns.length).toBe(1);
    expect(vm.columns[0]!.events.length).toBe(1);
  });
});

describe('buildTimeGridView — DST', () => {
  it('positions events by wall-clock time on a spring-forward day (no 1h drift)', () => {
    // 2026-03-08 America/New_York springs forward 02:00 EST → 03:00 EDT.
    // A 09:00 local event must render at the 09:00 row (540/1440), not 08:00 (480/1440,
    // the absolute-elapsed-minutes bug that skips the lost hour).
    const start = at('2026-03-08T13:00:00Z'); // 09:00 EDT
    const end = at('2026-03-08T14:00:00Z'); // 10:00 EDT
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: start,
      events: [{ id: 'a', start, end }],
      days: 1,
      anchorToWeek: false,
    });
    const ev = vm.columns[0]!.events[0]!;
    expect(ev.startOffset).toBeCloseTo(540 / 1440, 3);
    expect(ev.span).toBeCloseTo(60 / 1440, 3);
  });

  it('positions the now-line by wall-clock time on a spring-forward day', () => {
    const now = at('2026-03-08T17:30:00Z'); // 13:30 EDT
    const vm = buildTimeGridView(adapter, {
      ...baseArgs,
      viewDate: now,
      now,
      today: now,
      events: [],
      days: 1,
      anchorToWeek: false,
    });
    // 13:30 wall clock → 810/1440, not 750/1440 (absolute, one hour short)
    expect(vm.columns[0]!.nowOffset).toBeCloseTo(810 / 1440, 3);
  });
});

describe('buildTimeGridView — hour12', () => {
  const base = {
    ...baseArgs,
    viewDate: at('2026-06-15T12:00:00Z'),
    events: [],
    days: 1,
    anchorToWeek: false,
    slotMinutes: 60,
  };
  const tickLabel = (vm: ReturnType<typeof buildTimeGridView>, min: number): string | undefined =>
    vm.ticks.find((t) => t.minutes === min)?.label;

  it('renders 24-hour tick labels when hour12 is false', () => {
    const vm = buildTimeGridView(adapter, { ...base, hour12: false });
    expect(tickLabel(vm, 780)).toBe('13:00'); // 1pm
  });

  it('renders 12-hour tick labels when hour12 is true', () => {
    const vm = buildTimeGridView(adapter, { ...base, hour12: true });
    expect(tickLabel(vm, 780)).toMatch(/1:00\s?PM/i);
  });
});
