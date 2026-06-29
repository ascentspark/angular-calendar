import type { ZonedDateTime } from '../date-adapter/zoned-date-time';

/**
 * A single calendar entry. The consumer owns this data and the library never
 * mutates it; changes are surfaced via component outputs for the host to commit.
 *
 * `start`/`end` accept a native `Date` (an absolute instant) or a
 * {@link ZonedDateTime}; the active {@link DateAdapter} normalises them into the
 * display zone. `title` and any other text are rendered as **text nodes only**,
 * never as HTML.
 *
 * @typeParam TMeta arbitrary consumer payload, carried through untouched.
 */
export interface CalendarEvent<TMeta = unknown> {
  /** Stable identity; used for tracking and all change events. */
  readonly id: string;
  /** Start instant. */
  readonly start: Date | ZonedDateTime;
  /** End instant; omitted ⇒ a zero-duration point event. */
  readonly end?: Date | ZonedDateTime;
  /** Whether the event occupies the all-day band rather than a time slot. */
  readonly allDay?: boolean;
  /** Plain-text title. Never rendered as HTML. */
  readonly title?: string;
  /** Resource lane(s) this event belongs to (timeline/resource views). */
  readonly resourceIds?: readonly string[];
  /** Status key into the consumer's `statusColors` map (drives `--cal-event-*`). */
  readonly status?: string;
  /** RFC 5545 RRULE string for a recurring series. */
  readonly recurrenceRule?: string;
  /** Exception instants removed from the series. */
  readonly recurrenceExceptions?: readonly (Date | ZonedDateTime)[];
  /** Links a detached/edited occurrence back to its series. */
  readonly recurrenceId?: string;
  /** Per-event override of the calendar's global editability. */
  readonly editable?: boolean;
  /** Which edges may be resized. */
  readonly resizable?: { readonly beforeStart?: boolean; readonly afterEnd?: boolean };
  /** Whether the event may be dragged. */
  readonly draggable?: boolean;
  /** Marks unavailable / block-out time (non-bookable shading). */
  readonly isBlock?: boolean;
  /** Renders read-only (no drag/resize/inline-edit) regardless of global flags. */
  readonly isReadonly?: boolean;
  /** Extra CSS class applied to the event element. */
  readonly cssClass?: string;
  /** Arbitrary consumer payload. */
  readonly meta?: TMeta;
}
