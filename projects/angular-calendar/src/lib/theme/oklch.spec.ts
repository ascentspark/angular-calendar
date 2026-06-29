import { describe, it, expect } from 'vitest';
import { contrastRatio, parseHex, type Rgb } from './color';
import {
  srgbToOklch,
  oklchToSrgb,
  oklchColor,
  withLightness,
  mixOklab,
  ensureContrastAA,
} from './oklch';

const close = (a: Rgb, b: Rgb, tol = 2): boolean =>
  Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;

describe('srgbToOklch / oklchToSrgb', () => {
  it('round-trips representative colours within 2/255', () => {
    for (const hex of ['#000000', '#ffffff', '#3b82f6', '#e5484d', '#117a52', '#abcdef']) {
      const rgb = parseHex(hex);
      const back = oklchToSrgb(srgbToOklch(rgb));
      expect(close(rgb, back)).toBe(true);
    }
  });
  it('hue is normalised into [0,360)', () => {
    const h = srgbToOklch(parseHex('#3b82f6')).h;
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });
});

describe('oklchColor', () => {
  it('produces a valid in-gamut colour at requested lightness', () => {
    const c = oklchColor(0.5, 0.1, 250);
    expect(c.r).toBeGreaterThanOrEqual(0);
    expect(c.r).toBeLessThanOrEqual(255);
    // lightness should be near requested
    expect(srgbToOklch(c).l).toBeCloseTo(0.5, 1);
  });
});

describe('withLightness', () => {
  it('hits the requested lightness while preserving hue', () => {
    const blue = parseHex('#3b82f6');
    const lighter = withLightness(blue, 0.85);
    expect(srgbToOklch(lighter).l).toBeCloseTo(0.85, 1);
    expect(Math.abs(srgbToOklch(lighter).h - srgbToOklch(blue).h)).toBeLessThan(8);
  });
});

describe('mixOklab', () => {
  it('t=0 returns a, t=1 returns b, t=0.5 is between', () => {
    const a = parseHex('#000000');
    const b = parseHex('#ffffff');
    expect(close(mixOklab(a, b, 0), a)).toBe(true);
    expect(close(mixOklab(a, b, 1), b)).toBe(true);
    const mid = mixOklab(a, b, 0.5);
    expect(mid.r).toBeGreaterThan(80);
    expect(mid.r).toBeLessThan(220);
  });
});

describe('ensureContrastAA', () => {
  it('returns fg unchanged when it already meets the target', () => {
    const fg = parseHex('#000000');
    const bg = parseHex('#ffffff');
    expect(ensureContrastAA(fg, bg, 4.5)).toEqual(fg);
  });
  it('adjusts low-contrast fg to reach the target ratio against light bg', () => {
    const bg = parseHex('#ffffff');
    const fg = parseHex('#dddddd'); // far too light on white
    const fixed = ensureContrastAA(fg, bg, 4.5);
    expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('adjusts low-contrast fg to reach the target ratio against dark bg', () => {
    const bg = parseHex('#101010');
    const fg = parseHex('#222222'); // too dark on near-black
    const fixed = ensureContrastAA(fg, bg, 4.5);
    expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
