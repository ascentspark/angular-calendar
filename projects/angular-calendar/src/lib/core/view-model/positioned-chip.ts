import type { CalendarEvent } from '../model/calendar-event';

/**
 * Immutable geometry for one event's segment within a single week row of the
 * month grid (reused by the all-day band in later phases). Units are abstract
 * day-columns (0–6). One event spanning several weeks yields one chip per week.
 */
export interface PositionedChip<TMeta = unknown> {
  readonly event: CalendarEvent<TMeta>;
  /** 0-based vertical lane within the week (stable, non-overlapping). */
  readonly lane: number;
  /** Column (0–6) where this week-segment begins. */
  readonly startColumn: number;
  /** Day-columns covered within this week (≥ 1). */
  readonly span: number;
  /** Segment is clipped at the week/grid start (event began earlier). */
  readonly continuesBefore: boolean;
  /** Segment is clipped at the week/grid end (event continues later). */
  readonly continuesAfter: boolean;
  /** The event's true start day lands in this segment. */
  readonly isStart: boolean;
  /** The event's true end day lands in this segment. */
  readonly isEnd: boolean;
}
