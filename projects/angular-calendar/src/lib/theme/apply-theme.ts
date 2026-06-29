import type { CalThemeTokens } from './tokens';

/**
 * Apply a derived theme to an element as scoped CSS custom properties.
 *
 * Tokens are set on the element's inline `style`, so they cascade only to the
 * calendar's own subtree and never leak into (or clash with) the host page.
 * Hosts can still override any individual `--cal-*` variable with higher
 * specificity. Only the host's own custom-property *values* are written — never
 * markup — so this is Trusted-Types / strict-CSP clean.
 */
export function applyTheme(element: HTMLElement, tokens: CalThemeTokens): void {
  for (const [name, value] of Object.entries(tokens)) {
    if (value !== undefined) {
      element.style.setProperty(name, value);
    }
  }
}
