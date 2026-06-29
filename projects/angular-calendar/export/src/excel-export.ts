import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

/** Columns emitted by {@link eventsToExcelXml}, in order. */
const COLUMNS = ['ID', 'Title', 'Start', 'End', 'All day', 'Status', 'Resources'] as const;

function epochOf(value: Date | ZonedDateTime): number {
  return value instanceof Date ? value.getTime() : value.epochMs;
}

/** XML-attribute / text escaping for SpreadsheetML cells. */
function xmlEsc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r/g, '')
    .replace(/\n/g, '&#10;');
}

function cell(value: string, type: 'String' | 'DateTime' = 'String'): string {
  return `<Cell><Data ss:Type="${type}">${xmlEsc(value)}</Data></Cell>`;
}

function row(cells: readonly string[]): string {
  return `<Row>${cells.join('')}</Row>`;
}

/**
 * Serialise events to a SpreadsheetML 2003 (`.xls`) XML workbook that Excel,
 * LibreOffice and Google Sheets open natively — **dependency-free** (no zip/OOXML
 * runtime). Pure (no DOM); the caller triggers the download with MIME type
 * `application/vnd.ms-excel`. Timestamps are ISO-8601 typed `DateTime` cells so
 * Excel treats them as real dates.
 */
export function eventsToExcelXml(events: readonly CalendarEvent[]): string {
  const header = row(COLUMNS.map((c) => cell(c)));
  const dataRows = events.map((event) => {
    const start = new Date(epochOf(event.start)).toISOString();
    const end = event.end === undefined ? '' : new Date(epochOf(event.end)).toISOString();
    return row([
      cell(event.id),
      cell(event.title ?? ''),
      cell(start, 'DateTime'),
      end === '' ? cell('') : cell(end, 'DateTime'),
      cell(event.allDay === true ? 'Yes' : 'No'),
      cell(event.status ?? ''),
      cell((event.resourceIds ?? []).join('; ')),
    ]);
  });

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Events">
  <Table>
   ${[header, ...dataRows].join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;
}
