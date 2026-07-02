import { Routes } from '@angular/router';

/**
 * Every route is lazy + carries a `title` and `data.description` that the SeoService
 * mirrors into <title>/description/OG/canonical and a WebPage JSON-LD node. All routes
 * are prerendered to static HTML (see app.routes.server.ts) for SEO/LLM visibility.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/playground/playground').then((m) => m.Playground),
    title: 'Angular Calendar & Scheduler — themeable, signals-first (free, open-source)',
    data: {
      description:
        'Interactive playground for @ascentsparksoftware/angular-calendar: a themeable, ' +
        'signals-first Angular 22 calendar and resource scheduler. Month, week, day, timeline, ' +
        'agenda and year views; timezone-correct; RRULE recurrence; drag/resize; OKLCH theming.',
    },
  },
  {
    path: 'getting-started',
    loadComponent: () =>
      import('./pages/getting-started/getting-started').then((m) => m.GettingStartedPage),
    title: 'Getting started — Angular Calendar',
    data: {
      description:
        'Install @ascentsparksoftware/angular-calendar (Angular 20/21/22), wire the date adapter, ' +
        'and render your first month view in minutes.',
    },
  },
  {
    path: 'views',
    loadComponent: () => import('./pages/views/views').then((m) => m.ViewsPage),
    title: 'Views — month, week, day, timeline, agenda, year — Angular Calendar',
    data: {
      description:
        'Every view in @ascentsparksoftware/angular-calendar: month grid, week/day time-grid, ' +
        'resource timeline scheduler, week-as-rows, agenda list and year overview.',
    },
  },
  {
    path: 'theming',
    loadComponent: () => import('./pages/theming/theming').then((m) => m.ThemingPage),
    title: 'Theming — baseColor, accentColor, --cal-* tokens — Angular Calendar',
    data: {
      description:
        'Theme @ascentsparksoftware/angular-calendar with two colors: baseColor, accentColor, ' +
        'themeMode, per-status event colors, and any --cal-* custom property. OKLCH, AA-safe.',
    },
  },
  {
    path: 'interactions',
    loadComponent: () =>
      import('./pages/interactions/interactions').then((m) => m.InteractionsPage),
    title: 'Interactions — drag, resize, create, keyboard — Angular Calendar',
    data: {
      description:
        'Pointer drag/move/resize/create, full keyboard operability, external drag-in, inline ' +
        'edit, snapping and change validation in @ascentsparksoftware/angular-calendar.',
    },
  },
  {
    path: 'recurrence',
    loadComponent: () => import('./pages/recurrence/recurrence').then((m) => m.RecurrencePage),
    title: 'Recurrence — RRULE editor and edit semantics — Angular Calendar',
    data: {
      description:
        'RFC 5545 RRULE recurrence in @ascentsparksoftware/angular-calendar: the recurrence ' +
        'editor, exceptions, and this / this-and-following / all edit semantics.',
    },
  },
  {
    path: 'reference',
    loadComponent: () => import('./pages/reference/reference').then((m) => m.ReferencePage),
    title: 'Integration & API reference — Angular Calendar',
    data: {
      description:
        'API reference for @ascentsparksoftware/angular-calendar: component inputs/outputs, the ' +
        'headless view-model engine, the timezone-correct date adapter, accessibility and security.',
    },
  },
];
