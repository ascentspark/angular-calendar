/**
 * The calendar's scoped CSS custom-property contract.
 *
 * Every visual style in the library references one of these `--cal-*` variables,
 * and {@link deriveTheme} produces a value for each from the theming inputs
 * (`baseColor` + `accentColor` + `themeMode`, plus an optional status/event
 * colour map). Hosts may override any individual variable in their own CSS for
 * fine control.
 */

/** Colour tokens derived at runtime from `baseColor` + `accentColor` + `themeMode`. */
export const COLOR_TOKEN_NAMES = [
  // surfaces (lightest → sunk)
  '--cal-bg',
  '--cal-surface',
  '--cal-surface-2',
  '--cal-surface-sunk',
  // text / ink
  '--cal-ink',
  '--cal-ink-700',
  '--cal-ink-muted',
  '--cal-ink-faint',
  // borders
  '--cal-line',
  '--cal-line-strong',
  // interactive accent family
  '--cal-accent',
  '--cal-accent-ink',
  '--cal-accent-hover',
  '--cal-accent-soft',
  '--cal-accent-soft-ink',
  '--cal-ring',
  '--cal-scrim',
  // semantic status (brand-independent)
  '--cal-success',
  '--cal-warning',
  '--cal-error',
  // calendar-specific surfaces / lines
  '--cal-now-line',
  '--cal-today-bg',
  '--cal-selection',
  '--cal-grid-line',
  '--cal-allday-bg',
] as const;

/** Non-colour tokens: fixed dimensional/typographic values, the same in every theme. */
export const STATIC_TOKEN_NAMES = [
  '--cal-radius-sm',
  '--cal-radius-md',
  '--cal-radius-lg',
  '--cal-radius-pill',
  '--cal-slot-h',
  '--cal-header-h',
  '--cal-font-mono',
] as const;

/** Every fixed token name the calendar sets on its host element. */
export const THEME_TOKEN_NAMES = [...COLOR_TOKEN_NAMES, ...STATIC_TOKEN_NAMES] as const;

export type ColorTokenName = (typeof COLOR_TOKEN_NAMES)[number];
export type StaticTokenName = (typeof STATIC_TOKEN_NAMES)[number];
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

/**
 * A fully-resolved theme: a map of `--cal-*` custom-property names to CSS value
 * strings. The fixed {@link THEME_TOKEN_NAMES} are always present; per-status /
 * per-event tokens (`--cal-event-<key>`, `-ink`, `-soft`, `-soft-ink`) are
 * present only when a colour map is supplied, so they are typed optional. This
 * keeps reads of the fixed tokens ergonomic (always `string`) while modelling
 * the event tokens honestly under `noUncheckedIndexedAccess`.
 */
export type CalThemeTokens = Record<ThemeTokenName, string> &
  Partial<Record<`--cal-event-${string}`, string>>;

/** Fixed values for the non-colour tokens. */
export const STATIC_TOKENS: Record<StaticTokenName, string> = {
  '--cal-radius-sm': '6px',
  '--cal-radius-md': '9px',
  '--cal-radius-lg': '14px',
  '--cal-radius-pill': '999px',
  '--cal-slot-h': '44px',
  '--cal-header-h': '40px',
  '--cal-font-mono':
    "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
};

/**
 * Sanitise a consumer-supplied status/event key into a safe CSS custom-property
 * name fragment. Only `[a-z0-9-]` survive (lower-cased); any other run collapses
 * to a single `-`. This guarantees a caller key can never inject characters into
 * a custom-property name (a security boundary — see SPEC §12).
 */
export function sanitizeStatusKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
