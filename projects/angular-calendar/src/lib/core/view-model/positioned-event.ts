import type { CalendarEvent } from '../model/calendar-event';

/**
 * Immutable geometry for one timed event within a time-grid/timeline column.
 * Time-axis position is `startOffset`/`span` (fractions 0–1 of the visible day
 * window); cross-axis placement is `lane`/`laneCount` with optional `columnSpan`
 * back-fill (visual width = `columnSpan / laneCount`).
 */
export interface PositionedEvent<TMeta = unknown> {
  readonly event: CalendarEvent<TMeta>;
  /** Cross-axis lane (column) index within the overlap cluster. */
  readonly lane: number;
  /** Number of cross-axis lanes in this event's cluster (≥ 1). */
  readonly laneCount: number;
  /** Back-fill width in lanes (≥ 1); visual width = columnSpan / laneCount. */
  readonly columnSpan: number;
  /** Fraction (0–1) along the time axis where the event begins (clipped to window). */
  readonly startOffset: number;
  /** Fraction (0–1) length along the time axis (clipped to window). */
  readonly span: number;
  /** Event starts before the visible day window (clipped at the top/left). */
  readonly continuesBefore: boolean;
  /** Event ends after the visible day window (clipped at the bottom/right). */
  readonly continuesAfter: boolean;
}

/** A shaded band along the time axis (working hours / off-hours / block-out). */
export interface ShadeBand {
  readonly startOffset: number;
  readonly span: number;
  readonly kind: 'work' | 'off' | 'block';
}
