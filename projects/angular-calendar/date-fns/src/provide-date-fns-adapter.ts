import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { DATE_ADAPTER } from '@ascentsparksoftware/angular-calendar';
import { DateFnsDateAdapter } from './date-fns-adapter';

/**
 * Provide the default `date-fns(+tz)` {@link DateFnsDateAdapter} for {@link
 * DATE_ADAPTER}. Add to your application providers (or pass to `provideCalendar`
 * via `withDateAdapter`) to use the built-in timezone-correct date engine.
 */
export function provideDateFnsAdapter(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DATE_ADAPTER, useClass: DateFnsDateAdapter }]);
}
