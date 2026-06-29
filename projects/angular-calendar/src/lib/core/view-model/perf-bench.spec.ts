import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, CalendarResource, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { buildMonthView } from './build-month-view';
import { buildTimeGridView } from './build-time-grid-view';
import { buildTimelineView } from './build-timeline-view';

const adapter = new DateFnsDateAdapter();
const NY = 'America/New_York';
const at = (iso: string): ZonedDateTime => adapter.toZoned(new Date(iso), NY);

/** Run `fn` a few times and return the fastest (warm) wall-clock ms. */
function bestOf(runs: number, fn: () => void): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}

/** Deterministic event generator (no Math.random). */
function makeEvents(count: number, dayBaseIso: string): CalendarEvent[] {
  const baseMs = Date.parse(dayBaseIso);
  return Array.from({ length: count }, (_, i) => {
    const start = baseMs + (i % 20) * 30 * 60_000 + Math.floor(i / 20) * 86_400_000;
    return {
      id: `e${i}`,
      title: `Event ${i}`,
      start: { epochMs: start, zone: NY },
      end: { epochMs: start + 60 * 60_000, zone: NY },
      resourceIds: [`r${i % 100}`],
      status: (['scheduled', 'active', 'done'][i % 3]) ?? 'scheduled',
    };
  });
}

describe('perf budgets (generous CI ceilings to catch algorithmic regressions)', () => {
  it('buildMonthView with 500 events stays well under budget', () => {
    const events = makeEvents(500, '2026-06-01T12:00:00Z');
    const ms = bestOf(5, () =>
      buildMonthView(adapter, { viewDate: at('2026-06-15T12:00:00Z'), events, weekStartsOn: 0 }),
    );
    // target is < 4ms on a laptop; 60ms is a loose CI ceiling that still catches O(n²).
    expect(ms).toBeLessThan(60);
  });

  it('buildTimeGridView (week, 500 events) stays under budget', () => {
    const events = makeEvents(500, '2026-06-15T08:00:00Z');
    const ms = bestOf(5, () =>
      buildTimeGridView(adapter, {
        viewDate: at('2026-06-15T12:00:00Z'),
        events,
        days: 7,
        weekStartsOn: 0,
        orientation: 'vertical',
        slotMinutes: 30,
        dayStartMinutes: 0,
        dayEndMinutes: 1440,
        locale: 'en-US',
        anchorToWeek: true,
      }),
    );
    expect(ms).toBeLessThan(60);
  });

  it('buildTimelineView (100 resources × 2000 events) stays under budget', () => {
    const resources: CalendarResource[] = Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`,
      name: `Resource ${i}`,
    }));
    const events = makeEvents(2000, '2026-06-15T08:00:00Z');
    const ms = bestOf(3, () =>
      buildTimelineView(adapter, {
        viewDate: at('2026-06-15T12:00:00Z'),
        events,
        resources,
        days: 1,
        dayStartMinutes: 0,
        dayEndMinutes: 1440,
        headerGroupings: ['hour'],
        orientation: 'horizontal',
        weekStartsOn: 0,
        locale: 'en-US',
      }),
    );
    // 100×2000 build; loose 250ms CI ceiling (target is interactive-grade on a laptop).
    expect(ms).toBeLessThan(250);
  });
});
