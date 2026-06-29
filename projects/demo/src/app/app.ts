import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  CalMonthView,
  CalYearView,
  type CalThemeMode,
  type CalendarEvent,
} from '@ascentsparksoftware/angular-calendar';

const Z = 'America/New_York';
const z = (iso: string) => ({ epochMs: Date.parse(iso), zone: Z });

@Component({
  selector: 'cal-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalMonthView, CalYearView],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly view = signal<'month' | 'year'>('month');
  protected readonly mode = signal<CalThemeMode>('light');
  protected readonly accent = signal('#3b82f6');

  protected readonly viewDate = z('2026-06-15T16:00:00Z');
  protected readonly today = z('2026-06-15T16:00:00Z');

  protected readonly statusColors: Record<string, string> = {
    scheduled: '#3b82f6',
    active: '#16a34a',
    done: '#7c3aed',
    cancelled: '#dc2626',
  };

  protected readonly events: CalendarEvent[] = [
    { id: '1', title: 'Morning standup', start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T13:30:00Z'), status: 'scheduled' },
    { id: '2', title: 'Design review', start: z('2026-06-15T18:00:00Z'), end: z('2026-06-15T19:00:00Z'), status: 'done' },
    { id: '3', title: 'Sprint planning', start: z('2026-06-15T20:00:00Z'), end: z('2026-06-15T21:00:00Z'), status: 'active' },
    { id: '4', title: 'Retro', start: z('2026-06-15T21:30:00Z'), end: z('2026-06-15T22:00:00Z'), status: 'cancelled' },
    { id: '5', title: 'Conference (3 days)', start: z('2026-06-09T13:00:00Z'), end: z('2026-06-12T21:00:00Z'), status: 'active' },
    { id: '6', title: 'Release', start: z('2026-06-22T14:00:00Z'), end: z('2026-06-22T15:00:00Z'), status: 'scheduled' },
    { id: '7', title: 'Holiday', start: z('2026-06-19T04:00:00Z'), end: z('2026-06-20T04:00:00Z'), status: 'done' },
  ];

  protected toggleMode(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  protected setView(view: 'month' | 'year'): void {
    this.view.set(view);
  }
}
