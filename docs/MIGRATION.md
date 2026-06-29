# Migration

## Installing the right line

The package major tracks the Angular major. Install the line matching your app:

```bash
npm i @ascentsparksoftware/angular-calendar          # latest (Angular 22)
npm i @ascentsparksoftware/angular-calendar@ng21     # Angular 21 line
npm i @ascentsparksoftware/angular-calendar@ng20     # Angular 20 line
```

Provide the date adapter (and optionally recurrence) once in your app config:

```ts
import { provideCalendar, withDateAdapter, withDefaults } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';

providers: [
  provideCalendar(
    withDateAdapter(provideDateFnsAdapter()),
    withDefaults({ weekStartsOn: 1 }),
  ),
  provideRruleAdapter(), // only if you use recurrence
]
```

## Coming from a hand-rolled calendar

- **Data stays yours.** The calendar never mutates events; interactions emit an `EventChange`
  for you to apply to your own store, then you feed new immutable data back in.
- **Instants carry a zone.** Pass a native `Date` (absolute) or a `ZonedDateTime`
  (`{ epochMs, zone }`). The adapter normalises to the display zone — no host-local surprises.
- **Theme via inputs, not CSS overrides.** Set `baseColor`/`accentColor`/`themeMode`/
  `statusColors`; reach for `--cal-*` overrides only for the long tail (see `THEMING.md`).

## Upgrading across Angular majors

Bump to the matching package major (e.g. `@ng21` → `@latest` when you move to Angular 22). The
public API is stable across majors; breaking changes are documented in `CHANGELOG.md`.
