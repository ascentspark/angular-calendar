import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { RECURRENCE_ADAPTER } from '@ascentsparksoftware/angular-calendar';
import { RruleRecurrenceAdapter } from './rrule-adapter';

/** Provide the default RFC 5545 (`rrule`) {@link RruleRecurrenceAdapter}. */
export function provideRruleAdapter(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: RECURRENCE_ADAPTER, useClass: RruleRecurrenceAdapter },
  ]);
}
