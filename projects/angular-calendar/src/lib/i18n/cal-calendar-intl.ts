import { Injectable } from '@angular/core';

/**
 * Centralised, DI-overridable **visible** UI labels (distinct from
 * {@link CalCalendarA11y}, which owns screen-reader strings). Replace wholesale
 * for localisation:
 *
 * ```ts
 * { provide: CalCalendarIntl, useClass: MyFrenchIntl }
 * ```
 *
 * Date/number text (weekday names, day numbers, times) is produced by the active
 * date adapter via `Intl` and is already locale-aware; this provider only covers
 * the library's own fixed words.
 */
@Injectable({ providedIn: 'root' })
export class CalCalendarIntl {
  /** All-day band / agenda label for all-day events. */
  allDay = 'All day';
  /** Agenda heading for a day with no events. */
  noEvents = 'No events';
  /** Frozen resource-column header (timeline). */
  resourcesHeader = 'Resources';

  /** Generic close-button label (event dialog, overflow popover). */
  close = 'Close';
  /** Fallback title for an event with no `title`. */
  untitledEvent = '(untitled)';
  /** Event-dialog field labels. */
  dialogWhen = 'When';
  dialogStatus = 'Status';
  dialogRepeats = 'Repeats';
  /** Event-dialog value shown for a recurring event. */
  recurringEvent = 'Recurring event';

  /** "+N" overflow control text (month). */
  moreLabel(count: number): string {
    return `+${count}`;
  }
}
