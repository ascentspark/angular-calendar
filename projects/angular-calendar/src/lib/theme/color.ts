/**
 * Small, dependency-free colour utilities used by the theme deriver.
 *
 * Everything here is pure (no DOM, no globals) so it is trivially unit-testable
 * and safe to run during SSR. Colours are represented as 8-bit sRGB channels.
 */

/** An sRGB colour with 8-bit channels (0–255, not necessarily integral until formatted). */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/** Clamp to [0,255] and round to the nearest integer. */
const clampChannel = (value: number): number => clamp(Math.round(value), 0, 255);

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parse a hex colour string (`#rgb`, `#rrggbb`, with or without the leading `#`,
 * case-insensitive) into an {@link Rgb}.
 *
 * @throws {Error} if the string is not a valid 3- or 6-digit hex colour.
 */
export function parseHex(hex: string): Rgb {
  const match = HEX_RE.exec(hex.trim());
  if (match === null || match[1] === undefined) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }
  const raw = match[1];
  const body = raw.length === 3 ? raw.replace(/(.)/g, '$1$1') : raw;
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

/** Format an {@link Rgb} as a lowercase `#rrggbb` string, clamping/rounding channels. */
export function formatHex(rgb: Rgb): string {
  const toHex = (value: number): string => clampChannel(value).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/** Convert an 8-bit channel to its linear-light value per the sRGB transfer function. */
const linearize = (channel8: number): number => {
  const c = clamp(channel8, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG 2.x relative luminance of an sRGB colour, in [0,1]. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

/** WCAG contrast ratio between two colours, in [1,21]. Symmetric in its arguments. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Produce a CSS `rgba(...)` string from a colour and an alpha (clamped to [0,1]). */
export function withAlpha(rgb: Rgb, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  return `rgba(${clampChannel(rgb.r)}, ${clampChannel(rgb.g)}, ${clampChannel(rgb.b)}, ${a})`;
}
