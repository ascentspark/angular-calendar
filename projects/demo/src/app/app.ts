import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  eventsToCsv,
  eventsToIcs,
  eventsToExcelXml,
  CalPrintService,
} from '@ascentsparksoftware/angular-calendar/export';
import {
  CalMonthView,
  CalTimeGridView,
  CalTimelineView,
  CalAgendaView,
  CalYearView,
  CalEventTemplate,
  filterByStatus,
  type CalThemeMode,
  type CalendarEvent,
  type CalendarResource,
  type EventChange,
} from '@ascentsparksoftware/angular-calendar';

const Z = 'America/New_York';
const z = (iso: string) => ({ epochMs: Date.parse(iso), zone: Z });

@Component({
  selector: 'cal-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CalMonthView,
    CalTimeGridView,
    CalTimelineView,
    CalAgendaView,
    CalYearView,
    CalEventTemplate,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly view = signal<'month' | 'week' | 'day' | 'timeline' | 'agenda' | 'year'>(
    'month',
  );
  protected readonly mode = signal<CalThemeMode>('light');
  protected readonly accent = signal('#3b82f6');

  protected readonly viewDate = z('2026-06-15T16:00:00Z');
  protected readonly today = z('2026-06-15T16:00:00Z');
  protected readonly now = z('2026-06-15T18:20:00Z'); // 14:20 EDT → visible now-line

  protected readonly statusColors: Record<string, string> = {
    scheduled: '#3b82f6',
    active: '#16a34a',
    done: '#7c3aed',
    cancelled: '#dc2626',
  };

  protected readonly statusKeys = ['scheduled', 'active', 'done', 'cancelled'] as const;
  /** Active status filter (all on by default). */
  protected readonly activeStatuses = signal<ReadonlySet<string>>(new Set(this.statusKeys));

  private readonly printer = inject(CalPrintService);

  /** Trigger a browser download of a generated text blob. */
  private download(filename: string, mime: string, contents: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected exportCsv(): void {
    this.download('calendar.csv', 'text/csv;charset=utf-8', eventsToCsv(this.filteredEvents()));
  }

  protected exportIcs(): void {
    this.download(
      'calendar.ics',
      'text/calendar;charset=utf-8',
      eventsToIcs(this.filteredEvents(), { zone: Z }),
    );
  }

  protected exportExcel(): void {
    this.download(
      'calendar.xls',
      'application/vnd.ms-excel',
      eventsToExcelXml(this.filteredEvents()),
    );
  }

  protected printSchedule(): void {
    this.printer.print(this.filteredEvents(), {
      title: 'Schedule — angular-calendar',
      timeZone: Z,
      hour12: true,
    });
  }

  protected toggleStatus(status: string): void {
    this.activeStatuses.update((set) => {
      const next = new Set(set);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  protected isStatusOn(status: string): boolean {
    return this.activeStatuses().has(status);
  }

  /** Events/jobs passed through the status filter (untagged kept). */
  protected readonly filteredEvents = computed(() =>
    filterByStatus(this.events(), this.activeStatuses()),
  );
  protected readonly filteredJobs = computed(() =>
    filterByStatus(this.jobs(), this.activeStatuses()),
  );

  protected readonly events = signal<CalendarEvent[]>([
    {
      id: '1',
      title: 'Morning standup',
      start: z('2026-06-15T13:00:00Z'),
      end: z('2026-06-15T13:30:00Z'),
      status: 'scheduled',
    },
    {
      id: '2',
      title: 'Design review',
      start: z('2026-06-15T18:00:00Z'),
      end: z('2026-06-15T19:00:00Z'),
      status: 'done',
    },
    {
      id: '3',
      title: 'Sprint planning',
      start: z('2026-06-15T20:00:00Z'),
      end: z('2026-06-15T21:00:00Z'),
      status: 'active',
    },
    {
      id: '4',
      title: 'Retro',
      start: z('2026-06-15T21:30:00Z'),
      end: z('2026-06-15T22:00:00Z'),
      status: 'cancelled',
    },
    {
      id: '5',
      title: 'Conference (3 days)',
      start: z('2026-06-09T13:00:00Z'),
      end: z('2026-06-12T21:00:00Z'),
      status: 'active',
    },
    {
      id: '6',
      title: 'Release',
      start: z('2026-06-22T14:00:00Z'),
      end: z('2026-06-22T15:00:00Z'),
      status: 'scheduled',
    },
    {
      id: '7',
      title: 'Holiday',
      allDay: true,
      start: z('2026-06-19T04:00:00Z'),
      end: z('2026-06-20T04:00:00Z'),
      status: 'done',
    },
    {
      id: '8',
      title: 'Weekly 1:1',
      start: z('2026-06-17T17:00:00Z'),
      end: z('2026-06-17T17:30:00Z'),
      status: 'scheduled',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=WE',
    },
  ]);

  // ── Resource timeline (dispatch board) sample data ──────────────────────
  protected readonly resources: CalendarResource[] = [
    { id: 'east', name: 'East region', expanded: true },
    {
      id: 'alice',
      name: 'Alice Ng',
      parentId: 'east',
      workHours: [{ daysOfWeek: [1, 2, 3, 4, 5], startMinutes: 540, endMinutes: 1020 }],
    },
    {
      id: 'bob',
      name: 'Bob Reyes',
      parentId: 'east',
      workHours: [{ daysOfWeek: [1, 2, 3, 4, 5], startMinutes: 480, endMinutes: 960 }],
    },
    { id: 'west', name: 'West region', expanded: true },
    {
      id: 'carol',
      name: 'Carol Diaz',
      parentId: 'west',
      workHours: [{ daysOfWeek: [1, 2, 3, 4, 5], startMinutes: 600, endMinutes: 1080 }],
    },
  ];

  protected readonly jobs = signal<CalendarEvent[]>([
    {
      id: 'j1',
      title: 'AC install — 14 Oak St',
      resourceIds: ['alice'],
      start: z('2026-06-15T13:00:00Z'),
      end: z('2026-06-15T15:00:00Z'),
      status: 'scheduled',
    },
    {
      id: 'j2',
      title: 'Inspection — 9 Pine Ave',
      resourceIds: ['alice'],
      start: z('2026-06-15T16:00:00Z'),
      end: z('2026-06-15T17:00:00Z'),
      status: 'active',
    },
    {
      id: 'j3',
      title: 'Lunch',
      resourceIds: ['alice'],
      isBlock: true,
      start: z('2026-06-15T16:00:00Z'),
      end: z('2026-06-15T16:30:00Z'),
    },
    {
      id: 'j4',
      title: 'Boiler repair — 5 Elm',
      resourceIds: ['bob'],
      start: z('2026-06-15T14:30:00Z'),
      end: z('2026-06-15T16:30:00Z'),
      status: 'scheduled',
    },
    {
      id: 'j5',
      title: 'Follow-up — 22 Birch',
      resourceIds: ['bob'],
      start: z('2026-06-15T18:00:00Z'),
      end: z('2026-06-15T19:00:00Z'),
      status: 'done',
    },
    {
      id: 'j6',
      title: 'Survey — 100 Cedar',
      resourceIds: ['carol'],
      start: z('2026-06-15T15:00:00Z'),
      end: z('2026-06-15T17:30:00Z'),
      status: 'active',
    },
    {
      id: 'j7',
      title: 'Cancelled — 3 Maple',
      resourceIds: ['carol'],
      start: z('2026-06-15T19:00:00Z'),
      end: z('2026-06-15T20:00:00Z'),
      status: 'cancelled',
    },
  ]);

  /** Unassigned jobs the dispatcher can drag onto a tech's lane. */
  protected readonly unscheduled = signal<{ id: string; title: string }[]>([
    { id: 'u1', title: 'Emergency leak — 7 Birch' },
    { id: 'u2', title: 'Quote visit — 19 Ash' },
  ]);

  protected onDragStart(jobId: string, dom: DragEvent): void {
    dom.dataTransfer?.setData('text/plain', jobId);
    if (dom.dataTransfer) {
      dom.dataTransfer.effectAllowed = 'copy';
    }
  }

  /** Assign a dropped unassigned job to the target lane at the drop time. */
  protected onExternalDrop(e: { date: { epochMs: number; zone: string }; resourceId: string; data: string }): void {
    const job = this.unscheduled().find((u) => u.id === e.data);
    if (job === undefined) {
      return;
    }
    this.unscheduled.update((list) => list.filter((u) => u.id !== job.id));
    this.jobs.update((list) => [
      ...list,
      {
        id: job.id,
        title: job.title,
        resourceIds: [e.resourceId],
        start: e.date,
        end: { epochMs: e.date.epochMs + 60 * 60_000, zone: e.date.zone },
        status: 'scheduled',
      },
    ]);
  }

  protected toggleMode(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  protected setView(view: 'month' | 'week' | 'day' | 'timeline' | 'agenda' | 'year'): void {
    this.view.set(view);
  }

  private createSeq = 0;

  /** Apply a move/resize/create/inline-edit from the grid to the demo's event store. */
  protected onEventChanged(change: EventChange): void {
    // Inline edit only carries a title (no start/end).
    if (change.kind === 'inline-edit' && change.event !== null) {
      const id = change.event.id;
      const title = change.title ?? '';
      this.events.update((list) => list.map((e) => (e.id === id ? { ...e, title } : e)));
      return;
    }
    if (change.start === undefined || change.end === undefined) {
      return;
    }
    const start = change.start;
    const end = change.end;
    if (change.kind === 'create') {
      this.createSeq += 1;
      this.events.update((list) => [
        ...list,
        { id: `new-${this.createSeq}`, title: 'New event', start, end, status: 'scheduled' },
      ]);
      return;
    }
    if (change.event === null) {
      return;
    }
    const id = change.event.id;
    this.events.update((list) => list.map((e) => (e.id === id ? { ...e, start, end } : e)));
  }
}
