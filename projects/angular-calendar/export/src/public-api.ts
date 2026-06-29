/*
 * Public API of @ascentsparksoftware/angular-calendar/export:
 * iCalendar (.ics), CSV (RFC 4180), Excel (SpreadsheetML), and printable-HTML
 * serialisation — all pure (no DOM); the caller triggers the download / print.
 */
export { eventsToIcs, type IcsExportOptions } from './ics-export';
export { eventsToCsv } from './csv-export';
export { eventsToExcelXml } from './excel-export';
export {
  eventsToPrintHtml,
  printDocument,
  CAL_PRINT_STYLES,
  type PrintExportOptions,
} from './print-export';
export {
  CalPrintService,
  provideCalendarPrint,
  CAL_PRINT_DEFAULTS,
} from './print-service';
