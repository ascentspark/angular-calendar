import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  CalendarEvent,
  CalMonthView,
  CalRecurrenceEditor,
} from '@ascentsparksoftware/angular-calendar';
import { DocExample, ExampleSource } from '../../shared/doc-example';
import { PageNav, PageSection } from '../../shared/page-nav';
import { STATUS_COLORS, TODAY, VIEW_DATE } from '../../shared/sample-data';

@Component({
  selector: 'cal-recurrence',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocExample, PageNav, CalRecurrenceEditor, CalMonthView],
  templateUrl: './recurrence.html',
})
export class RecurrencePage {
  protected readonly viewDate = VIEW_DATE;
  protected readonly today = TODAY;
  protected readonly statusColors = STATUS_COLORS;

  /** Two-way bound to the recurrence editor; drives the live month expansion below. */
  protected readonly rule = signal<string>('FREQ=WEEKLY;BYDAY=MO,WE,FR');

  /**
   * A single master event carrying the current RRULE. The month view expands it
   * automatically across the visible range, so editing the rule re-expands live.
   */
  protected readonly recurringEvents = computed<CalendarEvent[]>(() => [
    {
      id: 'r1',
      title: 'Standup',
      start: { epochMs: Date.parse('2026-06-01T13:00:00Z'), zone: 'America/New_York' },
      end: { epochMs: Date.parse('2026-06-01T13:30:00Z'), zone: 'America/New_York' },
      status: 'scheduled',
      recurrenceRule: this.rule(),
    },
  ]);

  protected readonly sections: PageSection[] = [
    { id: 'editor', label: 'Recurrence editor' },
    { id: 'expand', label: 'Automatic expansion' },
    { id: 'edit-scope', label: 'This / following / all' },
    { id: 'ics', label: 'ICS export' },
  ];

  protected readonly editorSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<!-- Two-way bound to a signal holding the RRULE string. -->
<cal-recurrence-editor [(rule)]="rule" />

<p>Current rule: <code>{{ rule() }}</code></p>`,
    },
    {
      label: 'component.ts',
      lang: 'ts',
      code: `import { signal } from '@angular/core';

// The editor's \`rule\` model reads and writes this signal directly.
rule = signal<string>('FREQ=WEEKLY;BYDAY=MO,WE,FR');`,
    },
  ];

  protected readonly expandSrc: ExampleSource[] = [
    {
      label: 'component.ts',
      lang: 'ts',
      code: `import { computed, signal } from '@angular/core';
import { CalendarEvent } from '@ascentsparksoftware/angular-calendar';

rule = signal<string>('FREQ=WEEKLY;BYDAY=MO,WE,FR');

// One master event carries \`recurrenceRule\`. The view expands it across the
// visible range — no manual occurrence generation. Editing \`rule\` re-expands.
recurringEvents = computed<CalendarEvent[]>(() => [
  {
    id: 'r1',
    title: 'Standup',
    start: { epochMs: Date.parse('2026-06-01T13:00:00Z'), zone: 'America/New_York' },
    end: { epochMs: Date.parse('2026-06-01T13:30:00Z'), zone: 'America/New_York' },
    status: 'scheduled',
    recurrenceRule: rule(),
  },
]);`,
    },
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-month-view
  [events]="recurringEvents()"
  [viewDate]="viewDate"
  [today]="today"
  [statusColors]="statusColors"
  [maxLanes]="3"
/>`,
    },
  ];

  protected readonly editScopeSrc: ExampleSource[] = [
    {
      label: 'edit-scope.ts',
      lang: 'ts',
      code: `import {
  addRecurrenceException,
  splitSeriesAt,
  type CalendarEvent,
  type ZonedDateTime,
} from '@ascentsparksoftware/angular-calendar';

// THIS occurrence: drop the occurrence from the series and create a standalone
// override that points back at the master via \`recurrenceId\`.
function editThis(series: CalendarEvent, occurrence: ZonedDateTime): CalendarEvent[] {
  const master = addRecurrenceException(series, occurrence);
  const override: CalendarEvent = {
    id: crypto.randomUUID(),
    title: series.title,
    start: occurrence,
    recurrenceId: series.id, // marks it as a detached instance of the series
  };
  return [master, override];
}

// THIS AND FOLLOWING: terminate the master at the occurrence (RRULE UNTIL) and
// start a fresh series from it. \`ctx\` supplies the recurrence + date adapters.
function editFollowing(series: CalendarEvent, occurrence: ZonedDateTime, ctx: SplitCtx) {
  const { head, tailRule, tailStart } = splitSeriesAt(series, occurrence, ctx);
  const tail: CalendarEvent = {
    id: crypto.randomUUID(),
    title: series.title,
    start: tailStart,
    recurrenceRule: tailRule,
  };
  return [head, tail]; // head keeps the past, tail carries the change forward
}

// ALL: just edit the master's recurrenceRule; every occurrence follows.
function editAll(series: CalendarEvent, nextRule: string): CalendarEvent {
  return { ...series, recurrenceRule: nextRule };
}`,
    },
  ];

  protected readonly icsSrc: ExampleSource[] = [
    {
      label: 'export.ts',
      lang: 'ts',
      code: `import { eventsToIcs } from '@ascentsparksoftware/angular-calendar/export';
import type { CalendarEvent } from '@ascentsparksoftware/angular-calendar';

const events: CalendarEvent[] = [
  {
    id: 'r1',
    title: 'Standup',
    start: { epochMs: Date.parse('2026-06-01T13:00:00Z'), zone: 'America/New_York' },
    end: { epochMs: Date.parse('2026-06-01T13:30:00Z'), zone: 'America/New_York' },
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  },
];

// The RRULE is preserved on the VEVENT — calendars re-expand it on import.
const ics = eventsToIcs(events);
// BEGIN:VEVENT ... RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR ... END:VEVENT`,
    },
  ];
}
