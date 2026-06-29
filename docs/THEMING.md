# Theming

`@ascentsparksoftware/angular-calendar` is **theme-agnostic**: it ships no opinionated
colours. Every visual surface reads from a scoped set of `--cal-*` CSS custom properties that
are derived at runtime from a few inputs and written onto the component host element only — so
the calendar blends into any design system and never leaks styles into the host page.

## The quick path: a few inputs

Each view accepts four theming inputs:

```html
<cal-month-view
  [events]="events"
  [viewDate]="viewDate"
  baseColor="#ffffff"
  accentColor="#3b82f6"
  themeMode="light"
  [statusColors]="{ scheduled: '#3b82f6', active: '#16a34a', done: '#7c3aed', cancelled: '#dc2626' }"
/>
```

- **`baseColor`** — neutral anchor (hex). Surfaces, text (ink), and lines are tinted toward
  its hue so the calendar sits naturally on your background.
- **`accentColor`** — interactive/brand colour (hex). Drives selection, today, focus ring,
  the now-indicator, and the default event colour.
- **`themeMode`** — `'light'` or `'dark'`. The same inputs yield a legible result in either.
- **`statusColors`** — a `Record<string, string>` mapping each event `status` key to a colour.
  Events render in their status colour; every category gets a guaranteed-AA on-colour.

## Why it stays legible

Colours are derived in **OKLCH** (a perceptually-uniform space), and every text/background pair
is run through a contrast check (`ensureContrastAA`): primary ink targets AAA (7:1), secondary
ink and on-accent text target AA (4.5:1), and the now-line targets 3:1 graphical contrast — for
**any** input pair, in both light and dark. An invalid hex input warns and falls back to a safe
default rather than breaking your app.

## The token contract

`deriveTheme(base, accent, mode, statusColors?)` produces a `CalThemeTokens` map; `applyTheme`
writes it to the host's inline style. The fixed tokens are:

- Surfaces: `--cal-bg`, `--cal-surface`, `--cal-surface-2`, `--cal-surface-sunk`
- Ink: `--cal-ink`, `--cal-ink-700`, `--cal-ink-muted`, `--cal-ink-faint`
- Lines: `--cal-line`, `--cal-line-strong`, `--cal-grid-line`
- Accent family: `--cal-accent`, `--cal-accent-ink`, `--cal-accent-hover`, `--cal-accent-soft`,
  `--cal-accent-soft-ink`, `--cal-ring`, `--cal-scrim`
- Semantic: `--cal-success`, `--cal-warning`, `--cal-error`
- Calendar-specific: `--cal-now-line`, `--cal-today-bg`, `--cal-selection`, `--cal-allday-bg`
- Per status `<key>`: `--cal-event-<key>`, `--cal-event-<key>-ink`, `--cal-event-<key>-soft`,
  `--cal-event-<key>-soft-ink`
- Static: `--cal-radius-{sm,md,lg,pill}`, `--cal-slot-h`, `--cal-header-h`, `--cal-font-mono`

## Fine-grained overrides

Because the tokens are inline custom properties on the host, you can override any single one
with ordinary CSS specificity — no Sass build, no `::ng-deep`:

```css
cal-month-view {
  --cal-accent: #d6336c;
  --cal-radius-md: 4px;
  --cal-now-line: #e8590c;
}
```

## Bridging a design-token system

If your app already has design tokens, map them onto the four inputs (or onto individual
`--cal-*` vars) in a thin wrapper component. That wrapper lives in **your** app — the library
core depends on no token system, so any palette is first-class.

## Deriving themes yourself

`deriveTheme` and `applyTheme` are exported, so you can precompute or apply a theme outside a
component (e.g. to theme a custom popover that shares the calendar's look):

```ts
import { deriveTheme, applyTheme } from '@ascentsparksoftware/angular-calendar';

applyTheme(hostEl, deriveTheme('#0b0b0c', '#22c55e', 'dark', { urgent: '#dc2626' }));
```
