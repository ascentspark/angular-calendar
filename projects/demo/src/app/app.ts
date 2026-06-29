import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  CalMonthView,
  CalTimeGridView,
  CalTimelineView,
  CalAgendaView,
  CalYearView,
  type CalThemeMode,
  type CalendarEvent,
  type CalendarResource,
} from '@ascentsparksoftware/angular-calendar';

const Z = 'America/New_York';
const z = (iso: string) => ({ epochMs: Date.parse(iso), zone: Z });

@Component({
  selector: 'cal-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalMonthView, CalTimeGridView, CalTimelineView, CalAgendaView, CalYearView],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly view = signal<'month' | 'week' | 'day' | 'timeline' | 'agenda' | 'year'>('month');
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

  protected readonly events: CalendarEvent[] = [
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
  ];

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

  protected readonly jobs: CalendarEvent[] = [
    { id: 'j1', title: 'AC install — 14 Oak St', resourceIds: ['alice'], start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T15:00:00Z'), status: 'scheduled' },
    { id: 'j2', title: 'Inspection — 9 Pine Ave', resourceIds: ['alice'], start: z('2026-06-15T16:00:00Z'), end: z('2026-06-15T17:00:00Z'), status: 'active' },
    { id: 'j3', title: 'Lunch', resourceIds: ['alice'], isBlock: true, start: z('2026-06-15T16:00:00Z'), end: z('2026-06-15T16:30:00Z') },
    { id: 'j4', title: 'Boiler repair — 5 Elm', resourceIds: ['bob'], start: z('2026-06-15T14:30:00Z'), end: z('2026-06-15T16:30:00Z'), status: 'scheduled' },
    { id: 'j5', title: 'Follow-up — 22 Birch', resourceIds: ['bob'], start: z('2026-06-15T18:00:00Z'), end: z('2026-06-15T19:00:00Z'), status: 'done' },
    { id: 'j6', title: 'Survey — 100 Cedar', resourceIds: ['carol'], start: z('2026-06-15T15:00:00Z'), end: z('2026-06-15T17:30:00Z'), status: 'active' },
    { id: 'j7', title: 'Cancelled — 3 Maple', resourceIds: ['carol'], start: z('2026-06-15T19:00:00Z'), end: z('2026-06-15T20:00:00Z'), status: 'cancelled' },
  ];

  protected toggleMode(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  protected setView(view: 'month' | 'week' | 'day' | 'timeline' | 'agenda' | 'year'): void {
    this.view.set(view);
  }
}
