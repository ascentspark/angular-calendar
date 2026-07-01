import { snapValue } from '../core/layout/projection';

/** The kind of in-flight gesture. */
export type DragKind = 'move' | 'resize-start' | 'resize-end' | 'create';

/** Pure inputs describing an in-flight gesture (no DOM, no signals). */
export interface DragInput {
  readonly kind: DragKind;
  /** Original event start (epoch ms); for `create`, the anchor instant. */
  readonly originStartMs: number;
  /** Original event end (epoch ms); for `create`, equal to the anchor. */
  readonly originEndMs: number;
  /** Pointer travel along the time axis, in minutes (move / resize). */
  readonly deltaMinutes: number;
  /** Current pointer instant (epoch ms) — used by `create`. */
  readonly pointerMs?: number;
  /** Snap grid in minutes (≤ 0 disables snapping). */
  readonly snapMinutes: number;
  /** Minimum duration in minutes (resize/create never collapse below this). */
  readonly minDurationMinutes: number;
}

/** Resolved preview times for a gesture. */
export interface DragTimes {
  readonly startMs: number;
  readonly endMs: number;
}

const MS_PER_MIN = 60_000;

/** Snap an absolute instant (epoch ms) to the snap grid, aligned to clock time. */
function snapMs(ms: number, snapMinutes: number): number {
  if (snapMinutes <= 0) {
    return ms;
  }
  const step = snapMinutes * MS_PER_MIN;
  return Math.round(ms / step) * step;
}

/**
 * Compute the previewed start/end for an in-flight gesture. Pure: the same input
 * always yields the same times, so the live preview is a `computed` over the drag
 * state and never mutates the underlying event.
 *
 * - `move`: shift both ends by the snapped delta.
 * - `resize-end`: move the end by the snapped delta, floored to `minDuration`.
 * - `resize-start`: move the start by the snapped delta, capped to `minDuration`.
 * - `create`: span snapped anchor → snapped pointer, expanded to `minDuration`.
 */
export function computeDragTimes(input: DragInput): DragTimes {
  const minMs = Math.max(0, input.minDurationMinutes) * MS_PER_MIN;
  const deltaMs = snapValue(input.deltaMinutes, input.snapMinutes) * MS_PER_MIN;

  switch (input.kind) {
    case 'move':
      return { startMs: input.originStartMs + deltaMs, endMs: input.originEndMs + deltaMs };

    case 'resize-end': {
      const start = input.originStartMs;
      const end = Math.max(start + minMs, input.originEndMs + deltaMs);
      return { startMs: start, endMs: end };
    }

    case 'resize-start': {
      const end = input.originEndMs;
      const start = Math.min(end - minMs, input.originStartMs + deltaMs);
      return { startMs: start, endMs: end };
    }

    case 'create': {
      const anchor = snapMs(input.originStartMs, input.snapMinutes);
      const pointer = snapMs(input.pointerMs ?? input.originStartMs, input.snapMinutes);
      const start = Math.min(anchor, pointer);
      let end = Math.max(anchor, pointer);
      if (end - start < minMs) {
        end = start + minMs;
      }
      return { startMs: start, endMs: end };
    }
  }
}
