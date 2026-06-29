import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type {
  CalendarEvent,
  CalendarResource,
  ZonedDateTime,
} from '@ascentsparksoftware/angular-calendar';
import { CalTimelineView } from './timeline-view';

const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

const resources: CalendarResource[] = [
  { id: 't1', name: 'Alice' },
  { id: 't2', name: 'Bob' },
];

async function render(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
  });
  const fixture = TestBed.createComponent(CalTimelineView);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance, fixture };
}

describe('CalTimelineView', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders a frozen header per resource and time-header cells', async () => {
    const { el } = await render({
      events: [],
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 480,
      dayEndMinutes: 1080,
      headerGroupings: ['hour'],
    });
    const heads = el.querySelectorAll('.cal-tl__rhead');
    expect(heads.length).toBe(2);
    expect(heads[0]!.textContent).toContain('Alice');
    expect(el.querySelectorAll('[role="columnheader"]').length).toBe(10); // 08:00..17:00
  });

  it('places an event block in the owning resource row', async () => {
    const events: CalendarEvent[] = [
      { id: 'job1', resourceIds: ['t1'], title: 'Install', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z'), status: 'scheduled' },
    ];
    const { el } = await render({
      events,
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 480,
      dayEndMinutes: 1080,
      headerGroupings: ['hour'],
      statusColors: { scheduled: '#3b82f6' },
    });
    const rows = el.querySelectorAll('.cal-tl__row');
    expect(rows[0]!.querySelector('.cal-tl__event')?.textContent).toContain('Install');
    expect(rows[1]!.querySelector('.cal-tl__event')).toBeNull();
  });

  it('emits eventClicked on an event block', async () => {
    const events: CalendarEvent[] = [
      { id: 'job1', resourceIds: ['t1'], title: 'Install', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') },
    ];
    const { el, cmp } = await render({
      events,
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      headerGroupings: ['hour'],
    });
    let clicked: string | null = null;
    cmp.eventClicked.subscribe((e) => (clicked = e.event.id));
    el.querySelector<HTMLButtonElement>('.cal-tl__event')?.click();
    expect(clicked).toBe('job1');
  });

  it('collapses a parent resource via its twisty', async () => {
    const tree: CalendarResource[] = [
      { id: 'region', name: 'East', expanded: true },
      { id: 't1', name: 'Alice', parentId: 'region' },
    ];
    const { el, fixture } = await render({
      events: [],
      resources: tree,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      headerGroupings: ['hour'],
    });
    expect(el.querySelectorAll('.cal-tl__rhead').length).toBe(2);
    el.querySelector<HTMLButtonElement>('.cal-tl__twisty')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelectorAll('.cal-tl__rhead').length).toBe(1); // child hidden
  });

  it('renders off-hours shading from workHours', async () => {
    const withHours: CalendarResource[] = [
      { id: 't1', name: 'Alice', workHours: [{ daysOfWeek: [1], startMinutes: 540, endMinutes: 1020 }] },
    ];
    const { el } = await render({
      events: [],
      resources: withHours,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    expect(el.querySelectorAll('.cal-tl__shade--off').length).toBeGreaterThan(0);
  });
});
