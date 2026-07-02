import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalMonthView, CalThemeMode } from '@ascentsparksoftware/angular-calendar';
import { DocExample, ExampleSource } from '../../shared/doc-example';
import { PageNav, PageSection } from '../../shared/page-nav';
import { SAMPLE_EVENTS, STATUS_COLORS, TODAY, VIEW_DATE } from '../../shared/sample-data';

@Component({
  selector: 'cal-theming',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocExample, PageNav, CalMonthView],
  templateUrl: './theming.html',
})
export class ThemingPage {
  protected readonly viewDate = VIEW_DATE;
  protected readonly today = TODAY;
  protected readonly events = SAMPLE_EVENTS;
  protected readonly statusColors = STATUS_COLORS;

  /** Live-bound theme controls for the "two colours" demo. */
  protected readonly base = signal('#4f46e5');
  protected readonly accent = signal('#4f46e5');
  protected readonly mode = signal<CalThemeMode>('light');

  protected toggleMode(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  protected readonly sections: PageSection[] = [
    { id: 'two-colors', label: 'Two colours' },
    { id: 'status-colors', label: 'Status colours' },
    { id: 'tokens', label: 'CSS tokens' },
    { id: 'headless', label: 'Headless theming' },
  ];

  protected readonly twoColorsSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<!-- Two colours drive the whole palette; themeMode flips light/dark. -->
<cal-month-view
  [events]="events"
  [viewDate]="viewDate"
  [today]="today"
  [baseColor]="base()"
  [accentColor]="accent()"
  [themeMode]="mode()"
/>`,
    },
    {
      label: 'component.ts',
      lang: 'ts',
      code: `import { CalThemeMode } from '@ascentsparksoftware/angular-calendar';

base = signal('#4f46e5');          // neutral anchor (hex)
accent = signal('#4f46e5');        // interactive accent (hex)
mode = signal<CalThemeMode>('light');`,
    },
  ];

  protected readonly statusColorsSrc: ExampleSource[] = [
    {
      label: 'component.ts',
      lang: 'ts',
      code: `// Status key → hex. Each colour runs through the accent pipeline to emit a
// derived event / -ink / -soft triplet, contrast-safe in both modes.
statusColors: Record<string, string> = {
  scheduled: '#2563eb',
  active: '#16a34a',
  done: '#7c3aed',
  cancelled: '#dc2626',
};`,
    },
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-month-view
  [events]="events"
  [viewDate]="viewDate"
  [today]="today"
  [statusColors]="statusColors"
/>`,
    },
  ];

  protected readonly tokenOverrideSrc: ExampleSource[] = [
    {
      label: 'styles.css',
      lang: 'css',
      code: `/* Any single token is host-overridable for the long tail. */
angular-calendar,
cal-month-view {
  --cal-accent: #0d9488;
}`,
    },
  ];

  protected readonly headlessSrc: ExampleSource[] = [
    {
      label: 'component.ts',
      lang: 'ts',
      code: `import { deriveTheme, applyTheme } from '@ascentsparksoftware/angular-calendar';

// Pure, SSR-safe, OKLCH-based; guarantees AA contrast in both modes.
const tokens = deriveTheme('#0f172a', '#4f46e5', 'dark', { scheduled: '#2563eb' });
applyTheme(hostEl, tokens); // writes scoped --cal-* on hostEl`,
    },
  ];
}
