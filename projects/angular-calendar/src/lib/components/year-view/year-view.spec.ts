import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { CalYearView } from './year-view';

const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

async function render(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
  });
  const fixture = TestBed.createComponent(CalYearView);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

describe('CalYearView', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders 12 mini-month grids', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    expect(el.querySelectorAll('[role="grid"]').length).toBe(12);
  });

  it('marks today and shows event density', async () => {
    const events: CalendarEvent[] = [
      { id: 'a', start: at('2026-06-15T13:00:00Z') },
      { id: 'b', start: at('2026-06-15T18:00:00Z') },
    ];
    const { el } = await render({
      events,
      viewDate: at('2026-06-15T12:00:00Z'),
      today: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    expect(el.querySelector('.cal-mini__day--today')).toBeTruthy();
    const dense = el.querySelector('[data-density="2"]');
    expect(dense?.getAttribute('aria-label')).toContain('2 events');
  });

  it('emits daySelected on a day click and monthSelected on the month title', async () => {
    const { el, cmp } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    let day = 0;
    let month = 0;
    cmp.daySelected.subscribe(() => (day += 1));
    cmp.monthSelected.subscribe(() => (month += 1));
    el.querySelector<HTMLButtonElement>('button.cal-mini__day')?.click();
    el.querySelector<HTMLButtonElement>('.cal-mini__title')?.click();
    expect(day).toBe(1);
    expect(month).toBe(1);
  });

  it('exposes exactly one tabbable day (roving tabindex)', async () => {
    const { el } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      today: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    expect(el.querySelectorAll('.cal-mini__day[tabindex="0"]').length).toBe(1);
  });

  it('moves roving focus across days with arrow keys', async () => {
    const { el, cmp } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      today: at('2026-06-15T12:00:00Z'),
      weekStartsOn: 0,
    });
    const before = cmp.focusedEpoch();
    el.querySelector<HTMLElement>('.cal-year')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(cmp.focusedEpoch()).not.toBe(before);
  });
});
