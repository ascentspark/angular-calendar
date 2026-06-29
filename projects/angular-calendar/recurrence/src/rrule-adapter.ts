import { RRule, Weekday } from 'rrule';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type {
  RecurrenceAdapter,
  RecurrenceEnd,
  RecurrenceFreq,
  RecurrenceParts,
} from '@ascentsparksoftware/angular-calendar';
import type { ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

const FREQ_TO_RRULE: Record<RecurrenceFreq, number> = {
  yearly: RRule.YEARLY,
  monthly: RRule.MONTHLY,
  weekly: RRule.WEEKLY,
  daily: RRule.DAILY,
};
const RRULE_TO_FREQ: Record<number, RecurrenceFreq> = {
  [RRule.YEARLY]: 'yearly',
  [RRule.MONTHLY]: 'monthly',
  [RRule.WEEKLY]: 'weekly',
  [RRule.DAILY]: 'daily',
};

/** Our weekday (0=Sun…6=Sat) → rrule weekday (0=Mon…6=Sun). */
const toRRuleWeekday = (ourWd: number): number => (ourWd + 6) % 7;
/** rrule weekday (0=Mon…6=Sun) → our weekday (0=Sun…6=Sat). */
const toOurWeekday = (rruleWd: number): number => (rruleWd + 1) % 7;

const WALL_FMT = "yyyy-MM-dd'T'HH:mm:ss";

/**
 * Default RFC 5545 recurrence engine, backed by `rrule`.
 *
 * Timezone correctness: rrule has no first-class IANA support, so the series is
 * expanded in **naive wall-clock space** — every instant is projected to its
 * wall-clock components in the event's zone, rrule iterates those, and each
 * occurrence is projected back to an absolute instant in the zone. This keeps an
 * occurrence's wall-clock time stable across DST transitions (a 09:00 weekly
 * meeting stays at 09:00 before and after the clocks change).
 */
export class RruleRecurrenceAdapter implements RecurrenceAdapter {
  expand(input: {
    rule: string;
    dtStart: ZonedDateTime;
    exceptions: readonly ZonedDateTime[];
    windowStart: ZonedDateTime;
    windowEnd: ZonedDateTime;
    zone: string;
  }): ZonedDateTime[] {
    const options = RRule.parseString(input.rule);
    options.dtstart = this.toNaive(input.dtStart, input.zone);
    const rule = new RRule(options);

    const winStart = this.toNaive(input.windowStart, input.zone);
    const winEnd = this.toNaive(input.windowEnd, input.zone);
    const exceptionMs = new Set(
      input.exceptions.map((ex) => this.toNaive(ex, input.zone).getTime()),
    );

    return rule
      .between(winStart, winEnd, true)
      .filter((occ) => !exceptionMs.has(occ.getTime()))
      .map((occ) => this.fromNaive(occ, input.zone));
  }

  parse(rule: string): RecurrenceParts {
    const o = RRule.parseString(rule);
    const freq = RRULE_TO_FREQ[o.freq ?? RRule.WEEKLY] ?? 'weekly';
    let end: RecurrenceEnd = { type: 'never' };
    if (typeof o.count === 'number') {
      end = { type: 'count', count: o.count };
    } else if (o.until instanceof Date) {
      end = { type: 'until', until: { epochMs: o.until.getTime(), zone: 'UTC' } };
    }
    const parts: RecurrenceParts = {
      freq,
      interval: o.interval ?? 1,
      end,
      ...(o.byweekday ? { byWeekday: this.readWeekdays(o.byweekday).map(toOurWeekday) } : {}),
      ...(o.bymonthday ? { byMonthday: asArray(o.bymonthday) } : {}),
      ...(o.bymonth ? { byMonth: asArray(o.bymonth) } : {}),
      ...(o.bysetpos ? { bySetPos: asArray(o.bysetpos) } : {}),
    };
    return parts;
  }

  serialize(parts: RecurrenceParts): string {
    const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
      freq: FREQ_TO_RRULE[parts.freq],
      interval: Math.max(1, parts.interval),
    };
    if (parts.byWeekday && parts.byWeekday.length > 0) {
      options.byweekday = parts.byWeekday.map((w) => new Weekday(toRRuleWeekday(w)));
    }
    if (parts.byMonthday && parts.byMonthday.length > 0) {
      options.bymonthday = [...parts.byMonthday];
    }
    if (parts.byMonth && parts.byMonth.length > 0) {
      options.bymonth = [...parts.byMonth];
    }
    if (parts.bySetPos && parts.bySetPos.length > 0) {
      options.bysetpos = [...parts.bySetPos];
    }
    if (parts.end.type === 'count') {
      options.count = parts.end.count;
    } else if (parts.end.type === 'until') {
      // UNTIL must live in the same naive wall-clock space the series is expanded
      // in, so convert it to the until's wall-clock components as a naive-UTC date.
      const u = parts.end.until;
      const wall = formatInTimeZone(new Date(u.epochMs), u.zone, WALL_FMT);
      options.until = new Date(`${wall}Z`);
    }
    const str = RRule.optionsToString(options);
    return str.replace(/^RRULE:/, '');
  }

  /** Instant → naive-UTC Date carrying its wall-clock components in `zone`. */
  private toNaive(d: ZonedDateTime, zone: string): Date {
    const wall = formatInTimeZone(new Date(d.epochMs), zone, WALL_FMT);
    return new Date(`${wall}Z`);
  }

  /** Naive-UTC occurrence → real instant by interpreting its wall clock in `zone`. */
  private fromNaive(occ: Date, zone: string): ZonedDateTime {
    const wall = occ.toISOString().slice(0, 19); // 'YYYY-MM-DDTHH:mm:ss'
    return { epochMs: fromZonedTime(wall, zone).getTime(), zone };
  }

  private readWeekdays(byweekday: unknown): number[] {
    const arr = asArray(byweekday);
    return arr.map((w) => {
      if (typeof w === 'number') {
        return w;
      }
      if (w instanceof Weekday) {
        return w.weekday;
      }
      const obj = w as { weekday?: number };
      return obj.weekday ?? 0;
    });
  }
}

function asArray<T>(value: T | readonly T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? [...value] : [value as T];
}
