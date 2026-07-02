import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';
import {
  CALENDAR_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  type CalendarConfig,
} from './calendar-config';
import type { CalTokenBridge } from '../../theme/apply-theme';

/** Discriminates the optional building blocks passed to {@link provideCalendar}. */
export type CalendarFeatureKind = 'defaults' | 'date-adapter' | 'token-bridge';

/**
 * Optional bridge mapping `--cal-*` tokens to the host's own design-system CSS
 * variables. Injected by every view; when present each view defers the bridged
 * colours to the host instead of its derived theme. Registered via
 * {@link withTokenBridge}.
 */
export const CAL_TOKEN_BRIDGE = new InjectionToken<CalTokenBridge>('CAL_TOKEN_BRIDGE');

/**
 * An opt-in calendar feature. Produced by the `with*` helpers and passed to
 * {@link provideCalendar}. Carries Angular providers and/or config overrides.
 */
export interface CalendarFeature {
  readonly kind: CalendarFeatureKind;
  readonly providers: readonly (Provider | EnvironmentProviders)[];
  readonly config?: Partial<CalendarConfig>;
}

/**
 * Configure the calendar for an application (or route).
 *
 * Always seeds {@link CALENDAR_CONFIG} (built-in defaults merged with any
 * `withDefaults(...)`), then layers each feature's providers. Example:
 *
 * ```ts
 * provideCalendar(
 *   withDateAdapter(provideDateFnsAdapter()),
 *   withDefaults({ weekStartsOn: 1, slotMinutes: 15 }),
 * )
 * ```
 */
export function provideCalendar(...features: CalendarFeature[]): EnvironmentProviders {
  const config: CalendarConfig = features.reduce<CalendarConfig>(
    (acc, feature) => (feature.config ? { ...acc, ...feature.config } : acc),
    DEFAULT_CALENDAR_CONFIG,
  );

  const providers: (Provider | EnvironmentProviders)[] = [
    { provide: CALENDAR_CONFIG, useValue: config },
    ...features.flatMap((feature) => [...feature.providers]),
  ];

  return makeEnvironmentProviders(providers);
}

/** Override one or more {@link CalendarConfig} defaults. */
export function withDefaults(config: Partial<CalendarConfig>): CalendarFeature {
  return { kind: 'defaults', providers: [], config };
}

/**
 * Register the date adapter. Pass the adapter's environment providers, e.g.
 * `withDateAdapter(provideDateFnsAdapter())`.
 */
export function withDateAdapter(
  providers: EnvironmentProviders | Provider,
): CalendarFeature {
  return { kind: 'date-adapter', providers: [providers] };
}

/**
 * Drive calendar colours from the host application's own design tokens. Each key
 * is a `--cal-*` property; each value is the consumer's CSS variable to defer to
 * (bare `--brand-500` or wrapped `var(--brand-500)`). Example:
 *
 * ```ts
 * provideCalendar(
 *   withTokenBridge({
 *     '--cal-accent': '--brand-500',
 *     '--cal-bg': '--surface',
 *     '--cal-ink': '--text',
 *   }),
 * )
 * ```
 *
 * Bridged tokens win over the derived theme; unbridged tokens keep their derived
 * values, so a partial map is fine.
 */
export function withTokenBridge(bridge: CalTokenBridge): CalendarFeature {
  return {
    kind: 'token-bridge',
    providers: [{ provide: CAL_TOKEN_BRIDGE, useValue: bridge }],
  };
}
