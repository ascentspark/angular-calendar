import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
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
