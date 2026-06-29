import { describe, it, expect } from 'vitest';
import { computeDragTimes, type DragInput } from './drag-preview';

const MIN = 60_000;
const base = (over: Partial<DragInput>): DragInput => ({
  kind: 'move',
  originStartMs: 0,
  originEndMs: 60 * MIN,
  deltaMinutes: 0,
  snapMinutes: 15,
  minDurationMinutes: 15,
  ...over,
});

describe('computeDragTimes — move', () => {
  it('shifts both ends by the snapped delta', () => {
    const t = computeDragTimes(base({ kind: 'move', deltaMinutes: 22 }));
    // 22 snaps to 15 → shift 15 min
    expect(t.startMs).toBe(15 * MIN);
    expect(t.endMs).toBe(75 * MIN);
  });
  it('snaps negative deltas too', () => {
    const t = computeDragTimes(base({ kind: 'move', deltaMinutes: -8 }));
    expect(t.startMs).toBe(-15 * MIN);
    expect(t.endMs).toBe(45 * MIN);
  });
  it('no snapping when snapMinutes <= 0', () => {
    const t = computeDragTimes(base({ kind: 'move', deltaMinutes: 7, snapMinutes: 0 }));
    expect(t.startMs).toBe(7 * MIN);
  });
});

describe('computeDragTimes — resize', () => {
  it('resize-end moves the end and never collapses below minDuration', () => {
    const t = computeDragTimes(base({ kind: 'resize-end', deltaMinutes: 30 }));
    expect(t.startMs).toBe(0);
    expect(t.endMs).toBe(90 * MIN);
  });
  it('resize-end floors to minDuration when dragged past the start', () => {
    const t = computeDragTimes(base({ kind: 'resize-end', deltaMinutes: -90, minDurationMinutes: 15 }));
    expect(t.endMs).toBe(15 * MIN); // 60 - 90 = -30 → floored to start+15
  });
  it('resize-start moves the start and caps at minDuration', () => {
    const t = computeDragTimes(base({ kind: 'resize-start', deltaMinutes: -30 }));
    expect(t.startMs).toBe(-30 * MIN);
    expect(t.endMs).toBe(60 * MIN);
  });
  it('resize-start cannot cross the end (minDuration cap)', () => {
    const t = computeDragTimes(base({ kind: 'resize-start', deltaMinutes: 90, minDurationMinutes: 15 }));
    expect(t.startMs).toBe(45 * MIN); // end(60) - 15
  });
});

describe('computeDragTimes — create', () => {
  it('spans snapped anchor → pointer', () => {
    const t = computeDragTimes(base({ kind: 'create', originStartMs: 30 * MIN, pointerMs: 97 * MIN }));
    // anchor 30 snaps to 30; pointer 97 snaps to 90
    expect(t.startMs).toBe(30 * MIN);
    expect(t.endMs).toBe(90 * MIN);
  });
  it('expands to minDuration for a click (anchor == pointer)', () => {
    const t = computeDragTimes(base({ kind: 'create', originStartMs: 30 * MIN, pointerMs: 30 * MIN, minDurationMinutes: 30 }));
    expect(t.endMs - t.startMs).toBe(30 * MIN);
  });
  it('orders anchor/pointer regardless of drag direction', () => {
    const t = computeDragTimes(base({ kind: 'create', originStartMs: 90 * MIN, pointerMs: 30 * MIN }));
    expect(t.startMs).toBe(30 * MIN);
    expect(t.endMs).toBe(90 * MIN);
  });
});
