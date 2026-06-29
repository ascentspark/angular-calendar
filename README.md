# @ascentsparksoftware/angular-calendar

A modern, theme-agnostic, signal-first **calendar & scheduler** for Angular — zoneless,
standalone, SSR-safe, timezone-correct, with recurrence and a custom touch-first
interaction layer. It renders any caller's event data through caller-supplied templates and
drops transparently onto any color scheme via a few color inputs.

## Install

```bash
npm i @ascentsparksoftware/angular-calendar
```

> **Versioning:** the package **major tracks the Angular major** it targets — `22.x.x` for
> Angular 22, `21.x.x` for Angular 21, `20.x.x` for Angular 20. Install the line that
> matches your app (`@latest` for the newest, `@ng21` / `@ng20` for maintenance lines).

## Highlights

- **Views:** month, week, work-week, day, year, agenda, and a resource **timeline**
  (dispatch board) — with a configurable time-axis orientation.
- **Signals-first, standalone, zoneless, OnPush, SSR-safe.** No `NgModule`, no `zone.js`.
- **Theme-agnostic.** Every colour/size is a scoped `--cal-*` CSS custom property derived
  from a few inputs (`baseColor`, `accentColor`, `themeMode`, `statusColors`).
- **Timezone-correct** date model, **RFC 5545 recurrence**, drag/create/resize with full
  touch and keyboard support, and **WCAG 2.2 AA** accessibility.

## Documentation

See the project documentation and live demo (links to be published with the first release).

## License

MIT © Ascentspark
