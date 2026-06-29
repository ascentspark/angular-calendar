import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { CalTimeGridView } from './time-grid-view';

const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

async function render(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
  });
  const fixture = TestBed.createComponent(CalTimeGridView);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

describe('CalTimeGridView', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders 7 day-column headers for a week', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 7,
      anchorToWeek: true,
    });
    expect(el.querySelectorAll('[role="columnheader"]').length).toBe(7);
    expect(el.querySelectorAll('.cal-tg__col').length).toBe(7);
  });

  it('renders a timed event positioned in the grid', async () => {
    const ev: CalendarEvent = {
      id: 'a',
      title: 'Standup',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
      status: 'scheduled',
    };
    const { el } = await render({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      statusColors: { scheduled: '#3b82f6' },
    });
    const eventEl = el.querySelector<HTMLElement>('.cal-tg__event');
    expect(eventEl?.textContent).toContain('Standup');
    expect(eventEl?.style.getPropertyValue('--ev-start')).toContain('%');
  });

  it('routes an all-day event to the band', async () => {
    const { el } = await render({
      events: [{ id: 'a', allDay: true, title: 'PTO', start: at('2026-06-15T04:00:00Z'), end: at('2026-06-16T04:00:00Z') }],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 7,
      anchorToWeek: true,
    });
    expect(el.querySelector('.cal-tg__chip')?.textContent).toContain('PTO');
    expect(el.querySelector('.cal-tg__event')).toBeNull();
  });

  it('shows the now-indicator when "now" is in the window', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      now: at('2026-06-15T16:00:00Z'),
    });
    expect(el.querySelector('.cal-tg__now')).toBeTruthy();
  });

  it('emits eventClicked when a timed event is clicked', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await render({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
    });
    let clicked: string | null = null;
    cmp.eventClicked.subscribe((e) => (clicked = e.event.id));
    el.querySelector<HTMLButtonElement>('.cal-tg__event')?.click();
    expect(clicked).toBe('a');
  });
});
