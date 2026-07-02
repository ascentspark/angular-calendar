import {
  addDays as fAddDays,
  addMonths as fAddMonths,
  endOfDay as fEndOfDay,
  startOfDay as fStartOfDay,
  startOfMonth as fStartOfMonth,
  startOfWeek as fStartOfWeek,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type {
  CalendarSystem,
  DateAdapter,
  EraFields,
  ZonedDateTime,
} from '@ascentsparksoftware/angular-calendar';

/** date-fns `Day` union (0=Sun … 6=Sat). */
type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Semantic format tokens → `Intl.DateTimeFormat` options. Calendar/zone added per call. */
const PRESETS: Readonly<Record<string, Intl.DateTimeFormatOptions>> = {
  EEEE: { weekday: 'long' },
  EEE: { weekday: 'short' },
  EEEEE: { weekday: 'narrow' },
  d: { day: 'numeric' },
  dd: { day: '2-digit' },
  M: { month: 'numeric' },
  MM: { month: '2-digit' },
  MMM: { month: 'short' },
  MMMM: { month: 'long' },
  y: { year: 'numeric' },
  'MMM y': { month: 'short', year: 'numeric' },
  'MMMM y': { month: 'long', year: 'numeric' },
  'd MMMM': { day: 'numeric', month: 'long' },
  'd MMM': { day: 'numeric', month: 'short' },
  'd MMMM y': { day: 'numeric', month: 'long', year: 'numeric' },
  'EEE d': { weekday: 'short', day: 'numeric' },
  'EEE, MMM d': { weekday: 'short', month: 'short', day: 'numeric' },
  HH: { hour: '2-digit', hourCycle: 'h23' },
  'HH:mm': { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  'h a': { hour: 'numeric', hour12: true },
  'h:mm a': { hour: 'numeric', minute: '2-digit', hour12: true },
  // Locale-default time: Intl picks 12- or 24-hour by the locale (e.g. en-US → 1:30 PM,
  // de-DE → 13:30). Used when the calendar's `hour12` config is left unset (null).
  time: { hour: 'numeric', minute: '2-digit' },
  'full-date': { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
};

const MS_PER_MINUTE = 60_000;

/**
 * The default {@link DateAdapter}, built on `date-fns` + `date-fns-tz`.
 *
 * Timezone correctness: an instant is stored as absolute `epochMs`; calendar
 * arithmetic and boundaries are computed by projecting the instant into the
 * value's zone wall-clock (`toZonedTime`), operating with `date-fns`, then
 * projecting back to an absolute instant (`fromZonedTime`). Display fields and
 * formatting go through `Intl` with the zone and calendar system, so non-Gregorian
 * systems and DST are handled by the platform rather than by offset arithmetic.
 */
export class DateFnsDateAdapter implements DateAdapter {
  toZoned(value: Date | ZonedDateTime, zone: string): ZonedDateTime {
    const epochMs = value instanceof Date ? value.getTime() : value.epochMs;
    return { epochMs, zone };
  }

  now(zone: string): ZonedDateTime {
    return { epochMs: Date.now(), zone };
  }

  addMinutes(d: ZonedDateTime, n: number): ZonedDateTime {
    return { epochMs: d.epochMs + n * MS_PER_MINUTE, zone: d.zone };
  }

  addDays(d: ZonedDateTime, n: number): ZonedDateTime {
    return this.mapWall(d, (wall) => fAddDays(wall, n));
  }

  addMonths(d: ZonedDateTime, n: number): ZonedDateTime {
    return this.mapWall(d, (wall) => fAddMonths(wall, n));
  }

  startOfDay(d: ZonedDateTime): ZonedDateTime {
    return this.mapWall(d, (wall) => fStartOfDay(wall));
  }

  endOfDay(d: ZonedDateTime): ZonedDateTime {
    return this.mapWall(d, (wall) => fEndOfDay(wall));
  }

  startOfWeek(d: ZonedDateTime, weekStartsOn: number): ZonedDateTime {
    const wso = (((weekStartsOn % 7) + 7) % 7) as WeekDay;
    return this.mapWall(d, (wall) => fStartOfWeek(wall, { weekStartsOn: wso }));
  }

  startOfMonth(d: ZonedDateTime): ZonedDateTime {
    return this.mapWall(d, (wall) => fStartOfMonth(wall));
  }

  differenceInMinutes(a: ZonedDateTime, b: ZonedDateTime): number {
    return (a.epochMs - b.epochMs) / MS_PER_MINUTE;
  }

  isSameDay(a: ZonedDateTime, b: ZonedDateTime): boolean {
    return this.ymd(a) === this.ymd(b);
  }

  getDayOfWeek(d: ZonedDateTime): number {
    return toZonedTime(d.epochMs, d.zone).getDay();
  }

  getMinutesIntoDay(d: ZonedDateTime): number {
    // Wall-clock minutes into the local day, read from the zone's clock so a DST
    // transition never shifts it: 09:00 is always 540, even on a day whose
    // midnight→09:00 span is only 8 real hours (spring forward) or 10 (fall back).
    const local = toZonedTime(d.epochMs, d.zone);
    return local.getHours() * 60 + local.getMinutes() + local.getSeconds() / 60;
  }

  getEra(d: ZonedDateTime, system: CalendarSystem): EraFields {
    const parts = new Intl.DateTimeFormat(`en-u-ca-${system}`, {
      timeZone: d.zone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      era: 'short',
    }).formatToParts(new Date(d.epochMs));
    const pick = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((p) => p.type === type)?.value ?? '';
    const year = Number.parseInt(pick('year').replace(/[^\d-]/g, ''), 10);
    const month = Number.parseInt(pick('month'), 10);
    const day = Number.parseInt(pick('day'), 10);
    const eraName = pick('era');
    const fields: EraFields = { year, month, day };
    return eraName ? { ...fields, eraName } : fields;
  }

  format(d: ZonedDateTime, pattern: string, locale: string, system: CalendarSystem = 'gregory'): string {
    const opts = PRESETS[pattern];
    if (opts === undefined) {
      throw new Error(`Unsupported format pattern: "${pattern}"`);
    }
    const dtf = new Intl.DateTimeFormat(locale, {
      timeZone: d.zone,
      calendar: system,
      ...opts,
    });
    return dtf.format(new Date(d.epochMs));
  }

  /** Project to zone wall-clock, transform with date-fns, project back to an instant. */
  private mapWall(d: ZonedDateTime, fn: (wall: Date) => Date): ZonedDateTime {
    const wall = toZonedTime(d.epochMs, d.zone);
    const transformed = fn(wall);
    return { epochMs: fromZonedTime(transformed, d.zone).getTime(), zone: d.zone };
  }

  /** Local `YYYY-MM-DD` in the value's zone, for same-day comparison. */
  private ymd(d: ZonedDateTime): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: d.zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(d.epochMs));
  }
}
