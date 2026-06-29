import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { RruleRecurrenceAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';
import type { ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

const rec = new RruleRecurrenceAdapter();
const dates = new DateFnsDateAdapter();
const NY = 'America/New_York';
const at = (iso: string, zone = NY): ZonedDateTime => dates.toZoned(new Date(iso), zone);
/** Wall-clock 'HH:mm' of an occurrence in NY. */
const hhmm = (z: ZonedDateTime): string => dates.format(z, 'HH:mm', 'en-US');
const ymd = (z: ZonedDateTime): string => dates.format(z, 'd MMM', 'en-US');

describe('RruleRecurrenceAdapter — expand', () => {
  it('expands a daily COUNT rule, windowed', () => {
    const occ = rec.expand({
      rule: 'FREQ=DAILY;COUNT=5',
      dtStart: at('2026-06-15T13:00:00Z'), // 09:00 EDT
      exceptions: [],
      windowStart: at('2026-06-01T00:00:00Z'),
      windowEnd: at('2026-06-30T00:00:00Z'),
      zone: NY,
    });
    expect(occ.length).toBe(5);
    expect(occ.every((o) => hhmm(o) === '09:00')).toBe(true);
    expect(ymd(occ[0]!)).toBe('Jun 15');
    expect(ymd(occ[4]!)).toBe('Jun 19');
  });

  it('honours the window (only occurrences inside are returned)', () => {
    const occ = rec.expand({
      rule: 'FREQ=DAILY',
      dtStart: at('2026-06-01T13:00:00Z'),
      exceptions: [],
      windowStart: at('2026-06-10T00:00:00Z'),
      windowEnd: at('2026-06-13T00:00:00Z'),
      zone: NY,
    });
    expect(occ.map(ymd)).toEqual(['Jun 10', 'Jun 11', 'Jun 12']);
  });

  it('expands a weekly BYDAY rule', () => {
    const occ = rec.expand({
      rule: 'FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4',
      dtStart: at('2026-06-15T13:00:00Z'), // Mon Jun 15
      exceptions: [],
      windowStart: at('2026-06-01T00:00:00Z'),
      windowEnd: at('2026-07-15T00:00:00Z'),
      zone: NY,
    });
    // Mon 15, Wed 17, Mon 22, Wed 24
    expect(occ.map(ymd)).toEqual(['Jun 15', 'Jun 17', 'Jun 22', 'Jun 24']);
  });

  it('excludes exception instants', () => {
    const occ = rec.expand({
      rule: 'FREQ=DAILY;COUNT=4',
      dtStart: at('2026-06-15T13:00:00Z'),
      exceptions: [at('2026-06-16T13:00:00Z')], // skip Jun 16
      windowStart: at('2026-06-01T00:00:00Z'),
      windowEnd: at('2026-06-30T00:00:00Z'),
      zone: NY,
    });
    expect(occ.map(ymd)).toEqual(['Jun 15', 'Jun 17', 'Jun 18']);
  });

  it('keeps wall-clock time stable across a DST transition (spring forward)', () => {
    // Weekly Sunday 09:00 spanning the Mar 8 2026 spring-forward
    const occ = rec.expand({
      rule: 'FREQ=WEEKLY;BYDAY=SU;COUNT=3',
      dtStart: at('2026-03-01T14:00:00Z'), // 09:00 EST (Mar 1, before DST)
      exceptions: [],
      windowStart: at('2026-02-25T00:00:00Z'),
      windowEnd: at('2026-04-01T00:00:00Z'),
      zone: NY,
    });
    expect(occ.map(ymd)).toEqual(['Mar 1', 'Mar 8', 'Mar 15']);
    // all stay at wall-clock 09:00 even though the absolute offset changed
    expect(occ.every((o) => hhmm(o) === '09:00')).toBe(true);
    // Mar 1 is EST (-5) → 14:00Z; Mar 15 is EDT (-4) → 13:00Z (different absolute, same wall)
    expect(new Date(occ[0]!.epochMs).toISOString()).toContain('14:00');
    expect(new Date(occ[2]!.epochMs).toISOString()).toContain('13:00');
  });
});

describe('RruleRecurrenceAdapter — parse / serialize', () => {
  it('parses a weekly BYDAY rule into editor parts (Sun=0 convention)', () => {
    const parts = rec.parse('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,SU;COUNT=10');
    expect(parts.freq).toBe('weekly');
    expect(parts.interval).toBe(2);
    expect(parts.byWeekday).toEqual([1, 0]); // MO→1, SU→0
    expect(parts.end).toEqual({ type: 'count', count: 10 });
  });

  it('round-trips parts → string → parts', () => {
    const original = rec.parse('FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15;COUNT=6');
    const str = rec.serialize(original);
    const reparsed = rec.parse(str);
    expect(reparsed.freq).toBe('monthly');
    expect(reparsed.byMonthday).toEqual([15]);
    expect(reparsed.end).toEqual({ type: 'count', count: 6 });
  });

  it('serializes weekday parts back to RRULE BYDAY', () => {
    const str = rec.serialize({ freq: 'weekly', interval: 1, byWeekday: [1, 3, 5], end: { type: 'never' } });
    // MO,WE,FR  (our 1,3,5 → rrule 0,2,4)
    expect(str).toContain('FREQ=WEEKLY');
    expect(str).toContain('BYDAY=MO,WE,FR');
  });
});
