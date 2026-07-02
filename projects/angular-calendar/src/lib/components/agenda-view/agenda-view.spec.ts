import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { CalAgendaView } from './agenda-view';

const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

async function render(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
  });
  const fixture = TestBed.createComponent(CalAgendaView);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

describe('CalAgendaView', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders a day heading and an event row with time + title', async () => {
    const events: CalendarEvent[] = [
      { id: 'a', title: 'Standup', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T13:30:00Z') },
    ];
    const { el } = await render({
      events,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      today: at('2026-06-15T12:00:00Z'),
      timezone: 'America/New_York',
    });
    expect(el.querySelector('.cal-agenda__date')?.textContent).toContain('June');
    const row = el.querySelector('.cal-agenda__row');
    expect(row?.textContent).toContain('Standup');
    expect(row?.textContent).toContain('9:00'); // 13:00Z = 9:00 AM EDT
  });

  it('shows "All day" for all-day events', async () => {
    const { el } = await render({
      events: [{ id: 'a', title: 'PTO', allDay: true, start: at('2026-06-15T04:00:00Z'), end: at('2026-06-16T04:00:00Z') }],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
    });
    expect(el.querySelector('.cal-agenda__time')?.textContent).toContain('All day');
  });

  it('emits eventClicked when a row is clicked', async () => {
    const { el, cmp } = await render({
      events: [{ id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z') }],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
    });
    let clicked: string | null = null;
    cmp.eventClicked.subscribe((e) => (clicked = e.event.id));
    el.querySelector<HTMLButtonElement>('.cal-agenda__row')?.click();
    expect(clicked).toBe('a');
  });

  it('hides empty days when hideEmptyDays is set', async () => {
    const { el } = await render({
      events: [{ id: 'a', title: 'X', start: at('2026-06-16T13:00:00Z') }],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 5,
      hideEmptyDays: true,
    });
    expect(el.querySelectorAll('.cal-agenda__day').length).toBe(1);
  });
});

describe('CalAgendaView — recurrence', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('expands a recurring event into the agenda window', async () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter())), provideRruleAdapter()],
    });
    const fixture = TestBed.createComponent(CalAgendaView);
    fixture.componentRef.setInput('events', [
      {
        id: 'weekly',
        title: 'Weekly sync',
        start: at('2026-06-15T13:00:00Z'),
        end: at('2026-06-15T13:30:00Z'),
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=4',
      },
    ]);
    fixture.componentRef.setInput('viewDate', at('2026-06-15T12:00:00Z'));
    fixture.componentRef.setInput('days', 30);
    fixture.componentRef.setInput('timezone', zone);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const rows = [...el.querySelectorAll('.cal-agenda__row')].filter((r) =>
      r.textContent?.includes('Weekly sync'),
    );
    // 4 Monday occurrences (Jun 15, 22, 29, Jul 6) fall inside the 30-day window
    expect(rows.length).toBe(4);
  });
});
