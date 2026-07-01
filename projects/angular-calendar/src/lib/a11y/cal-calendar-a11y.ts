import { inject, Injectable } from '@angular/core';
import { CALENDAR_CONFIG } from '../core/config/calendar-config';
import { DATE_ADAPTER } from '../core/date-adapter/date-adapter';
import type { ZonedDateTime } from '../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../core/model/calendar-event';

/**
 * Centralises every screen-reader string the calendar emits so they can be
 * localised or replaced wholesale via DI:
 *
 * ```ts
 * { provide: CalCalendarA11y, useClass: MyA11y }
 * ```
 *
 * The default implementation derives labels from `Intl` via the active
 * {@link DATE_ADAPTER} and {@link CALENDAR_CONFIG} (locale + calendar system),
 * so it is correct for every supported locale and calendar without extra wiring.
 */
@Injectable({ providedIn: 'root' })
export class CalCalendarA11y {
  protected readonly adapter = inject(DATE_ADAPTER, { optional: true });
  protected readonly config = inject(CALENDAR_CONFIG);

  /** Accessible label for a day cell, e.g. "Monday, June 15, 2026". */
  dayLabel(date: ZonedDateTime): string {
    if (this.adapter === null) {
      return '';
    }
    return this.adapter.format(date, 'full-date', this.config.locale, this.config.calendarSystem);
  }

  /** Accessible label for an event chip. Falls back to a generic phrase. */
  eventLabel(event: CalendarEvent): string {
    const title = event.title?.trim();
    return title && title.length > 0 ? title : 'Untitled event';
  }

  /** Label for the "+N more" overflow control. */
  moreLabel(count: number): string {
    return count === 1 ? '1 more event' : `${count} more events`;
  }

  /** Label announced when a day is selected. */
  daySelectedLabel(date: ZonedDateTime): string {
    const label = this.dayLabel(date);
    return label ? `Selected ${label}` : 'Selected day';
  }

  /** Short time label, e.g. "10:30 AM", used in drag announcements. */
  private timeLabel(instant: ZonedDateTime): string {
    if (this.adapter === null) {
      return '';
    }
    return this.adapter.format(instant, 'h:mm a', this.config.locale, this.config.calendarSystem);
  }

  /** Announced when a keyboard drag grab begins. */
  grabbedLabel(event: CalendarEvent): string {
    return `Grabbed ${this.eventLabel(event)}. Use the arrow keys to move, Enter to drop, Escape to cancel.`;
  }

  /** Announced as a grabbed event is moved to a new start instant. */
  movedLabel(start: ZonedDateTime): string {
    const time = this.timeLabel(start);
    return time ? `Moved to ${time}` : 'Moved';
  }

  /** Announced as a grabbed event's end edge is resized. */
  resizedLabel(end: ZonedDateTime): string {
    const time = this.timeLabel(end);
    return time ? `Resized, ends ${time}` : 'Resized';
  }

  /** Announced when a keyboard drag is committed. */
  droppedLabel(event: CalendarEvent, start: ZonedDateTime): string {
    const time = this.timeLabel(start);
    const label = this.eventLabel(event);
    return time ? `${label} moved to ${time}` : `${label} moved`;
  }

  /** Announced when a keyboard drag is cancelled. */
  moveCancelledLabel(event: CalendarEvent): string {
    return `Move cancelled. ${this.eventLabel(event)} returned to its original time.`;
  }
}
