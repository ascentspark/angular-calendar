import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  clampFraction,
  offsetFraction,
  sizeFraction,
  valueAtFraction,
  snapValue,
  type ProjectionRange,
} from './projection';

const day: ProjectionRange = { start: 0, total: 1440 }; // a 24h day in minutes

describe('clampFraction', () => {
  it('clamps to [0,1]', () => {
    expect(clampFraction(-0.2)).toBe(0);
    expect(clampFraction(0.4)).toBe(0.4);
    expect(clampFraction(1.5)).toBe(1);
  });
});

describe('offsetFraction / sizeFraction', () => {
  it('maps minutes to fractions of the day', () => {
    expect(offsetFraction(0, day)).toBe(0);
    expect(offsetFraction(720, day)).toBe(0.5);
    expect(offsetFraction(1440, day)).toBe(1);
    expect(sizeFraction(540, 600, day)).toBeCloseTo(60 / 1440, 12);
  });
  it('handles a non-positive total without NaN/Infinity', () => {
    expect(offsetFraction(100, { start: 0, total: 0 })).toBe(0);
    expect(sizeFraction(0, 100, { start: 0, total: -5 })).toBe(0);
  });
  it('respects a non-zero range start (e.g. working-hours window)', () => {
    const window: ProjectionRange = { start: 480, total: 600 }; // 08:00–18:00
    expect(offsetFraction(480, window)).toBe(0);
    expect(offsetFraction(1080, window)).toBe(1);
  });
});

describe('valueAtFraction (inverse)', () => {
  it('inverts offsetFraction (round-trip)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1440 }), (minute) => {
        const f = offsetFraction(minute, day);
        expect(valueAtFraction(f, day)).toBeCloseTo(minute, 9);
      }),
    );
  });
});

describe('snapValue', () => {
  it('snaps to the nearest step from origin', () => {
    expect(snapValue(7, 15)).toBe(0);
    expect(snapValue(8, 15)).toBe(15);
    expect(snapValue(517, 15)).toBe(displayRound(517, 15));
  });
  it('snaps relative to a non-zero origin', () => {
    expect(snapValue(491, 15, 480)).toBe(495); // 480 + round(11/15)*15 = 480+15
  });
  it('is a no-op for a non-positive step', () => {
    expect(snapValue(123.4, 0)).toBe(123.4);
    expect(snapValue(123.4, -5)).toBe(123.4);
  });
  it('property: result is always a multiple of step from origin and within half a step', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.integer({ min: 1, max: 60 }),
        (value, step) => {
          const snapped = snapValue(value, step);
          expect(Math.abs(snapped - value)).toBeLessThanOrEqual(step / 2 + 1e-9);
          expect(Math.abs(snapped / step - Math.round(snapped / step))).toBeLessThan(1e-9);
        },
      ),
    );
  });
});

function displayRound(value: number, step: number): number {
  return Math.round(value / step) * step;
}
