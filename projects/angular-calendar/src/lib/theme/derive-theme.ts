/**
 * Derive the full `--cal-*` token set from the theming inputs.
 *
 * Strategy: surfaces, ink, and lines are generated as a perceptually-even
 * lightness scale tinted toward the BASE hue (so the calendar blends with the
 * host's neutral palette); interactive tokens are generated from the ACCENT.
 * Text tokens are then run through {@link ensureContrastAA} against their actual
 * background so WCAG AA (AAA for primary ink) is GUARANTEED for any input pair,
 * in both light and dark — the inputs alone always yield a legible result.
 *
 * Per-status/event colours (an optional map) run through the same pipeline so
 * every category gets a guaranteed-AA on-colour, in both modes.
 */

import { contrastRatio, formatHex, parseHex, withAlpha, type Rgb } from './color';
import { ensureContrastAA, mixOklab, oklchColor, srgbToOklch, withLightness } from './oklch';
import { STATIC_TOKENS, sanitizeStatusKey, type CalThemeTokens } from './tokens';

/** Light or dark derivation. */
export type CalThemeMode = 'light' | 'dark';

interface ModeConfig {
  /** Lightness (OKLCH) for the surface scale. */
  readonly surface: { bg: number; surface: number; surface2: number; sunk: number };
  /** Target lightness for the ink scale BEFORE AA enforcement. */
  readonly ink: { ink: number; ink700: number; muted: number; faint: number };
  /** Lightness for hairlines. */
  readonly line: { line: number; strong: number };
  /** Cap on the chroma of tinted neutrals (keeps surfaces subtle). */
  readonly neutralChroma: number;
  /** Mix toward the surface when building the soft-accent / soft-event background. */
  readonly accentSoftMix: number;
  /** Lightness delta applied to the accent for its hover state. */
  readonly accentHoverDelta: number;
  /** Alpha for the focus ring. */
  readonly ringAlpha: number;
  /** Mix toward the surface for the subtle "today" cell wash. */
  readonly todayMix: number;
  /** Alpha for the translucent selection overlay. */
  readonly selectionAlpha: number;
  /** Modal scrim. */
  readonly scrim: string;
  /** Semantic status colours (brand-independent). */
  readonly semantic: { success: string; warning: string; error: string };
}

const LIGHT: ModeConfig = {
  surface: { bg: 0.972, surface: 1.0, surface2: 0.986, sunk: 0.935 },
  ink: { ink: 0.22, ink700: 0.4, muted: 0.55, faint: 0.7 },
  line: { line: 0.9, strong: 0.82 },
  neutralChroma: 0.02,
  accentSoftMix: 0.86,
  accentHoverDelta: -0.06,
  ringAlpha: 0.35,
  todayMix: 0.9,
  selectionAlpha: 0.18,
  scrim: 'rgba(15, 23, 42, 0.4)',
  semantic: { success: '#117a52', warning: '#9a6700', error: '#c01c28' },
};

const DARK: ModeConfig = {
  surface: { bg: 0.15, surface: 0.205, surface2: 0.25, sunk: 0.29 },
  ink: { ink: 0.97, ink700: 0.82, muted: 0.66, faint: 0.48 },
  line: { line: 0.33, strong: 0.42 },
  neutralChroma: 0.025,
  accentSoftMix: 0.8,
  accentHoverDelta: 0.07,
  ringAlpha: 0.42,
  todayMix: 0.82,
  selectionAlpha: 0.28,
  scrim: 'rgba(0, 0, 0, 0.55)',
  semantic: { success: '#4ade80', warning: '#fbbf24', error: '#f87171' },
};

const AA = 4.5;
const AAA = 7;
/** Minimum graphical contrast for the now-indicator line against its background. */
const GRAPHIC = 3;

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** The black/white extreme that already contrasts best with `bg` (a good AA seed). */
const betterExtreme = (bg: Rgb): Rgb =>
  contrastRatio(WHITE, bg) >= contrastRatio(BLACK, bg) ? WHITE : BLACK;

/**
 * Build the complete theme token map.
 *
 * @param baseColor neutral anchor (hex) — surfaces/ink/lines tint toward its hue.
 * @param accentColor interactive accent (hex) — kept exactly as the brand colour.
 * @param mode `'light'` or `'dark'`.
 * @param eventColors optional status/category → hex map; each yields a guaranteed-AA
 *   `--cal-event-<key>` / `-ink` / `-soft` / `-soft-ink` quartet (invalid entries skipped).
 * @throws {Error} if `baseColor` or `accentColor` is not valid hex.
 */
export function deriveTheme(
  baseColor: string,
  accentColor: string,
  mode: CalThemeMode,
  eventColors?: Record<string, string>,
): CalThemeTokens {
  const base = parseHex(baseColor);
  const accent = parseHex(accentColor);
  const cfg = mode === 'dark' ? DARK : LIGHT;

  const baseOklch = srgbToOklch(base);
  const baseHue = baseOklch.h;
  const neutralChroma = Math.min(baseOklch.c, cfg.neutralChroma);

  /** A neutral, tinted toward the base hue, at the given OKLCH lightness. */
  const tint = (l: number): Rgb => oklchColor(l, neutralChroma, baseHue);

  const surface = tint(cfg.surface.surface);
  const bg = tint(cfg.surface.bg);
  const surface2 = tint(cfg.surface.surface2);
  const sunk = tint(cfg.surface.sunk);

  const ink = ensureContrastAA(tint(cfg.ink.ink), surface, AAA);
  const ink700 = ensureContrastAA(tint(cfg.ink.ink700), surface, AA);
  const inkMuted = ensureContrastAA(tint(cfg.ink.muted), surface, AA);
  const inkFaint = tint(cfg.ink.faint);

  const line = tint(cfg.line.line);
  const lineStrong = tint(cfg.line.strong);

  const accentL = srgbToOklch(accent).l;
  const accentInk = ensureContrastAA(betterExtreme(accent), accent, AA);
  const accentHover = withLightness(accent, accentL + cfg.accentHoverDelta);
  const accentSoft = mixOklab(accent, surface, cfg.accentSoftMix);
  const accentSoftInk = ensureContrastAA(accent, accentSoft, AA);

  // Calendar-specific derived tokens.
  const nowLine = ensureContrastAA(accent, bg, GRAPHIC);
  const todayBg = mixOklab(accent, bg, cfg.todayMix);

  const tokens: Record<string, string> = {
    '--cal-bg': formatHex(bg),
    '--cal-surface': formatHex(surface),
    '--cal-surface-2': formatHex(surface2),
    '--cal-surface-sunk': formatHex(sunk),
    '--cal-ink': formatHex(ink),
    '--cal-ink-700': formatHex(ink700),
    '--cal-ink-muted': formatHex(inkMuted),
    '--cal-ink-faint': formatHex(inkFaint),
    '--cal-line': formatHex(line),
    '--cal-line-strong': formatHex(lineStrong),
    '--cal-accent': formatHex(accent),
    '--cal-accent-ink': formatHex(accentInk),
    '--cal-accent-hover': formatHex(accentHover),
    '--cal-accent-soft': formatHex(accentSoft),
    '--cal-accent-soft-ink': formatHex(accentSoftInk),
    '--cal-ring': withAlpha(accent, cfg.ringAlpha),
    '--cal-scrim': cfg.scrim,
    '--cal-success': cfg.semantic.success,
    '--cal-warning': cfg.semantic.warning,
    '--cal-error': cfg.semantic.error,
    '--cal-now-line': formatHex(nowLine),
    '--cal-today-bg': formatHex(todayBg),
    '--cal-selection': withAlpha(accent, cfg.selectionAlpha),
    '--cal-grid-line': formatHex(line),
    '--cal-allday-bg': formatHex(surface2),
    ...STATIC_TOKENS,
  };

  if (eventColors) {
    for (const [rawKey, hex] of Object.entries(eventColors)) {
      const key = sanitizeStatusKey(rawKey);
      if (key === '') {
        continue;
      }
      let fill: Rgb;
      try {
        fill = parseHex(hex);
      } catch {
        // A single bad event colour must never break the whole theme.
        console.warn(`[angular-calendar] invalid event colour for "${rawKey}": ${hex}`);
        continue;
      }
      const soft = mixOklab(fill, surface, cfg.accentSoftMix);
      tokens[`--cal-event-${key}`] = formatHex(fill);
      tokens[`--cal-event-${key}-ink`] = formatHex(ensureContrastAA(betterExtreme(fill), fill, AA));
      tokens[`--cal-event-${key}-soft`] = formatHex(soft);
      tokens[`--cal-event-${key}-soft-ink`] = formatHex(ensureContrastAA(fill, soft, AA));
    }
  }

  return tokens as CalThemeTokens;
}
