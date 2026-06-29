import type { Interval } from './interval';

/** An interval assigned to a horizontal row (lane), preserving its payload. */
export interface LanePlacement<T> {
  readonly data: T;
  /** Zero-based row index; no two same-row placements overlap. */
  readonly lane: number;
}

/** The result of {@link packRows}: placements in input order plus the row count. */
export interface RowPacking<T> {
  readonly items: readonly LanePlacement<T>[];
  /** Total number of rows used (0 when there are no intervals). */
  readonly laneCount: number;
}

/**
 * Greedy first-fit row packing (interval-graph colouring specialised to rows).
 *
 * Intervals are placed top-to-bottom into the lowest row whose last-placed
 * interval has already ended (`lastEnd <= start`, half-open). Ties on start are
 * broken by longer-first so wide spans settle into low rows. Pure and stable:
 * output order matches input order; inputs are never mutated.
 *
 * Used for all-day / multi-day span rows (month + all-day band). O(n·rows) which
 * is ample for the per-week/per-day counts these packs handle.
 */
export function packRows<T>(intervals: readonly Interval<T>[]): RowPacking<T> {
  const order = intervals
    .map((interval, index) => ({ interval, index }))
    .sort((a, b) =>
      a.interval.start !== b.interval.start
        ? a.interval.start - b.interval.start
        : b.interval.end - a.interval.end,
    );

  const laneEnds: number[] = [];
  const laneByIndex = new Array<number>(intervals.length);

  for (const { interval, index } of order) {
    let placed = -1;
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if ((laneEnds[lane] ?? Number.POSITIVE_INFINITY) <= interval.start) {
        placed = lane;
        break;
      }
    }
    if (placed === -1) {
      placed = laneEnds.length;
      laneEnds.push(interval.end);
    } else {
      laneEnds[placed] = interval.end;
    }
    laneByIndex[index] = placed;
  }

  const items: LanePlacement<T>[] = intervals.map((interval, index) => ({
    data: interval.data,
    lane: laneByIndex[index] ?? 0,
  }));

  return { items, laneCount: laneEnds.length };
}
