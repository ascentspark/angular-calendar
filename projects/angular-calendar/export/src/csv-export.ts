import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

/** Columns emitted by {@link eventsToCsv}, in order. */
const COLUMNS = ['id', 'title', 'start', 'end', 'allDay', 'status', 'resourceIds'] as const;

function epochOf(value: Date | ZonedDateTime): number {
  return value instanceof Date ? value.getTime() : value.epochMs;
}

/** RFC 4180 CSV field quoting. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialise events to an RFC 4180 CSV string (UTC ISO timestamps). Pure (no DOM);
 * the caller triggers the download. Columns: id, title, start, end, allDay, status,
 * resourceIds (semicolon-joined).
 */
export function eventsToCsv(events: readonly CalendarEvent[]): string {
  const rows: string[] = [COLUMNS.join(',')];
  for (const event of events) {
    const start = new Date(epochOf(event.start)).toISOString();
    const end = event.end === undefined ? '' : new Date(epochOf(event.end)).toISOString();
    const cells = [
      event.id,
      event.title ?? '',
      start,
      end,
      event.allDay === true ? 'true' : 'false',
      event.status ?? '',
      (event.resourceIds ?? []).join(';'),
    ];
    rows.push(cells.map((c) => csvField(c)).join(','));
  }
  return rows.join('\r\n') + '\r\n';
}
