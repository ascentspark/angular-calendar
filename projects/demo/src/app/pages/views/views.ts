import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  CalAgendaView,
  CalMonthView,
  CalTimeGridView,
  CalTimelineView,
  CalYearView,
} from '@ascentsparksoftware/angular-calendar';
import { DocExample, ExampleSource } from '../../shared/doc-example';
import { PageNav, PageSection } from '../../shared/page-nav';
import {
  NOW,
  SAMPLE_EVENTS,
  SAMPLE_JOBS,
  SAMPLE_RESOURCES,
  STATUS_COLORS,
  TODAY,
  VIEW_DATE,
} from '../../shared/sample-data';

@Component({
  selector: 'cal-views',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DocExample,
    PageNav,
    CalMonthView,
    CalTimeGridView,
    CalTimelineView,
    CalAgendaView,
    CalYearView,
  ],
  templateUrl: './views.html',
})
export class ViewsPage {
  protected readonly viewDate = VIEW_DATE;
  protected readonly today = TODAY;
  protected readonly now = NOW;
  protected readonly events = SAMPLE_EVENTS;
  protected readonly resources = SAMPLE_RESOURCES;
  protected readonly jobs = SAMPLE_JOBS;
  protected readonly statusColors = STATUS_COLORS;

  /** Live "Switch Layout" toggle for the timeline example (horizontal ↔ vertical). */
  protected readonly tlOrientation = signal<'horizontal' | 'vertical'>('horizontal');
  protected toggleTimelineOrientation(): void {
    this.tlOrientation.update((o) => (o === 'vertical' ? 'horizontal' : 'vertical'));
  }

  protected readonly sections: PageSection[] = [
    { id: 'month', label: 'Month' },
    { id: 'week', label: 'Week & day' },
    { id: 'timeline', label: 'Timeline (scheduler)' },
    { id: 'week-rows', label: 'Week as rows' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'year', label: 'Year' },
  ];

  protected readonly monthSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-month-view
  [events]="events"
  [viewDate]="viewDate"
  [today]="today"
  [statusColors]="statusColors"
  [maxLanes]="3"
  (eventClicked)="onEvent($event.event)"
/>`,
    },
  ];

  protected readonly weekSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<!-- Week grid: 7 days, 6am-10pm window -->
<cal-time-grid
  [events]="events"
  [viewDate]="viewDate"
  [today]="today"
  [now]="now"
  [days]="7"
  [anchorToWeek]="true"
  [dayStartMinutes]="360"
  [dayEndMinutes]="1320"
  [statusColors]="statusColors"
  (eventChanged)="onChange($event)"
/>

<!-- Single day: [days]="1" -->
<cal-time-grid [events]="events" [viewDate]="viewDate" [days]="1" />`,
    },
  ];

  protected readonly timelineSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<!-- orientation="horizontal" (default): resources as rows, time on X.
     orientation="vertical": resources as columns, time down the Y axis.
     In vertical mode laneHeight is the sub-lane WIDTH (per overlapping card). -->
<cal-timeline-view
  [orientation]="orientation"
  [events]="jobs"
  [resources]="resources"
  [viewDate]="viewDate"
  [now]="now"
  [dayStartMinutes]="420"
  [dayEndMinutes]="1140"
  [headerGroupings]="['day', 'hour']"
  [laneHeight]="orientation === 'vertical' ? 150 : 34"
  [statusColors]="statusColors"
  (eventChanged)="onChange($event)"
/>`,
    },
    {
      label: 'resources.ts',
      lang: 'ts',
      code: `// Resources are a flat list or a tree (parentId + expanded).
resources: CalendarResource[] = [
  { id: 'east', name: 'East region', expanded: true },
  { id: 'alice', name: 'Alice Ng', parentId: 'east' },
  { id: 'bob', name: 'Bob Reyes', parentId: 'east' },
];
// Events carry resourceIds to place them on a lane.
jobs: CalendarEvent[] = [
  { id: 'j1', title: 'AC install', resourceIds: ['alice'],
    start: ..., end: ..., status: 'scheduled' },
];`,
    },
  ];

  protected readonly weekRowsSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<!-- Same time-grid, transposed: time flows left->right, days stack as rows.
     slotMinutes drives the gridline density (labels stay hourly). -->
<cal-time-grid
  orientation="horizontal"
  [events]="events"
  [viewDate]="viewDate"
  [days]="7"
  [anchorToWeek]="true"
  [dayStartMinutes]="480"
  [dayEndMinutes]="1080"
  [slotMinutes]="30"
  [statusColors]="statusColors"
/>`,
    },
  ];

  protected readonly agendaSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-agenda-view
  [events]="events"
  [viewDate]="viewDate"
  [today]="today"
  [days]="30"
  [hideEmptyDays]="true"
  [statusColors]="statusColors"
/>`,
    },
  ];

  protected readonly yearSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-year-view
  [events]="events"
  [viewDate]="viewDate"
  [today]="today"
  [statusColors]="statusColors"
  (monthSelected)="onMonth($event.date)"
/>`,
    },
  ];
}
