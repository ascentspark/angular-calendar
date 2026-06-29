import { describe, it, expect } from 'vitest';
import { eventsToIcs } from '@ascentsparksoftware/angular-calendar/export';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

const NY = 'America/New_York';
const z = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone: NY });

describe('eventsToIcs', () => {
  it('wraps events in a VCALENDAR/VEVENT structure', () => {
    const ics = eventsToIcs([{ id: 'a', title: 'Meeting', start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T14:00:00Z') }], { zone: NY });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:a@angular-calendar');
    expect(ics).toContain('SUMMARY:Meeting');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('writes timed events as UTC DTSTART/DTEND', () => {
    const ics = eventsToIcs([{ id: 'a', start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T14:30:00Z') }], { zone: NY });
    expect(ics).toContain('DTSTART:20260615T130000Z');
    expect(ics).toContain('DTEND:20260615T143000Z');
  });

  it('writes all-day events as VALUE=DATE in the event zone', () => {
    // 2026-06-15 04:00Z = 00:00 EDT → local date 2026-06-15
    const ics = eventsToIcs([{ id: 'a', allDay: true, start: z('2026-06-15T04:00:00Z'), end: z('2026-06-16T04:00:00Z') }], { zone: NY });
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615');
    expect(ics).toContain('DTEND;VALUE=DATE:20260616');
  });

  it('emits an RRULE line for recurring events', () => {
    const ics = eventsToIcs([{ id: 'a', start: z('2026-06-15T13:00:00Z'), recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO' }], { zone: NY });
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
  });

  it('escapes special characters in text fields', () => {
    const ics = eventsToIcs([{ id: 'a', title: 'A; B, C\\D', start: z('2026-06-15T13:00:00Z') }], { zone: NY });
    // Input "A; B, C\D" → ";" escaped to "\;", "," to "\,", "\" to "\\".
    expect(ics).toContain(String.raw`SUMMARY:A\; B\, C\\D`);
  });

  it('folds long summary lines at 75 octets', () => {
    const long = 'X'.repeat(200);
    const ics = eventsToIcs([{ id: 'a', title: long, start: z('2026-06-15T13:00:00Z') }], { zone: NY });
    const hasFold = ics.split('\r\n').some((l) => l.startsWith(' '));
    expect(hasFold).toBe(true);
  });
});
