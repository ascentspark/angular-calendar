import type { CalendarEvent } from '../model/calendar-event';
import type { CalendarResource } from '../model/calendar-resource';
import type { ZonedDateTime } from '../date-adapter/zoned-date-time';
import type { TimeAxisOrientation } from '../model/view';
import type { PositionedEvent, ShadeBand } from './positioned-event';
import type { ViewPeriod } from './view-period';

/** A header cell along the timeline's time axis. */
export interface TimeHeaderCell {
  /** Fraction (0–1) along the time axis where the cell begins. */
  readonly offset: number;
  /** Fraction (0–1) length of the cell. */
  readonly span: number;
  /** Pre-formatted label (e.g. "Mon 15", "09:00"). */
  readonly label: string;
  /** Whether the cell represents "today" / the now period (for highlighting). */
  readonly isNow: boolean;
}

/** Time-axis grouping unit for a header row. */
export type TimeHeaderUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

/** One stacked header row (e.g. a day row above an hour row). */
export interface TimeHeaderRow {
  readonly groupBy: TimeHeaderUnit;
  readonly cells: readonly TimeHeaderCell[];
}

/** A single resource lane (row) in the timeline. */
export interface ResourceRow<TMeta = unknown> {
  readonly resource: CalendarResource<TMeta>;
  /** Nesting depth in the resource tree (0 = root). */
  readonly depth: number;
  /** Whether the resource has children (for expand/collapse affordance). */
  readonly hasChildren: boolean;
  /** This resource's events, time-projected and packed into sub-lanes. */
  readonly events: readonly PositionedEvent<TMeta>[];
  /** Number of sub-lanes used (for row auto-height). */
  readonly laneCount: number;
  /** Off-hours / block-out shading bands along the time axis. */
  readonly shade: readonly ShadeBand[];
}

/** Resource × time timeline view-model. */
export interface TimelineViewModel<TMeta = unknown> {
  readonly period: ViewPeriod;
  readonly orientation: TimeAxisOrientation;
  readonly headerRows: readonly TimeHeaderRow[];
  readonly resourceRows: readonly ResourceRow<TMeta>[];
  /** Now-indicator fraction (0–1) if "now" is within the range, else null. */
  readonly nowOffset: number | null;
}

/** Inputs to `buildTimelineView`. */
export interface TimelineViewArgs<TMeta = unknown> {
  readonly viewDate: ZonedDateTime;
  readonly events: readonly CalendarEvent<TMeta>[];
  readonly resources: readonly CalendarResource<TMeta>[];
  /** Number of consecutive days the axis spans (1 = single-day dispatch board). */
  readonly days: number;
  /** Visible window start/end (minutes from midnight). For days>1 the window is
   *  applied to the first/last day; nights between days are included continuously. */
  readonly dayStartMinutes: number;
  readonly dayEndMinutes: number;
  /** Header rows top→bottom (e.g. `['day', 'hour']`). */
  readonly headerGroupings: readonly TimeHeaderUnit[];
  readonly orientation: TimeAxisOrientation;
  readonly weekStartsOn: number;
  readonly locale: string;
  /** Force 12/24-hour hour/minute header labels, or `null`/omitted for locale default. */
  readonly hour12?: boolean | null;
  readonly now?: ZonedDateTime;
}
