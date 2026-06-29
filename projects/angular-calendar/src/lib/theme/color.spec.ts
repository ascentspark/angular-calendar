import { describe, it, expect } from 'vitest';
import {
  parseHex,
  formatHex,
  contrastRatio,
  relativeLuminance,
  withAlpha,
} from './color';

describe('parseHex', () => {
  it('parses 6-digit hex', () => {
    expect(parseHex('#1a2b3c')).toEqual({ r: 26, g: 43, b: 60 });
  });
  it('parses 3-digit shorthand and tolerates no hash, case-insensitive', () => {
    expect(parseHex('fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('#0a0')).toEqual({ r: 0, g: 170, b: 0 });
    expect(parseHex('#FFAA00')).toEqual({ r: 255, g: 170, b: 0 });
  });
  it('throws on invalid hex', () => {
    expect(() => parseHex('nope')).toThrowError(/Invalid hex/);
    expect(() => parseHex('#12')).toThrowError(/Invalid hex/);
    expect(() => parseHex('#1234567')).toThrowError(/Invalid hex/);
  });
});

describe('formatHex', () => {
  it('round-trips and clamps out-of-range channels', () => {
    expect(formatHex({ r: 26, g: 43, b: 60 })).toBe('#1a2b3c');
    expect(formatHex({ r: -5, g: 300, b: 127.6 })).toBe('#00ff80');
  });
  it('parseHex∘formatHex is identity for valid 6-digit input', () => {
    for (const hex of ['#000000', '#ffffff', '#123456', '#abcdef']) {
      expect(formatHex(parseHex(hex))).toBe(hex);
    }
  });
});

describe('contrast & luminance', () => {
  it('white-on-black is 21:1', () => {
    expect(
      contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 }),
    ).toBeCloseTo(21, 1);
  });
  it('same colour is 1:1 and order-independent', () => {
    const c = { r: 100, g: 120, b: 140 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 5);
    const a = { r: 0, g: 0, b: 0 };
    expect(contrastRatio(a, c)).toBeCloseTo(contrastRatio(c, a), 6);
  });
  it('relative luminance of black is 0 and white is 1', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 6);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
  });
});

describe('withAlpha', () => {
  it('formats rgba and clamps alpha', () => {
    expect(withAlpha({ r: 10, g: 20, b: 30 }, 0.5)).toBe('rgba(10, 20, 30, 0.5)');
    expect(withAlpha({ r: 10, g: 20, b: 30 }, 5)).toBe('rgba(10, 20, 30, 1)');
    expect(withAlpha({ r: 10, g: 20, b: 30 }, -1)).toBe('rgba(10, 20, 30, 0)');
  });
});
