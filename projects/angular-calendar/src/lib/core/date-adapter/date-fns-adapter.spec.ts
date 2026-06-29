import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DATE_ADAPTER, type ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import {
  DateFnsDateAdapter,
  provideDateFnsAdapter,
} from '@ascentsparksoftware/angular-calendar/date-fns';

const a = new DateFnsDateAdapter();
const NY = 'America/New_York';
const UTC = 'UTC';

/** Build a ZonedDateTime from an absolute UTC ISO string, interpreted in `zone`. */
const at = (iso: string, zone: string): ZonedDateTime => a.toZoned(new Date(iso), zone);

describe('DateFnsDateAdapter — normalisation', () => {
  it('toZoned keeps the absolute instant and sets the zone', () => {
    const d = a.toZoned(new Date('2026-06-15T10:00:00Z'), NY);
    expect(d.epochMs).toBe(Date.parse('2026-06-15T10:00:00Z'));
    expect(d.zone).toBe(NY);
    // re-zoning the same instant preserves epochMs
    expect(a.toZoned(d, UTC)).toEqual({ epochMs: d.epochMs, zone: UTC });
  });
});

describe('DateFnsDateAdapter — physical vs calendar arithmetic across DST', () => {
  // US 2026: spring forward Sun Mar 8 02:00→03:00; fall back Sun Nov 1 02:00→01:00.
  it('addMinutes shifts the absolute instant (physical)', () => {
    const d = at('2026-06-15T10:00:00Z', NY);
    expect(a.addMinutes(d, 90).epochMs).toBe(d.epochMs + 90 * 60_000);
  });

  it('addDays preserves wall-clock time across spring-forward (23h physical day)', () => {
    const before = at('2026-03-07T17:00:00Z', NY); // 12:00 EST
    const after = a.addDays(before, 1); // expect 12:00 EDT on Mar 8
    expect(a.format(after, 'HH:mm', 'en-US')).toBe('12:00');
    // the physical gap is 23h because the clocks sprang forward
    expect(a.differenceInMinutes(after, before)).toBe(23 * 60);
  });

  it('addDays preserves wall-clock time across fall-back (25h physical day)', () => {
    const before = at('2026-10-31T16:00:00Z', NY); // 12:00 EDT
    const after = a.addDays(before, 1); // 12:00 EST on Nov 1
    expect(a.format(after, 'HH:mm', 'en-US')).toBe('12:00');
    expect(a.differenceInMinutes(after, before)).toBe(25 * 60);
  });

  it('a spring-forward day measures 23h and a fall-back day 25h via startOfDay', () => {
    const springStart = a.startOfDay(at('2026-03-08T12:00:00Z', NY));
    const springNext = a.startOfDay(a.addDays(springStart, 1));
    expect(a.differenceInMinutes(springNext, springStart)).toBe(23 * 60);

    const fallStart = a.startOfDay(at('2026-11-01T12:00:00Z', NY));
    const fallNext = a.startOfDay(a.addDays(fallStart, 1));
    expect(a.differenceInMinutes(fallNext, fallStart)).toBe(25 * 60);
  });

  it('addMonths preserves wall-clock time', () => {
    const before = at('2026-01-15T17:00:00Z', NY); // 12:00 EST
    const after = a.addMonths(before, 5); // Jun 15, EDT
    expect(a.format(after, 'HH:mm', 'en-US')).toBe('12:00');
    expect(a.format(after, 'MMMM', 'en-US')).toBe('June');
  });
});

describe('DateFnsDateAdapter — boundaries', () => {
  it('startOfDay / endOfDay land on local midnight and 23:59 in zone', () => {
    const d = at('2026-06-15T18:30:00Z', NY); // 14:30 EDT
    expect(a.format(a.startOfDay(d), 'HH:mm', 'en-US')).toBe('00:00');
    expect(a.format(a.endOfDay(d), 'HH:mm', 'en-US')).toBe('23:59');
  });

  it('startOfWeek honours weekStartsOn in the zone', () => {
    const d = at('2026-06-17T12:00:00Z', NY); // Wed Jun 17 2026
    const sun = a.startOfWeek(d, 0);
    const mon = a.startOfWeek(d, 1);
    expect(a.getDayOfWeek(sun)).toBe(0);
    expect(a.getDayOfWeek(mon)).toBe(1);
    // Field order follows the locale (en-US renders month-first).
    expect(a.format(sun, 'd MMM', 'en-US')).toBe('Jun 14');
    expect(a.format(mon, 'd MMM', 'en-US')).toBe('Jun 15');
  });

  it('startOfMonth lands on the 1st at local midnight', () => {
    const d = at('2026-06-17T12:00:00Z', NY);
    const som = a.startOfMonth(d);
    expect(a.format(som, 'd MMMM y', 'en-US')).toBe('June 1, 2026');
    expect(a.format(som, 'HH:mm', 'en-US')).toBe('00:00');
  });
});

describe('DateFnsDateAdapter — queries', () => {
  it('differenceInMinutes is the physical signed difference', () => {
    const x = at('2026-06-15T10:00:00Z', UTC);
    const y = at('2026-06-15T11:30:00Z', UTC);
    expect(a.differenceInMinutes(y, x)).toBe(90);
    expect(a.differenceInMinutes(x, y)).toBe(-90);
  });

  it('isSameDay compares the local calendar day', () => {
    // 2026-06-15 23:00 EDT == 2026-06-16 03:00 UTC: same NY day, different UTC day
    const ny = at('2026-06-16T03:00:00Z', NY);
    const nyLater = at('2026-06-16T04:30:00Z', NY); // 00:30 next NY day
    expect(a.isSameDay(ny, a.toZoned(new Date('2026-06-16T02:00:00Z'), NY))).toBe(true);
    expect(a.isSameDay(ny, nyLater)).toBe(false);
  });

  it('getMinutesIntoDay returns wall minutes since local midnight on a normal day', () => {
    const d = at('2026-06-15T18:30:00Z', NY); // 14:30 EDT
    expect(a.getMinutesIntoDay(d)).toBe(14 * 60 + 30);
  });
});

describe('DateFnsDateAdapter — calendar systems (getEra)', () => {
  const d = at('2026-06-15T12:00:00Z', UTC);
  it('gregory returns the civil y/m/d', () => {
    expect(a.getEra(d, 'gregory')).toMatchObject({ year: 2026, month: 6, day: 15 });
  });
  it('buddhist year is gregorian + 543', () => {
    expect(a.getEra(d, 'buddhist').year).toBe(2026 + 543);
  });
  it('japanese carries an era name and an era-relative year', () => {
    const era = a.getEra(d, 'japanese');
    expect(era.eraName).toBeTruthy();
    expect(era.year).toBe(8); // Reiwa 8 (Reiwa 1 = 2019)
  });
  it('islamic and persian return plausible positive fields', () => {
    for (const sys of ['islamic', 'persian'] as const) {
      const e = a.getEra(d, sys);
      expect(e.year).toBeGreaterThan(0);
      expect(e.month).toBeGreaterThanOrEqual(1);
      expect(e.month).toBeLessThanOrEqual(13);
      expect(e.day).toBeGreaterThanOrEqual(1);
      expect(e.day).toBeLessThanOrEqual(31);
    }
  });
});

describe('DateFnsDateAdapter — format', () => {
  const d = at('2026-06-15T16:00:00Z', NY); // Mon Jun 15 2026, 12:00 EDT
  it('formats common presets in en-US', () => {
    expect(a.format(d, 'EEEE', 'en-US')).toBe('Monday');
    expect(a.format(d, 'MMMM y', 'en-US')).toBe('June 2026');
    expect(a.format(d, 'HH:mm', 'en-US')).toBe('12:00');
    expect(a.format(d, 'h:mm a', 'en-US')).toBe('12:00 PM');
  });
  it('respects the calendar system in formatting', () => {
    // Buddhist numeric year includes the era marker (e.g. "2569 BE") per Intl.
    expect(a.format(d, 'y', 'en-US', 'buddhist')).toContain('2569');
    expect(a.format(d, 'y', 'en-US', 'gregory')).toBe('2026');
  });
  it('throws on an unsupported pattern', () => {
    expect(() => a.format(d, 'nonsense', 'en-US')).toThrowError(/Unsupported format pattern/);
  });
});

describe('provideDateFnsAdapter', () => {
  it('binds DATE_ADAPTER to a DateFnsDateAdapter instance', () => {
    TestBed.configureTestingModule({ providers: [provideDateFnsAdapter()] });
    expect(TestBed.inject(DATE_ADAPTER)).toBeInstanceOf(DateFnsDateAdapter);
  });
});
