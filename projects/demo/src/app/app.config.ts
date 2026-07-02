import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import {
  provideCalendar,
  withDateAdapter,
  withDefaults,
} from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideClientHydration(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideCalendar(
      withDateAdapter(provideDateFnsAdapter()),
      withDefaults({ timezone: 'America/New_York', weekStartsOn: 0 }),
    ),
    provideRruleAdapter(),
  ],
};
