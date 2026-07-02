import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CalMonthView } from '@ascentsparksoftware/angular-calendar';
import { DocExample, ExampleSource } from '../../shared/doc-example';
import { PageNav, PageSection } from '../../shared/page-nav';
import { SAMPLE_EVENTS, STATUS_COLORS, TODAY, VIEW_DATE } from '../../shared/sample-data';
import { SeoService } from '../../shared/seo.service';

interface FaqEntry {
  q: string;
  a: string;
}

@Component({
  selector: 'cal-getting-started',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocExample, PageNav, CalMonthView],
  templateUrl: './getting-started.html',
})
export class GettingStartedPage {
  private readonly seo = inject(SeoService);

  protected readonly events = SAMPLE_EVENTS;
  protected readonly viewDate = VIEW_DATE;
  protected readonly today = TODAY;
  protected readonly statusColors = STATUS_COLORS;

  protected readonly sections: PageSection[] = [
    { id: 'install', label: 'Install' },
    { id: 'quick-start', label: 'Quick start' },
    { id: 'versions', label: 'Angular versions' },
    { id: 'faq', label: 'FAQ' },
  ];

  protected readonly installSrc: ExampleSource[] = [
    {
      label: 'terminal',
      lang: 'bash',
      code: `npm i @ascentsparksoftware/angular-calendar date-fns date-fns-tz rrule`,
    },
  ];

  protected readonly quickStartSrc: ExampleSource[] = [
    {
      label: 'app.config.ts',
      lang: 'ts',
      code: `import { ApplicationConfig } from '@angular/core';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';

export const appConfig: ApplicationConfig = {
  providers: [
    // Wire the date adapter once, at the application root.
    provideCalendar(withDateAdapter(provideDateFnsAdapter())),
  ],
};`,
    },
    {
      label: 'component.ts',
      lang: 'ts',
      code: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CalMonthView, CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

const zone = 'America/New_York';
const z = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

@Component({
  selector: 'app-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalMonthView],
  templateUrl: './schedule.html',
})
export class ScheduleComponent {
  protected readonly viewDate = signal<ZonedDateTime>(z('2026-06-15T12:00:00Z'));
  protected readonly today = signal<ZonedDateTime>(z('2026-06-15T12:00:00Z'));
  protected readonly events = signal<CalendarEvent[]>([
    { id: '1', title: 'Design review', start: z('2026-06-15T18:00:00Z'),
      end: z('2026-06-15T19:00:00Z'), status: 'scheduled' },
  ]);
}`,
    },
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-month-view
  [events]="events()"
  [viewDate]="viewDate()"
  [today]="today()"
/>`,
    },
  ];

  protected readonly versionsSrc: ExampleSource[] = [
    {
      label: 'terminal',
      lang: 'bash',
      code: `# Angular 22 (current) — installs 22.x
npm i @ascentsparksoftware/angular-calendar@latest

# Angular 21 — installs 21.x
npm i @ascentsparksoftware/angular-calendar@ng21

# Angular 20 — installs 20.x
npm i @ascentsparksoftware/angular-calendar@ng20`,
    },
  ];

  protected readonly faq: FaqEntry[] = [
    {
      q: 'Is it free and open-source?',
      a: 'Yes. MIT-licensed, no account or paid tier.',
    },
    {
      q: 'Does it need a backend?',
      a: 'No. It renders your event data entirely client-side; you own the data and apply edits from the eventChanged output.',
    },
    {
      q: 'Which Angular versions are supported?',
      a: 'Angular 20, 21 and 22 — one release line each (@ng20, @ng21, @latest); the package major matches the Angular major.',
    },
    {
      q: 'Is it zoneless and SSR-safe?',
      a: 'Yes. Standalone, signals-first, OnPush, no zone.js, and safe to server-render / prerender.',
    },
    {
      q: 'Does it handle timezones and DST?',
      a: 'Yes. Events carry an explicit IANA zone via a pluggable date adapter (date-fns + date-fns-tz by default); positioning is wall-clock correct across DST.',
    },
  ];

  constructor() {
    this.seo.setFaq(this.faq);
  }
}
