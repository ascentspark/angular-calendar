/**
 * Pure vertical windowing over variable-height rows — the math behind list
 * virtualization, with no DOM. Given each row's height, the scroll offset and the
 * viewport height, it returns the contiguous slice of rows that intersects the
 * viewport (plus an overscan margin) and the spacer heights above and below that
 * preserve the total scroll height. Components render `rows.slice(start, end)`
 * between two spacers of `padTop` / `padBottom` pixels.
 */
export interface VirtualWindow {
  /** First visible row index (inclusive). */
  readonly start: number;
  /** One past the last visible row index (exclusive) — use with `slice(start, end)`. */
  readonly end: number;
  /** Pixel height of the rows before `start` (top spacer). */
  readonly padTop: number;
  /** Pixel height of the rows at/after `end` (bottom spacer). */
  readonly padBottom: number;
}

/**
 * @param heights per-row pixel heights, in order.
 * @param scrollTop current scroll offset of the viewport.
 * @param viewportHeight visible height of the scroll viewport.
 * @param overscanPx extra margin rendered above and below the viewport to avoid
 *   blank flashes during fast scrolling (default 0).
 */
export function computeRowWindow(
  heights: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscanPx = 0,
): VirtualWindow {
  const n = heights.length;
  if (n === 0) {
    return { start: 0, end: 0, padTop: 0, padBottom: 0 };
  }
  let total = 0;
  for (const h of heights) {
    total += h;
  }
  const viewTop = Math.max(0, scrollTop - overscanPx);
  const viewBottom = scrollTop + viewportHeight + overscanPx;

  // Advance `start` past every row that lies entirely above the (overscanned) viewport.
  let start = 0;
  let acc = 0;
  while (start < n && acc + (heights[start] ?? 0) <= viewTop) {
    acc += heights[start] ?? 0;
    start += 1;
  }
  const padTop = acc; // height of rows [0, start)

  // Extend `end` while the running bottom edge is still above the viewport bottom.
  let end = start;
  let accEnd = acc;
  while (end < n && accEnd < viewBottom) {
    accEnd += heights[end] ?? 0;
    end += 1;
  }
  const padBottom = total - accEnd; // height of rows [end, n)

  return { start, end, padTop, padBottom };
}
