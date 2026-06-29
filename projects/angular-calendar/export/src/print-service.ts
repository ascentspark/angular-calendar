import {
  Injectable,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import type { CalendarEvent } from '@ascentsparksoftware/angular-calendar';
import { eventsToPrintHtml, printDocument, type PrintExportOptions } from './print-export';

/** DI token carrying default {@link PrintExportOptions} for {@link CalPrintService}. */
export const CAL_PRINT_DEFAULTS = new InjectionToken<PrintExportOptions>('CAL_PRINT_DEFAULTS', {
  factory: (): PrintExportOptions => ({}),
});

/**
 * Injectable print/print-to-PDF helper. Composes a paginated agenda document
 * ({@link eventsToPrintHtml}) and hands it to the browser print dialog
 * ({@link printDocument}). SSR-safe (no-op without a window). Per-call options
 * override the DI defaults registered via {@link provideCalendarPrint}.
 */
@Injectable({ providedIn: 'root' })
export class CalPrintService {
  private readonly defaults = inject(CAL_PRINT_DEFAULTS);

  /**
   * Print the given events. Returns `true` if the print dialog was triggered
   * (false under SSR / when a popup could not be opened).
   */
  print(events: readonly CalendarEvent[], options: PrintExportOptions = {}): boolean {
    const html = eventsToPrintHtml(events, { ...this.defaults, ...options });
    return printDocument(html);
  }

  /** Build the printable HTML without opening a dialog (for preview / tests). */
  toHtml(events: readonly CalendarEvent[], options: PrintExportOptions = {}): string {
    return eventsToPrintHtml(events, { ...this.defaults, ...options });
  }
}

/**
 * Register default print options application-wide. The `withPrint(...)` feature:
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideCalendarPrint({ title: 'Schedule', hour12: false })],
 * });
 * ```
 */
export function provideCalendarPrint(defaults: PrintExportOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: CAL_PRINT_DEFAULTS, useValue: defaults }]);
}
