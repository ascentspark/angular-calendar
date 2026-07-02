import { describe, it, expect } from 'vitest';
import { computeRowWindow } from './virtual-window';

describe('computeRowWindow', () => {
  // 10 rows, 20px each → total 200px.
  const uniform = Array.from({ length: 10 }, () => 20);

  it('returns the full spacer split for an empty list', () => {
    expect(computeRowWindow([], 0, 100)).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0 });
  });

  it('windows the top of a uniform list', () => {
    const w = computeRowWindow(uniform, 0, 100);
    expect(w.start).toBe(0);
    expect(w.end).toBe(5); // 100px / 20px = 5 rows
    expect(w.padTop).toBe(0);
    expect(w.padBottom).toBe(100); // rows 5..9
  });

  it('windows a scrolled-middle region and preserves total height', () => {
    const w = computeRowWindow(uniform, 60, 80); // viewport 60..140
    expect(w.start).toBe(3); // row 3 starts at 60
    expect(w.end).toBe(7); // row 6 ends at 140
    expect(w.padTop).toBe(60); // rows 0..2
    expect(w.padBottom).toBe(60); // rows 7..9
    // total is always conserved
    const rendered = (w.end - w.start) * 20;
    expect(w.padTop + rendered + w.padBottom).toBe(200);
  });

  it('includes overscan rows above and below', () => {
    const w = computeRowWindow(uniform, 60, 80, 20); // overscan 20px each way
    expect(w.start).toBe(2); // one extra row above
    expect(w.end).toBe(8); // one extra row below
    expect(w.padTop).toBe(40);
    expect(w.padBottom).toBe(40);
  });

  it('handles variable row heights', () => {
    const heights = [10, 50, 30, 40, 20]; // offsets: 0,10,60,90,130 total 150
    const w = computeRowWindow(heights, 55, 40); // viewport 55..95
    expect(w.start).toBe(1); // row 1 spans 10..60
    expect(w.end).toBe(4); // row 3 spans 90..130, starts before 95
    expect(w.padTop).toBe(10);
    expect(w.padBottom).toBe(20); // row 4
  });

  it('renders nothing but keeps full height when scrolled past the end', () => {
    const w = computeRowWindow(uniform, 500, 100);
    expect(w.start).toBe(10);
    expect(w.end).toBe(10);
    expect(w.padTop).toBe(200);
    expect(w.padBottom).toBe(0);
  });
});
