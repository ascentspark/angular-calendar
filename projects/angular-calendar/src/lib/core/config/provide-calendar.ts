import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';
import {
  CALENDAR_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  type CalendarConfig,
} from './calendar-config';

/** Discriminates the optional building blocks passed to {@link provideCalendar}. */
export type CalendarFeatureKind =
  | 'defaults'
  | 'date-adapter'
  | 'recurrence'
  | 'locale'
  | 'virtualization'
  | 'print';

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
