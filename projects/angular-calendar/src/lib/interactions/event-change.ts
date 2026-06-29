import type { ZonedDateTime } from '../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../core/model/calendar-event';

/** What kind of edit a committed {@link EventChange} represents. */
export type EventChangeKind = 'move' | 'resize' | 'create' | 'inline-edit';

/**
 * A committed user edit, emitted for the host to apply to its own store. The
 * library never mutates the consumer's data; it reports the intended change and
 * the consumer feeds new immutable data back in.
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

/**
 * Cancellable async commit handle attached to a change emission. Optimistic UIs
 * can `await confirm(promise)` for a backend round-trip, or `preventDefault()` to
 * reject the change so the preview snaps back. Modelled after the DayPilot
 * before/after protocol.
 */
export interface EventChangeRequest<TMeta = unknown> {
  readonly change: EventChange<TMeta>;
  /** Reject the change (preview snaps back). */
  preventDefault(): void;
  /** Whether `preventDefault()` was called. */
  readonly defaultPrevented: boolean;
  /** Await an async commit; rejection rolls the preview back. */
  confirm(result: Promise<boolean>): void;
}
