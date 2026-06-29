/**
 * OKLab / OKLCH conversions and perceptual colour operations.
 *
 * OKLCH is used for theme derivation because its lightness axis is perceptually
 * uniform — lifting/lowering `l` produces visually even steps, and adjusting `l`
 * alone (preserving hue/chroma) is exactly what we need to hit WCAG contrast
 * targets without shifting the brand hue. Math after Björn Ottosson's OKLab.
 *
 * All functions are pure and SSR-safe.
 */

import { contrastRatio, type Rgb } from './color';

/** A colour in OKLCH: `l` (lightness 0–1), `c` (chroma ≥ 0), `h` (hue degrees 0–360). */
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** sRGB 8-bit channel → linear-light [0,1]. */
const toLinear = (channel8: number): number => {
  const c = clamp(channel8, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** linear-light [0,1] → sRGB 8-bit channel (clamped). */
const fromLinear = (linear: number): number => {
  const c = clamp(linear, 0, 1);
  const encoded = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp(Math.round(encoded * 255), 0, 255);
};

interface Oklab {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}

function srgbToOklab(rgb: Rgb): Oklab {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

interface LinearRgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** OKLab → linear-light sRGB, WITHOUT clamping (channels may fall outside [0,1]). */
function oklabToLinear(lab: Oklab): LinearRgb {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function oklabToSrgb(lab: Oklab): Rgb {
  const lin = oklabToLinear(lab);
  return { r: fromLinear(lin.r), g: fromLinear(lin.g), b: fromLinear(lin.b) };
}

const GAMUT_EPS = 1e-4;

const inGamut = (lin: LinearRgb): boolean =>
  lin.r >= -GAMUT_EPS &&
  lin.r <= 1 + GAMUT_EPS &&
  lin.g >= -GAMUT_EPS &&
  lin.g <= 1 + GAMUT_EPS &&
  lin.b >= -GAMUT_EPS &&
  lin.b <= 1 + GAMUT_EPS;

/**
 * Reduce an OKLCH colour's chroma (preserving lightness and hue) by binary search
 * until it fits inside the sRGB gamut. This keeps the requested perceptual
 * lightness exact — at the cost of some saturation — which is precisely the
 * trade-off wanted when generating light/dark tints from a saturated accent.
 */
function gamutMapChroma(oklch: Oklch): Oklch {
  const toLin = (c: number): LinearRgb => {
    const hr = (oklch.h * Math.PI) / 180;
    return oklabToLinear({ L: oklch.l, a: c * Math.cos(hr), b: c * Math.sin(hr) });
  };

  if (inGamut(toLin(oklch.c))) {
    return oklch;
  }

  let lo = 0;
  let hi = oklch.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(toLin(mid))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { l: oklch.l, c: lo, h: oklch.h };
}

const DEG = 180 / Math.PI;

/** Convert an sRGB colour to OKLCH. */
export function srgbToOklch(rgb: Rgb): Oklch {
  const { L, a, b } = srgbToOklab(rgb);
  const c = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * DEG;
  if (h < 0) {
    h += 360;
  }
  return { l: L, c, h };
}

/** Convert an OKLCH colour to sRGB (gamut-clamped to valid channels). */
export function oklchToSrgb(oklch: Oklch): Rgb {
  const hr = (oklch.h * Math.PI) / 180;
  return oklabToSrgb({
    L: oklch.l,
    a: oklch.c * Math.cos(hr),
    b: oklch.c * Math.sin(hr),
  });
}

/**
 * Construct an sRGB colour from explicit lightness, chroma, and hue, reducing
 * chroma as needed so the requested lightness is preserved within sRGB. This is
 * the building block for generating tinted neutral scales from a hue.
 */
export function oklchColor(l: number, c: number, h: number): Rgb {
  return oklchToSrgb(gamutMapChroma({ l: clamp(l, 0, 1), c: Math.max(0, c), h }));
}

/**
 * Return `rgb` with its OKLCH lightness set to `l` (0–1), preserving hue and (as
 * much as the gamut allows) chroma. Chroma is reduced only when the requested
 * lightness would otherwise push the colour out of sRGB, so the target lightness
 * is hit exactly.
 */
export function withLightness(rgb: Rgb, l: number): Rgb {
  const oklch = srgbToOklch(rgb);
  return oklchToSrgb(gamutMapChroma({ l: clamp(l, 0, 1), c: oklch.c, h: oklch.h }));
}

/** Perceptual blend of two colours in OKLab space; `t` is clamped to [0,1]. */
export function mixOklab(a: Rgb, b: Rgb, t: number): Rgb {
  const tt = clamp(t, 0, 1);
  const la = srgbToOklab(a);
  const lb = srgbToOklab(b);
  return oklabToSrgb({
    L: la.L + (lb.L - la.L) * tt,
    a: la.a + (lb.a - la.a) * tt,
    b: la.b + (lb.b - la.b) * tt,
  });
}

/**
 * Adjust `fg`'s OKLCH lightness (only) until it reaches `targetRatio` contrast
 * against `bg`, preserving hue/chroma so the brand colour family is kept. Search
 * direction is chosen by the background's luminance: darken the foreground on a
 * light background, lighten it on a dark one. If the target is unreachable even
 * at the lightness extreme, returns the best (extreme) attempt.
 */
export function ensureContrastAA(fg: Rgb, bg: Rgb, targetRatio = 4.5): Rgb {
  if (contrastRatio(fg, bg) >= targetRatio) {
    return fg;
  }

  const base = srgbToOklch(fg);
  const bgIsLight = srgbToOklch(bg).l >= 0.5;
  const step = 0.02;

  let best = fg;
  let bestRatio = contrastRatio(fg, bg);

  for (let l = base.l; l >= 0 && l <= 1; l += bgIsLight ? -step : step) {
    const candidate = oklchToSrgb({ l, c: base.c, h: base.h });
    const ratio = contrastRatio(candidate, bg);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= targetRatio) {
      return candidate;
    }
  }

  // Try the absolute extreme (pure black/white via this hue) as a final attempt.
  const extreme = oklchToSrgb({ l: bgIsLight ? 0 : 1, c: 0, h: base.h });
  return contrastRatio(extreme, bg) > bestRatio ? extreme : best;
}
