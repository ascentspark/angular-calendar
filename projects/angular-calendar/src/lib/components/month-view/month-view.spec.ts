import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { CalMonthView } from './month-view';

const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

async function render(inputs: Record<string, unknown>): Promise<{
  el: HTMLElement;
  cmp: CalMonthView;
}> {
  TestBed.configureTestingModule({
    providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
  });
  const fixture = TestBed.createComponent(CalMonthView);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

describe('CalMonthView', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders 7 weekday headers and a full grid of gridcells', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    expect(el.querySelectorAll('[role="columnheader"]').length).toBe(7);
    const cells = el.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBe(35); // 5 weeks × 7
    expect(el.querySelector('[role="grid"]')).toBeTruthy();
  });

  it('labels each day cell with its full date and marks today', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      today: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    const today = el.querySelector('.cal-day--today');
    expect(today).toBeTruthy();
    expect(today?.getAttribute('aria-label')).toContain('June');
  });

  it('renders an event chip with its title', async () => {
    const event: CalendarEvent = {
      id: 'e1',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
      title: 'Standup',
    };
    const { el } = await render({
      events: [event],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    const chip = el.querySelector('.cal-chip');
    expect(chip?.textContent).toContain('Standup');
    expect(chip?.getAttribute('aria-label')).toBe('Standup');
  });

  it('emits eventClicked when a chip is clicked', async () => {
    const event: CalendarEvent = { id: 'e1', start: at('2026-06-15T13:00:00Z'), title: 'X' };
    const { el, cmp } = await render({
      events: [event],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    let clicked: string | null = null;
    cmp.eventClicked.subscribe((e) => (clicked = e.event.id));
    el.querySelector<HTMLButtonElement>('.cal-chip')?.click();
    expect(clicked).toBe('e1');
  });

  it('selects a day and emits daySelected on cell click', async () => {
    const { el, cmp } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    let selected = 0;
    cmp.daySelected.subscribe(() => (selected += 1));
    el.querySelector<HTMLElement>('[role="gridcell"]')?.click();
    expect(selected).toBe(1);
    expect(cmp.selectedEpoch()).not.toBeNull();
  });

  it('emits viewPeriodChanged with the grid window', async () => {
    let period: { start: ZonedDateTime } | null = null;
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    });
    const fixture = TestBed.createComponent(CalMonthView);
    fixture.componentInstance.viewPeriodChanged.subscribe((p) => (period = p));
    fixture.componentRef.setInput('events', []);
    fixture.componentRef.setInput('viewDate', at('2026-06-15T12:00:00Z'));
    fixture.componentRef.setInput('weekStartsOn', 0);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(period).not.toBeNull();
  });

  it('shows a "+N more" control when maxLanes is exceeded', async () => {
    const sameDay = (n: number): CalendarEvent => ({
      id: `e${n}`,
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
      title: `E${n}`,
    });
    const { el } = await render({
      events: [sameDay(1), sameDay(2), sameDay(3), sameDay(4)],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
      maxLanes: 2,
    });
    const more = el.querySelector('.cal-day__more');
    expect(more?.textContent).toContain('+2');
  });
});

describe('CalMonthView — keyboard navigation', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('moves roving focus with arrow keys and selects with Enter', async () => {
    const { el, cmp } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      today: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    const grid = el.querySelector<HTMLElement>('[role="grid"]')!;
    const focusedEpoch = cmp.effectiveFocus()!;
    // ArrowRight → next day
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(cmp.focusedEpoch()).not.toBe(focusedEpoch);
    // ArrowDown → +7 days (one week)
    const afterRight = cmp.focusedEpoch();
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(cmp.focusedEpoch()).not.toBe(afterRight);
    // Enter selects the focused day
    let selected = 0;
    cmp.daySelected.subscribe(() => (selected += 1));
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selected).toBe(1);
  });

  it('exactly one gridcell is tabbable (roving tabindex)', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      today: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    const tabbable = el.querySelectorAll('[role="gridcell"][tabindex="0"]');
    expect(tabbable.length).toBe(1);
  });
});

import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';

describe('CalMonthView — recurrence', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('expands a recurring event into multiple chips across the month', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideCalendar(withDateAdapter(provideDateFnsAdapter())),
        provideRruleAdapter(),
      ],
    });
    const fixture = TestBed.createComponent(CalMonthView);
    fixture.componentRef.setInput('events', [
      {
        id: 'weekly',
        title: 'Weekly sync',
        start: at('2026-06-15T13:00:00Z'),
        end: at('2026-06-15T13:30:00Z'),
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3',
      },
    ]);
    fixture.componentRef.setInput('viewDate', at('2026-06-15T12:00:00Z'));
    fixture.componentRef.setInput('weekStartsOn', 0);
    fixture.componentRef.setInput('timezone', 'America/New_York');
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // 3 Monday occurrences (Jun 15, 22, 29) → 3 chips
    const chips = [...el.querySelectorAll('.cal-chip__title')].filter((c) =>
      c.textContent?.includes('Weekly sync'),
    );
    expect(chips.length).toBe(3);
  });
});
