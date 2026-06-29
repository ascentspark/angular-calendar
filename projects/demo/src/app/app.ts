import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  DATE_ADAPTER,
  RECURRENCE_ADAPTER,
  addRecurrenceException,
  splitSeriesAt,
  type CalThemeMode,
  type CalendarEvent,
  type CalendarResource,
  type EventChange,
  type ZonedDateTime,
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
  protected readonly view = signal<'month' | 'week' | 'day' | 'timeline' | 'weekrows' | 'agenda' | 'year'>(
    'month',
  );
  protected readonly mode = signal<CalThemeMode>('light');
  protected readonly accent = signal('#3b82f6');

  /** True when the demo viewport is phone-narrow (drives month→agenda fallback). */
  protected readonly narrow = signal(false);

  /**
   * The view actually rendered. On a phone-narrow screen the dense month grid is
   * impractical, so it degrades to the agenda list — the SPEC's adaptive fallback.
   */
  protected readonly effectiveView = computed(() =>
    this.narrow() && this.view() === 'month' ? 'agenda' : this.view(),
  );

  /** Shown when the month view has been auto-swapped for the compact agenda. */
  protected readonly compactFallback = computed(
    () => this.narrow() && this.view() === 'month',
  );

  constructor() {
    const platformId = inject(PLATFORM_ID);
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    if (isPlatformBrowser(platformId) && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        this.narrow.set(width > 0 && width < 600);
      });
      ro.observe(host.nativeElement);
      effect((onCleanup) => onCleanup(() => ro.disconnect()));
    }
  }

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

  /** Resolve a job's primary assignee (its first resource) for the avatar card. */
  private assignee(job: CalendarEvent): CalendarResource | undefined {
    const id = job.resourceIds?.[0];
    return id === undefined ? undefined : this.resources.find((r) => r.id === id);
  }

  protected assigneeName(job: CalendarEvent): string {
    return this.assignee(job)?.name ?? '';
  }

  /** Initials (max 2) for the avatar bubble, e.g. "Alice Ng" → "AN". */
  protected assigneeInitials(job: CalendarEvent): string {
    const name = this.assigneeName(job);
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Stable avatar background per assignee id (deterministic hue, no deps). */
  protected assigneeColor(job: CalendarEvent): string {
    const id = this.assignee(job)?.id ?? '';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) % 360;
    }
    // Lightness 32% keeps white initials at ≥4.5:1 contrast for every hue.
    return `hsl(${hash} 55% 32%)`;
  }

  // ── Week-as-rows preset (charter §1 "Lust for Dust" signature layout) ───────
  // Built entirely on the public API: the resource timeline with one row per
  // weekday and events projected onto a shared single-day hour axis. A pure
  // consumer-side transform — nothing app-specific lives in the library core.
  private readonly adapter = inject(DATE_ADAPTER);

  protected readonly weekdayResources: CalendarResource[] = [
    { id: 'wd-0', name: 'Sunday' },
    { id: 'wd-1', name: 'Monday' },
    { id: 'wd-2', name: 'Tuesday' },
    { id: 'wd-3', name: 'Wednesday' },
    { id: 'wd-4', name: 'Thursday' },
    { id: 'wd-5', name: 'Friday' },
    { id: 'wd-6', name: 'Saturday' },
  ];

  /** Sunday 00:00 (in zone Z) of the viewed week — the shared canonical day. */
  protected readonly weekRowAnchor = computed(() =>
    this.adapter.startOfWeek(this.adapter.toZoned(this.viewDate, Z), 0),
  );

  /**
   * The week's timed events remapped so each lands in its weekday row at the
   * same wall-clock time on the canonical anchor day. Timezone-correct via the
   * date adapter (no hand-rolled offset math); all-day spans are omitted to keep
   * the hour axis clean.
   */
  protected readonly weekRowEvents = computed<CalendarEvent[]>(() => {
    const adapter = this.adapter;
    const anchor = this.weekRowAnchor();
    const weekEnd = adapter.addDays(anchor, 7);
    const out: CalendarEvent[] = [];
    for (const ev of this.filteredEvents()) {
      if (ev.allDay === true) {
        continue;
      }
      const start = adapter.toZoned(ev.start, Z);
      if (start.epochMs < anchor.epochMs || start.epochMs >= weekEnd.epochMs) {
        continue;
      }
      const dow = adapter.getDayOfWeek(start);
      const minutesIn = adapter.getMinutesIntoDay(start);
      const duration =
        ev.end === undefined
          ? 60
          : Math.max(15, adapter.differenceInMinutes(adapter.toZoned(ev.end, Z), start));
      const newStart = adapter.addMinutes(anchor, minutesIn);
      const newEnd = adapter.addMinutes(newStart, duration);
      const remapped: CalendarEvent = {
        ...ev,
        resourceIds: [`wd-${dow}`],
        start: newStart,
        end: newEnd,
      };
      // Drop recurrence metadata: this is already a concrete in-week occurrence,
      // and a weekly rule would otherwise re-expand against the canonical day.
      delete (remapped as { recurrenceRule?: unknown }).recurrenceRule;
      delete (remapped as { recurrenceExceptions?: unknown }).recurrenceExceptions;
      out.push(remapped);
    }
    return out;
  });

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

  protected setView(view: 'month' | 'week' | 'day' | 'timeline' | 'weekrows' | 'agenda' | 'year'): void {
    this.view.set(view);
  }

  private createSeq = 0;

  /** Apply a move/resize/create/inline-edit from the grid to the demo's event store. */
  private readonly recurrence = inject(RECURRENCE_ADAPTER);

  /** A pending edit to a recurring occurrence, awaiting a scope choice. */
  protected readonly pendingRecurringEdit = signal<{
    change: EventChange;
    seriesId: string;
    occStart: ZonedDateTime;
  } | null>(null);

  protected onEventChanged(change: EventChange): void {
    // Editing a recurring occurrence: ask which occurrences the change applies to
    // before mutating anything (this / this-and-following / all).
    if (change.event?.recurrenceId !== undefined) {
      this.pendingRecurringEdit.set({
        change,
        seriesId: change.event.recurrenceId,
        occStart: this.adapter.toZoned(change.event.start, Z),
      });
      return;
    }
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

  protected cancelRecurringEdit(): void {
    this.pendingRecurringEdit.set(null);
  }

  /** Apply the pending recurring edit at the chosen scope using the core helpers. */
  protected applyRecurringEdit(scope: 'this' | 'following' | 'all'): void {
    const pending = this.pendingRecurringEdit();
    if (pending === null) {
      return;
    }
    const { change, seriesId, occStart } = pending;
    const series = this.events().find((e) => e.id === seriesId);
    if (series === undefined) {
      this.pendingRecurringEdit.set(null);
      return;
    }

    // Project this edit's delta onto a target event (title for inline-edit,
    // times for a move/resize).
    const applyDelta = <T extends CalendarEvent>(ev: T): T => {
      if (change.kind === 'inline-edit') {
        return { ...ev, title: change.title ?? ev.title };
      }
      if (change.start !== undefined && change.end !== undefined) {
        return { ...ev, start: change.start, end: change.end };
      }
      return ev;
    };

    if (scope === 'all') {
      // Mutate the series itself → every occurrence reflects the change.
      this.events.update((list) => list.map((e) => (e.id === seriesId ? applyDelta(e) : e)));
    } else if (scope === 'this') {
      // Add an exception to the series and drop a detached concrete event.
      const withException = addRecurrenceException(series, occStart);
      const detached = applyDelta<CalendarEvent>({
        ...(change.event as CalendarEvent),
        id: `${seriesId}-this-${occStart.epochMs}`,
      });
      delete (detached as { recurrenceId?: unknown }).recurrenceId;
      delete (detached as { recurrenceRule?: unknown }).recurrenceRule;
      this.events.update((list) =>
        list.map((e) => (e.id === seriesId ? withException : e)).concat(detached),
      );
    } else {
      // This-and-following: terminate the series before this occurrence and start
      // a new series here with the change applied.
      const split = splitSeriesAt(series, occStart, {
        recurrence: this.recurrence,
        dates: this.adapter,
      });
      const tail = applyDelta<CalendarEvent>({
        ...series,
        id: `${seriesId}-tail-${occStart.epochMs}`,
        recurrenceRule: split.tailRule,
        start: split.tailStart,
      });
      this.events.update((list) =>
        list.map((e) => (e.id === seriesId ? split.head : e)).concat(tail),
      );
    }
    this.pendingRecurringEdit.set(null);
  }
}
