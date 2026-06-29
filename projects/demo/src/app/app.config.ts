import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import {
  provideCalendar,
  withDateAdapter,
  withDefaults,
  withTokenBridge,
} from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideClientHydration(),
    provideCalendar(
      withDateAdapter(provideDateFnsAdapter()),
      withDefaults({ timezone: 'America/New_York', weekStartsOn: 0 }),
      // Drive the calendar accent from the host app's own design token (--brand),
      // demonstrating the token bridge: the calendar follows the design system
      // rather than a hard-coded accentColor input.
      withTokenBridge({ '--cal-accent': '--brand' }),
    ),
    provideRruleAdapter(),
  ],
};
