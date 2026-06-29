import { overlaps, type Interval } from './interval';

/** An interval assigned to a vertical column within its overlap cluster. */
export interface ColumnPlacement<T> {
  readonly data: T;
  /** Zero-based column index within the cluster. */
  readonly column: number;
  /** Number of columns in this interval's overlap cluster (≥ 1). */
  readonly columns: number;
  /**
   * How many consecutive columns (starting at {@link column}) this interval may
   * occupy — the back-fill width. `1` unless the interval can expand rightward
   * into columns that are free for its whole extent. Cross-axis geometry is then
   * `left = column / columns`, `width = span / columns`.
   */
  readonly span: number;
}

/** Result of {@link packColumns}: placements in input order. */
export interface ColumnPacking<T> {
  readonly items: readonly ColumnPlacement<T>[];
}

interface Indexed<T> {
  readonly interval: Interval<T>;
  readonly index: number;
}

/**
 * Side-by-side column packing for timed events (sweep-line).
 *
 * 1. Group intervals into maximal **overlap clusters** (a new cluster begins when
 *    an interval starts at or after the running max-end of the current cluster).
 * 2. Within a cluster, assign each interval (start-ordered) the **lowest column**
 *    whose previous occupant has ended — classic greedy interval colouring.
 * 3. **Back-fill**: each interval expands rightward across columns that stay free
 *    for its whole extent, so an event with no right-neighbour fills the gap.
 *
 * Pure; preserves input order; never mutates inputs. Geometry is fraction-based
 * (DOM-unit-free) so it composes with signals / OnPush without layout reads.
 */
export function packColumns<T>(intervals: readonly Interval<T>[]): ColumnPacking<T> {
  const indexed: Indexed<T>[] = intervals.map((interval, index) => ({ interval, index }));
  const byStart = [...indexed].sort((a, b) =>
    a.interval.start !== b.interval.start
      ? a.interval.start - b.interval.start
      : a.interval.end - b.interval.end,
  );

  const column = new Array<number>(intervals.length);
  const columns = new Array<number>(intervals.length);
  const span = new Array<number>(intervals.length);

  let cluster: Indexed<T>[] = [];
  let clusterMaxEnd = Number.NEGATIVE_INFINITY;

  const flush = (): void => {
    if (cluster.length === 0) {
      return;
    }
    // Assign lowest free column per interval (greedy by start order).
    const colEnds: number[] = [];
    for (const { interval, index } of cluster) {
      let col = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if ((colEnds[c] ?? Number.POSITIVE_INFINITY) <= interval.start) {
          col = c;
          break;
        }
      }
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(interval.end);
      } else {
        colEnds[col] = interval.end;
      }
      column[index] = col;
    }
    const colCount = colEnds.length;

    // Back-fill: expand each interval rightward across columns free for its extent.
    for (const { interval, index } of cluster) {
      const startCol = column[index] ?? 0;
      let width = 1;
      for (let c = startCol + 1; c < colCount; c++) {
        const blocked = cluster.some(
          (other) =>
            other.index !== index &&
            (column[other.index] ?? -1) === c &&
            overlaps(interval, other.interval),
        );
        if (blocked) {
          break;
        }
        width++;
      }
      columns[index] = colCount;
      span[index] = width;
    }

    cluster = [];
    clusterMaxEnd = Number.NEGATIVE_INFINITY;
  };

  for (const entry of byStart) {
    if (cluster.length > 0 && entry.interval.start >= clusterMaxEnd) {
      flush();
    }
    cluster.push(entry);
    clusterMaxEnd = Math.max(clusterMaxEnd, entry.interval.end);
  }
  flush();

  const items: ColumnPlacement<T>[] = intervals.map((interval, index) => ({
    data: interval.data,
    column: column[index] ?? 0,
    columns: columns[index] ?? 1,
    span: span[index] ?? 1,
  }));

  return { items };
}
