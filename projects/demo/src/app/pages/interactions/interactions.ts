import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  CalTimeGridView,
  type CalendarEvent,
  type EventChange,
} from '@ascentsparksoftware/angular-calendar';
import { DocExample, ExampleSource } from '../../shared/doc-example';
import { PageNav, PageSection } from '../../shared/page-nav';
import { NOW, SAMPLE_EVENTS, STATUS_COLORS, TODAY, VIEW_DATE } from '../../shared/sample-data';

@Component({
  selector: 'cal-interactions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocExample, PageNav, CalTimeGridView],
  templateUrl: './interactions.html',
})
export class InteractionsPage {
  protected readonly viewDate = VIEW_DATE;
  protected readonly today = TODAY;
  protected readonly now = NOW;
  protected readonly statusColors = STATUS_COLORS;

  /**
   * Mutable, host-owned event list. The view is a pure renderer: on every
   * `eventChanged` we compute a NEW immutable array and feed it back into
   * `[events]`, and the grid re-renders from it. This is the authoritative-host
   * contract — the component never mutates its inputs in place.
   */
  protected readonly events = signal<CalendarEvent[]>([...SAMPLE_EVENTS]);

  protected readonly sections: PageSection[] = [
    { id: 'drag-resize-create', label: 'Drag, resize & create' },
    { id: 'keyboard', label: 'Keyboard' },
    { id: 'snap-validate', label: 'Snap & validate' },
    { id: 'external-drag-in', label: 'External drag-in' },
    { id: 'inline-edit', label: 'Inline edit' },
  ];

  /**
   * Apply a committed change to the host state. Move/resize update the matching
   * event's start/end by id; create appends a new event over the dragged range;
   * inline-edit updates the title. Each branch produces a fresh array so change
   * detection (and the grid) sees a new reference.
   */
  protected onChange(change: EventChange): void {
    if (change.kind === 'create') {
      if (!change.start || !change.end) {
        return;
      }
      const created: CalendarEvent = {
        id: `new-${Date.now()}`,
        title: change.title ?? 'New event',
        start: change.start,
        end: change.end,
        status: 'scheduled',
      };
      this.events.update((list) => [...list, created]);
      return;
    }

    const target = change.event;
    if (!target) {
      return;
    }

    this.events.update((list) =>
      list.map((e) => {
        if (e.id !== target.id) {
          return e;
        }
        if (change.kind === 'inline-edit') {
          // Only overwrite the title when the edit provides one (exactOptionalPropertyTypes).
          return change.title !== undefined ? { ...e, title: change.title } : e;
        }
        // move | resize
        const start = change.start ?? e.start;
        const end = change.end ?? e.end;
        return end !== undefined ? { ...e, start, end } : { ...e, start };
      }),
    );
  }

  protected readonly dragSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-time-grid
  [events]="events()"
  [viewDate]="viewDate"
  [today]="today"
  [now]="now"
  [days]="3"
  [dayStartMinutes]="480"
  [dayEndMinutes]="1080"
  [statusColors]="statusColors"
  (eventChanged)="onChange($event)"
/>`,
    },
    {
      label: 'component.ts',
      lang: 'ts',
      code: `// The host owns the events; the view renders whatever you feed it.
events = signal<CalendarEvent[]>([...SAMPLE_EVENTS]);

onChange(change: EventChange): void {
  if (change.kind === 'create') {
    if (!change.start || !change.end) return;
    this.events.update((list) => [
      ...list,
      { id: \`new-\${Date.now()}\`, title: change.title ?? 'New event',
        start: change.start!, end: change.end!, status: 'scheduled' },
    ]);
    return;
  }
  const target = change.event;
  if (!target) return;
  this.events.update((list) =>
    list.map((e) => {
      if (e.id !== target.id) return e;
      if (change.kind === 'inline-edit') return { ...e, title: change.title ?? e.title };
      // move | resize
      return { ...e, start: change.start ?? e.start, end: change.end ?? e.end };
    }),
  );
}`,
    },
  ];

  protected readonly snapSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<cal-time-grid
  [events]="events()"
  [viewDate]="viewDate"
  [days]="3"
  [snapMinutes]="15"
  [validateChange]="noWeekends"
  (eventChanged)="onChange($event)"
/>`,
    },
    {
      label: 'component.ts',
      lang: 'ts',
      code: `// A predicate run on every proposed change BEFORE it commits.
// Return false and the drag snaps back — the change never reaches onChange().
// Here: veto any move/resize that would land on a Saturday or Sunday.
noWeekends = (change: EventChange): boolean => {
  if (!change.start) return true;
  const day = new Date(change.start.epochMs).getUTCDay();
  return day !== 0 && day !== 6;
};`,
    },
  ];

  protected readonly externalSrc: ExampleSource[] = [
    {
      label: 'template.html',
      lang: 'html',
      code: `<!-- Drag an unassigned item from your own list onto a lane. -->
<cal-timeline-view
  [events]="jobs()"
  [resources]="resources"
  [viewDate]="viewDate"
  [statusColors]="statusColors"
  (externalDrop)="onDrop($event)"
/>`,
    },
    {
      label: 'component.ts',
      lang: 'ts',
      code: `// externalDrop resolves WHERE the drop landed: the time under the pointer,
// the lane's resourceId, and the payload you attached to the dragged element.
onDrop(drop: { date: ZonedDateTime; resourceId: string; payload?: unknown }): void {
  const job = drop.payload as UnassignedJob;
  this.jobs.update((list) => [
    ...list,
    { id: job.id, title: job.title, resourceIds: [drop.resourceId],
      start: drop.date, end: addMinutes(drop.date, job.durationMinutes),
      status: 'scheduled' },
  ]);
}`,
    },
  ];
}
