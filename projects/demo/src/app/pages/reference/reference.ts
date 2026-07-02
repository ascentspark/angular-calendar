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
  selector: 'cal-reference',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocExample, PageNav, CalMonthView],
  templateUrl: './reference.html',
})
export class ReferencePage {
  private readonly seo = inject(SeoService);

  protected readonly events = SAMPLE_EVENTS;
  protected readonly viewDate = VIEW_DATE;
  protected readonly today = TODAY;
  protected readonly statusColors = STATUS_COLORS;

  /**
   * Brace-containing payload / type strings. Held as data and rendered via
   * interpolation so Angular never parses their `{`/`}` as ICU message syntax.
   */
  protected readonly payloads = {
    eventClicked: '{ event }',
    eventChanged: 'EventChange',
    daySelected: '{ date }',
    monthSelected: '{ date }',
    slotSelected: '{ date, … }',
    viewPeriodChanged: '{ start, end, zone }',
    resourceToggled: '{ resource, … }',
    externalDrop: '{ date, resourceId, … }',
    resizable: '{ beforeStart?, afterEnd? }',
    zonedDateTime: '{ epochMs, zone }',
    emptyObject: '{}',
  };

  protected readonly sections: PageSection[] = [
    { id: 'inputs', label: 'Inputs' },
    { id: 'outputs', label: 'Outputs' },
    { id: 'events', label: 'Event model' },
    { id: 'engine', label: 'Headless engine' },
    { id: 'adapter', label: 'Date adapter' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'security', label: 'Security' },
    { id: 'faq', label: 'FAQ' },
  ];

  protected readonly eventSrc: ExampleSource[] = [
    {
      label: 'event.ts',
      lang: 'ts',
      code: `import { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

const zone = 'America/New_York';
const z = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

// The only required fields are id and start. Everything else is optional.
const job: CalendarEvent = {
  id: 'job-1842',
  title: 'AC install — 14 Elm St',
  start: z('2026-06-15T13:00:00Z'),
  end: z('2026-06-15T15:30:00Z'),
  status: 'scheduled',            // -> keyed into statusColors / --cal-event-<key>
  resourceIds: ['alice'],         // which timeline lane(s) it sits on
  resizable: { beforeStart: true, afterEnd: true },
  draggable: true,
  meta: { workOrderId: 1842 },    // opaque passenger data, echoed back to you
};`,
    },
  ];

  protected readonly engineSrc: ExampleSource[] = [
    {
      label: 'headless.ts',
      lang: 'ts',
      code: `import {
  buildMonthView,
  packColumns,
  expandRecurringEvents,
  filterByStatus,
  DateFnsDateAdapter,
} from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';

// The same pure functions the components call. No DOM, no Angular — testable in isolation.
const adapter = new DateFnsDateAdapter();

// buildMonthView returns a plain view-model (weeks, days, lane-packed chips):
const vm = buildMonthView(adapter, {
  viewDate: { epochMs: Date.parse('2026-06-15T12:00:00Z'), zone: 'America/New_York' },
  events: filterByStatus(myEvents, ['scheduled', 'en-route']),
  weekStartsOn: 1,
  maxLanes: 3,
});

vm.weeks.forEach((w) => w.days.forEach((d) => console.log(d.date, d.chips.length)));

// Layout + recurrence helpers are exported too, for building your own surfaces:
const columns = packColumns(intervals);       // overlap -> side-by-side columns
const occurrences = expandRecurringEvents(seriesEvents, ctx); // RRULE -> instances`,
    },
  ];

  protected readonly adapterSrc: ExampleSource[] = [
    {
      label: 'app.config.ts',
      lang: 'ts',
      code: `import { ApplicationConfig } from '@angular/core';
import { provideCalendar, withDateAdapter, withDefaults } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';

export const appConfig: ApplicationConfig = {
  providers: [
    provideCalendar(
      // Default adapter: date-fns + date-fns-tz. A Temporal adapter can drop in later.
      withDateAdapter(provideDateFnsAdapter()),
      // Optional app-wide defaults so every view inherits them.
      withDefaults({ timezone: 'America/New_York', weekStartsOn: 1, locale: 'en-US' }),
    ),
  ],
};`,
    },
    {
      label: 'instant.ts',
      lang: 'ts',
      code: `// Every instant is an explicit IANA zone, never host-local Date:
type ZonedDateTime = { epochMs: number; zone: string };

// The adapter does all wall-clock + DST-correct math behind the DATE_ADAPTER token.
// A 9am appointment stays 9am across a DST boundary regardless of the browser's zone.`,
    },
  ];

  protected readonly faq: FaqEntry[] = [
    {
      q: 'Is the layout engine usable without the components?',
      a: 'Yes. All date math, recurrence expansion and overlap layout are pure exported functions (buildMonthView, packColumns, expandRecurringEvents, …) with no DOM — use them headless.',
    },
    {
      q: 'How do I persist a drag or resize?',
      a: 'Handle (eventChanged): it emits an EventChange; update your own event array and feed the new immutable array back into [events]. The library never mutates your data.',
    },
    {
      q: 'Can I fully restyle it?',
      a: 'Yes. Every colour/size/radius is a scoped --cal-* CSS custom property on the host; override any of them, or drive the two-colour deriveTheme pipeline.',
    },
    {
      q: 'Is it safe against untrusted event content?',
      a: 'Yes. Caller content is never set via innerHTML; rendering is sanitized and Trusted-Types / strict-CSP clean, with no eval.',
    },
    {
      q: 'Does it work with server-side rendering?',
      a: 'Yes. Standalone, zoneless, OnPush and SSR-safe; this very docs site is statically prerendered.',
    },
  ];

  constructor() {
    this.seo.setFaq(this.faq);
  }
}
