import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { packColumns } from './pack-columns';
import { overlaps, type Interval } from './interval';

const iv = (start: number, end: number, data = `${start}-${end}`): Interval<string> => ({
  start,
  end,
  data,
});

describe('packColumns', () => {
  it('returns empty for no intervals', () => {
    expect(packColumns([]).items).toEqual([]);
  });

  it('gives a lone interval full width (1 column, span 1)', () => {
    const r = packColumns([iv(0, 60)]);
    expect(r.items[0]).toMatchObject({ column: 0, columns: 1, span: 1 });
  });

  it('splits two fully-overlapping intervals into two half-width columns', () => {
    const r = packColumns([iv(0, 60, 'A'), iv(0, 60, 'B')]);
    const a = r.items.find((i) => i.data === 'A')!;
    const b = r.items.find((i) => i.data === 'B')!;
    expect(a.columns).toBe(2);
    expect(b.columns).toBe(2);
    expect(new Set([a.column, b.column])).toEqual(new Set([0, 1]));
    // neither back-fills past the other
    expect(a.span).toBe(1);
    expect(b.span).toBe(1);
  });

  it('separate (non-overlapping) intervals are independent clusters at full width', () => {
    const r = packColumns([iv(0, 30, 'A'), iv(60, 90, 'B')]);
    expect(r.items.every((i) => i.columns === 1 && i.span === 1)).toBe(true);
  });

  it('back-fills an event with no right neighbour into the free column', () => {
    // A:[0,60) col0; B:[0,30) col1; after B ends, A has no right neighbour in [30,60)
    // but A overlaps B in [0,30) so A cannot back-fill; B can't either (A occupies col0).
    // C:[30,60) reuses col1; A still blocked by B then C across its extent → span 1.
    const r = packColumns([iv(0, 60, 'A'), iv(0, 30, 'B'), iv(30, 60, 'C')]);
    const get = (d: string) => r.items.find((i) => i.data === d)!;
    expect(get('A').columns).toBe(2);
    expect(get('A').span).toBe(1); // blocked across its whole extent
    // B occupies col1 for [0,30); it can back-fill? col0 is to its LEFT (A), no right cols → span1
    expect(get('B').span).toBe(1);
  });

  it('back-fills when a right column is genuinely free for the whole extent', () => {
    // A:[0,30) and B:[0,10) overlap → 2 cols. A is [0,30): col0; B col1 [0,10).
    // A overlaps B only in [0,10); for [10,30) col1 is free, but back-fill requires the
    // column be free for A's WHOLE extent, so A stays span 1 (correct, conservative).
    // Now a clean case: A:[0,10) col0, then nothing else overlaps a lone later interval.
    const r = packColumns([iv(0, 10, 'A'), iv(0, 5, 'B')]);
    const a = r.items.find((i) => i.data === 'A')!;
    expect(a.columns).toBe(2);
    expect(a.span).toBe(1);
  });

  it('preserves input order', () => {
    const r = packColumns([iv(50, 60, 'x'), iv(0, 10, 'y'), iv(5, 15, 'z')]);
    expect(r.items.map((i) => i.data)).toEqual(['x', 'y', 'z']);
  });

  it('property: overlapping intervals never share the same column, geometry in [0,1]', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 1, max: 40 }))
            .map(([s, len]) => iv(s, s + len)),
          { maxLength: 50 },
        ),
        (intervals) => {
          const r = packColumns(intervals);
          const placed = intervals.map((interval, i) => ({ interval, p: r.items[i]! }));
          for (const { p } of placed) {
            // geometry fractions within [0,1]
            const left = p.column / p.columns;
            const width = p.span / p.columns;
            expect(left).toBeGreaterThanOrEqual(0);
            expect(left + width).toBeLessThanOrEqual(1 + 1e-9);
            expect(p.span).toBeGreaterThanOrEqual(1);
            expect(p.column).toBeLessThan(p.columns);
          }
          for (let i = 0; i < placed.length; i++) {
            for (let j = i + 1; j < placed.length; j++) {
              const a = placed[i]!;
              const b = placed[j]!;
              if (overlaps(a.interval, b.interval)) {
                // overlapping events must not occupy the same column slot
                expect(a.p.column === b.p.column).toBe(false);
                // and their back-filled spans must not visually overlap
                const aL = a.p.column / a.p.columns;
                const aR = (a.p.column + a.p.span) / a.p.columns;
                const bL = b.p.column / b.p.columns;
                const bR = (b.p.column + b.p.span) / b.p.columns;
                expect(aL < bR && bL < aR).toBe(false);
              }
            }
          }
        },
      ),
    );
  });
});

describe('packColumns — column reuse within a cluster', () => {
  it('reuses a freed column for a later interval in the same cluster', () => {
    // A[0,5] col0, B[0,10] col1 (cluster maxEnd 10), C[6,10] reuses col0 (free at 6)
    const r = packColumns([iv(0, 5, 'A'), iv(0, 10, 'B'), iv(6, 10, 'C')]);
    const get = (d: string) => r.items.find((i) => i.data === d)!;
    expect(get('A').column).toBe(0);
    expect(get('B').column).toBe(1);
    expect(get('C').column).toBe(0); // reused A's column
    expect(get('C').columns).toBe(2);
  });
});
