/**
 * A half-open interval `[start, end)` on a numeric axis (typically minutes from a
 * period start, or absolute ms) carrying arbitrary payload. The layout algorithms
 * are framework- and date-library-free: callers project events onto numbers first.
 */
export interface Interval<T> {
  readonly start: number;
  readonly end: number;
  readonly data: T;
}

/** Half-open overlap test: `[a.start,a.end)` intersects `[b.start,b.end)`. */
export function overlaps<T>(a: Interval<T>, b: Interval<T>): boolean {
  return a.start < b.end && b.start < a.end;
}
