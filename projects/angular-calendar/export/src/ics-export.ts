import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

/** Options for {@link eventsToIcs}. */
export interface IcsExportOptions {
  /** Fallback IANA zone for all-day date resolution when an event uses a plain `Date`. */
  readonly zone: string;
  /** `PRODID` identifier written into the calendar. */
  readonly prodId?: string;
}

const CRLF = '\r\n';

/** Absolute epoch ms of a `Date | ZonedDateTime`. */
function epochOf(value: Date | ZonedDateTime): number {
  return value instanceof Date ? value.getTime() : value.epochMs;
}

/** Zone of a `ZonedDateTime`, or the fallback for a plain `Date`. */
function zoneOf(value: Date | ZonedDateTime, fallback: string): string {
  return value instanceof Date ? fallback : value.zone;
}

/** UTC timestamp form `YYYYMMDDTHHMMSSZ`. */
function utcStamp(epochMs: number): string {
  return new Date(epochMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Local `YYYYMMDD` date in `zone` (for all-day VALUE=DATE). */
function localDate(epochMs: number, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
  return parts.replace(/-/g, '');
}

/** Escape a value per RFC 5545 (text fields). */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Fold long content lines to 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  chunks.push(` ${rest}`);
  return chunks.join(CRLF);
}

/**
 * Serialise events to an RFC 5545 iCalendar (`.ics`) string. Timed events use UTC
 * `DTSTART`/`DTEND`; all-day events use `VALUE=DATE` resolved in the event's zone.
 * A `recurrenceRule` becomes an `RRULE` line. Pure (no DOM); the caller triggers
 * the download.
 */
export function eventsToIcs(
  events: readonly CalendarEvent[],
  options: IcsExportOptions,
): string {
  const prodId = options.prodId ?? '-//Ascentspark//angular-calendar//EN';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
  ];

  for (const event of events) {
    const startMs = epochOf(event.start);
    const endValue = event.end ?? event.start;
    const endMs = epochOf(endValue);
    lines.push('BEGIN:VEVENT');
    lines.push(fold(`UID:${esc(event.id)}@angular-calendar`));
    lines.push(`DTSTAMP:${utcStamp(startMs)}`);
    if (event.allDay === true) {
      const zone = zoneOf(event.start, options.zone);
      lines.push(`DTSTART;VALUE=DATE:${localDate(startMs, zone)}`);
      lines.push(`DTEND;VALUE=DATE:${localDate(endMs, zone)}`);
    } else {
      lines.push(`DTSTART:${utcStamp(startMs)}`);
      lines.push(`DTEND:${utcStamp(endMs)}`);
    }
    if (event.title !== undefined && event.title !== '') {
      lines.push(fold(`SUMMARY:${esc(event.title)}`));
    }
    if (event.recurrenceRule !== undefined && event.recurrenceRule !== '') {
      lines.push(`RRULE:${event.recurrenceRule.replace(/^RRULE:/, '')}`);
    }
    if (event.status !== undefined) {
      lines.push(fold(`CATEGORIES:${esc(event.status)}`));
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join(CRLF) + CRLF;
}
