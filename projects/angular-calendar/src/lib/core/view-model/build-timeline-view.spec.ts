import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type {
  CalendarEvent,
  CalendarResource,
  ZonedDateTime,
} from '@ascentsparksoftware/angular-calendar';
import { buildTimelineView } from './build-timeline-view';

const adapter = new DateFnsDateAdapter();
const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => adapter.toZoned(new Date(iso), zone);

const techs: CalendarResource[] = [
  { id: 't1', name: 'Alice' },
  { id: 't2', name: 'Bob' },
];

const base = {
  weekStartsOn: 0,
  orientation: 'horizontal' as const,
  locale: 'en-US',
};

describe('buildTimelineView — lanes & placement', () => {
  it('creates one row per resource and places events on the owning lane', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') },
      { id: 'b', resourceIds: ['t2'], start: at('2026-06-15T15:00:00Z'), end: at('2026-06-15T16:00:00Z') },
    ];
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'),
      resources: techs,
      events,
      days: 1,
      dayStartMinutes: 480, // 08:00
      dayEndMinutes: 1080, // 18:00
      headerGroupings: ['hour'],
    });
    expect(vm.resourceRows.length).toBe(2);
    expect(vm.resourceRows[0]!.resource.id).toBe('t1');
    expect(vm.resourceRows[0]!.events.map((e) => e.event.id)).toEqual(['a']);
    expect(vm.resourceRows[1]!.events.map((e) => e.event.id)).toEqual(['b']);
    // 09:00 EDT is 60 min into an 08:00 window of 600 min
    expect(vm.resourceRows[0]!.events[0]!.startOffset).toBeCloseTo(60 / 600, 6);
    expect(vm.resourceRows[0]!.events[0]!.span).toBeCloseTo(60 / 600, 6);
  });

  it('packs overlapping events in one resource into sub-lanes', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'b', resourceIds: ['t1'], start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T16:00:00Z') },
    ];
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'),
      resources: techs,
      events,
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    const row = vm.resourceRows[0]!;
    expect(row.laneCount).toBe(2);
    expect(new Set(row.events.map((e) => e.lane))).toEqual(new Set([0, 1]));
  });
});

describe('buildTimelineView — headers', () => {
  it('builds multi-level day + hour headers across the range', () => {
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'),
      resources: techs,
      events: [],
      days: 2,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['day', 'hour'],
    });
    expect(vm.headerRows.length).toBe(2);
    expect(vm.headerRows[0]!.groupBy).toBe('day');
    expect(vm.headerRows[0]!.cells.length).toBe(2); // two days
    expect(vm.headerRows[1]!.groupBy).toBe('hour');
    expect(vm.headerRows[1]!.cells.length).toBe(48); // 2 × 24 hours
    // first day cell spans half the 2-day range
    expect(vm.headerRows[0]!.cells[0]!.span).toBeCloseTo(0.5, 4);
  });
});

describe('buildTimelineView — shading', () => {
  it('shades off-hours from resource workHours', () => {
    const withHours: CalendarResource[] = [
      { id: 't1', name: 'Alice', workHours: [{ daysOfWeek: [1], startMinutes: 540, endMinutes: 1020 }] },
    ];
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'), // Mon Jun 15 (dow 1)
      resources: withHours,
      events: [],
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    const off = vm.resourceRows[0]!.shade.filter((s) => s.kind === 'off');
    // before 09:00 and after 17:00 → two off bands
    expect(off.length).toBe(2);
    expect(off[0]!.startOffset).toBeCloseTo(0, 6);
    expect(off[0]!.span).toBeCloseTo(540 / 1440, 6);
  });

  it('emits a block band for an isBlock event and keeps it out of events', () => {
    const events: CalendarEvent[] = [
      { id: 'lunch', resourceIds: ['t1'], isBlock: true, start: at('2026-06-15T16:00:00Z'), end: at('2026-06-15T17:00:00Z') },
    ];
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'),
      resources: techs,
      events,
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    const row = vm.resourceRows[0]!;
    expect(row.events.length).toBe(0);
    expect(row.shade.some((s) => s.kind === 'block')).toBe(true);
  });
});

describe('buildTimelineView — resource tree & now', () => {
  it('flattens a resource tree with depth and honours collapse', () => {
    const tree: CalendarResource[] = [
      { id: 'region', name: 'East', expanded: true },
      { id: 't1', name: 'Alice', parentId: 'region' },
    ];
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'),
      resources: tree,
      events: [],
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    expect(vm.resourceRows.map((r) => [r.resource.id, r.depth])).toEqual([
      ['region', 0],
      ['t1', 1],
    ]);
  });

  it('sets nowOffset when now is within the range', () => {
    const vm = buildTimelineView(adapter, {
      ...base,
      viewDate: at('2026-06-15T12:00:00Z'),
      resources: techs,
      events: [],
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
      now: at('2026-06-15T16:00:00Z'), // noon EDT
    });
    expect(vm.nowOffset).toBeCloseTo(720 / 1440, 4);
  });
});
