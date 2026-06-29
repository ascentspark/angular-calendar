import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { packRows } from './pack-rows';
import { overlaps, type Interval } from './interval';

const iv = (start: number, end: number, data = `${start}-${end}`): Interval<string> => ({
  start,
  end,
  data,
});

describe('packRows', () => {
  it('returns an empty packing for no intervals', () => {
    expect(packRows([])).toEqual({ items: [], laneCount: 0 });
  });

  it('puts non-overlapping sequential intervals all on lane 0', () => {
    const r = packRows([iv(0, 1), iv(1, 2), iv(2, 3)]);
    expect(r.laneCount).toBe(1);
    expect(r.items.map((i) => i.lane)).toEqual([0, 0, 0]);
  });

  it('stacks fully-overlapping intervals onto distinct lanes', () => {
    const r = packRows([iv(0, 3), iv(0, 3), iv(0, 3)]);
    expect(r.laneCount).toBe(3);
    expect([...r.items.map((i) => i.lane)].sort()).toEqual([0, 1, 2]);
  });

  it('reuses a freed lane after an interval ends (first-fit)', () => {
    // A:[0,2) B:[0,1) then C:[1,2) — C reuses B's lane (1)
    const r = packRows([iv(0, 2, 'A'), iv(0, 1, 'B'), iv(1, 2, 'C')]);
    const lane = (d: string): number => r.items.find((i) => i.data === d)!.lane;
    expect(lane('A')).toBe(0);
    expect(lane('B')).toBe(1);
    expect(lane('C')).toBe(1);
    expect(r.laneCount).toBe(2);
  });

  it('preserves input order in the output', () => {
    const r = packRows([iv(5, 6, 'x'), iv(0, 1, 'y'), iv(2, 3, 'z')]);
    expect(r.items.map((i) => i.data)).toEqual(['x', 'y', 'z']);
  });

  it('property: no two intervals on the same lane overlap, and lanes are in range', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .tuple(fc.integer({ min: 0, max: 50 }), fc.integer({ min: 1, max: 20 }))
            .map(([s, len]) => iv(s, s + len)),
          { maxLength: 60 },
        ),
        (intervals) => {
          const r = packRows(intervals);
          // every lane within [0, laneCount)
          for (const item of r.items) {
            expect(item.lane).toBeGreaterThanOrEqual(0);
            expect(item.lane).toBeLessThan(Math.max(1, r.laneCount));
          }
          // pair up original intervals with placements by index
          const placed = intervals.map((interval, i) => ({
            interval,
            lane: r.items[i]!.lane,
          }));
          for (let i = 0; i < placed.length; i++) {
            for (let j = i + 1; j < placed.length; j++) {
              const a = placed[i]!;
              const b = placed[j]!;
              if (a.lane === b.lane) {
                expect(overlaps(a.interval, b.interval)).toBe(false);
              }
            }
          }
        },
      ),
    );
  });
});
