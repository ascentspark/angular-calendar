import type { ZonedDateTime } from '../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../core/model/calendar-event';

/** What kind of edit a committed {@link EventChange} represents. */
export type EventChangeKind = 'move' | 'resize' | 'create' | 'inline-edit';

/**
 * A committed user edit, emitted (via `eventChanged`) for the host to apply to its
 * own store — the library never mutates the consumer's data.
 *
 * **State contract.** The host is authoritative: on `eventChanged` you update your
 * event data and feed the new immutable array back into `[events]`; the view
 * re-renders from it. There is no built-in optimistic-preview/rollback protocol —
 * for an async backend you apply the change optimistically and revert your own
 * store if the request fails (the view follows your data), and you can reject a
 * change *before* it commits with the synchronous `validateChange` predicate input
 * (returning `false` snaps the drag preview back).
 */
export interface EventChange<TMeta = unknown> {
  readonly kind: EventChangeKind;
  /** The affected event, or `null` for a `create`. */
  readonly event: CalendarEvent<TMeta> | null;
  /** New start (move/resize/create). */
  readonly start?: ZonedDateTime;
  /** New end (move/resize/create). */
  readonly end?: ZonedDateTime;
  /** Target resource lane (timeline move/create), if it changed. */
  readonly resourceId?: string;
  /** New title (inline-edit). */
  readonly title?: string;
}
