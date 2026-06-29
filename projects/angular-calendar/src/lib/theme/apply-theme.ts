import type { CalThemeTokens } from './tokens';

/**
 * A token bridge maps calendar custom properties to the host application's own
 * design-system variables. Keys are `--cal-*` property names; values are the
 * consumer's CSS variable to defer to — either bare (`--brand-500`) or already
 * wrapped (`var(--brand-500)`). Bridged tokens win over the derived theme, so a
 * host can drive calendar colours entirely from its own token system.
 */
export type CalTokenBridge = Partial<Record<`--cal-${string}`, string>>;

/** Wrap a bare custom-property reference in `var(...)`; pass through existing `var()`. */
function asVarRef(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith('var(')) {
    return trimmed;
  }
  return `var(${trimmed})`;
}

/**
 * Apply a derived theme to an element as scoped CSS custom properties.
 *
 * Tokens are set on the element's inline `style`, so they cascade only to the
 * calendar's own subtree and never leak into (or clash with) the host page.
 * Hosts can still override any individual `--cal-*` variable with higher
 * specificity. Only the host's own custom-property *values* are written — never
 * markup — so this is Trusted-Types / strict-CSP clean.
 *
 * When a {@link CalTokenBridge} is supplied, its entries are written *after* the
 * derived tokens, so bridged properties defer to the host's own design-system
 * variables while every unbridged token keeps its derived value.
 */
export function applyTheme(
  element: HTMLElement,
  tokens: CalThemeTokens,
  bridge?: CalTokenBridge | null,
): void {
  for (const [name, value] of Object.entries(tokens)) {
    if (value !== undefined) {
      element.style.setProperty(name, value);
    }
  }
  if (bridge) {
    for (const [name, ref] of Object.entries(bridge)) {
      if (ref !== undefined && ref !== '') {
        element.style.setProperty(name, asVarRef(ref));
      }
    }
  }
}
