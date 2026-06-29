import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { detectConflicts, filterByStatus } from './event-queries';

const dates = new DateFnsDateAdapter();
const NY = 'America/New_York';
const at = (iso: string): ZonedDateTime => dates.toZoned(new Date(iso), NY);

describe('detectConflicts', () => {
  it('flags overlapping events that share a resource', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'b', resourceIds: ['t1'], start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T16:00:00Z') },
    ];
    const c = detectConflicts(events, { dates, zone: NY });
    expect(c.length).toBe(1);
    expect(new Set([c[0]!.a.id, c[0]!.b.id])).toEqual(new Set(['a', 'b']));
  });

  it('does not flag overlaps on different resources', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'b', resourceIds: ['t2'], start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T16:00:00Z') },
    ];
    expect(detectConflicts(events, { dates, zone: NY }).length).toBe(0);
  });

  it('flags any overlap when sameResourceOnly is false', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'b', resourceIds: ['t2'], start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T16:00:00Z') },
    ];
    expect(detectConflicts(events, { dates, zone: NY, sameResourceOnly: false }).length).toBe(1);
  });

  it('ignores block-out and all-day events', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'lunch', resourceIds: ['t1'], isBlock: true, start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T14:30:00Z') },
    ];
    expect(detectConflicts(events, { dates, zone: NY }).length).toBe(0);
  });

  it('does not flag merely-adjacent events (half-open)', () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') },
      { id: 'b', resourceIds: ['t1'], start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T15:00:00Z') },
    ];
    expect(detectConflicts(events, { dates, zone: NY }).length).toBe(0);
  });
});

describe('filterByStatus', () => {
  const events: CalendarEvent[] = [
    { id: 'a', status: 'scheduled', start: at('2026-06-15T13:00:00Z') },
    { id: 'b', status: 'cancelled', start: at('2026-06-15T14:00:00Z') },
    { id: 'c', start: at('2026-06-15T15:00:00Z') }, // untagged
  ];
  it('keeps only allowed statuses (untagged kept by default)', () => {
    const out = filterByStatus(events, new Set(['scheduled']));
    expect(out.map((e) => e.id).sort()).toEqual(['a', 'c']);
  });
  it('drops untagged when includeUntagged is false', () => {
    const out = filterByStatus(events, new Set(['scheduled']), false);
    expect(out.map((e) => e.id)).toEqual(['a']);
  });
});
