/**
 * Pure pixel↔time projection math (fraction-based, DOM-unit-free).
 *
 * View builders convert instants to "minutes from period start" via the date
 * adapter, then use these helpers to produce geometry as fractions of the axis.
 * The interaction layer uses the inverse ({@link valueAtFraction}) to turn a
 * pointer position back into a time. Keeping geometry in fractions means the DOM
 * is measured (via `ResizeObserver`) only to multiply by pixel size — never read
 * synchronously mid-gesture — which is what keeps the perf budgets reachable.
 */

/** A linear axis range `[start, start+total)` on a numeric scale (e.g. minutes). */
export interface ProjectionRange {
  /** Value at fraction 0. */
  readonly start: number;
  /** Total extent of the axis; must be > 0 for a meaningful projection. */
  readonly total: number;
}

/** Clamp `f` to the closed unit interval `[0, 1]`. */
export function clampFraction(f: number): number {
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/**
 * Fraction (0–1) of `value` along the range. Returns 0 for a non-positive total
 * (degenerate axis) rather than producing `Infinity`/`NaN`.
 */
export function offsetFraction(value: number, range: ProjectionRange): number {
  return range.total > 0 ? (value - range.start) / range.total : 0;
}

/** Fraction (0–1) length of the span `[from, to)` along the range. */
export function sizeFraction(from: number, to: number, range: ProjectionRange): number {
  return range.total > 0 ? (to - from) / range.total : 0;
}

/** Inverse of {@link offsetFraction}: the value at fraction `f` along the range. */
export function valueAtFraction(f: number, range: ProjectionRange): number {
  return range.start + f * range.total;
}

/**
 * Snap `value` to the nearest multiple of `step` measured from `origin`. Used to
 * quantise drag/resize/create to `snapMinutes`. A non-positive `step` is a no-op.
 */
export function snapValue(value: number, step: number, origin = 0): number {
  if (step <= 0) {
    return value;
  }
  return origin + Math.round((value - origin) / step) * step;
}
