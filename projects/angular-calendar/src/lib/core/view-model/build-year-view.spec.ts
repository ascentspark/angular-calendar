import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { buildYearView } from './build-year-view';

const adapter = new DateFnsDateAdapter();
const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => adapter.toZoned(new Date(iso), zone);

describe('buildYearView', () => {
  it('produces 12 mini-months of 42 cells each for the focused year', () => {
    const vm = buildYearView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      weekStartsOn: 0,
      locale: 'en-US',
    });
    expect(vm.year).toBe(2026);
    expect(vm.months.length).toBe(12);
    expect(vm.months.every((m) => m.days.length === 42)).toBe(true);
    expect(vm.months[0]!.label).toBe('January');
    expect(vm.months[11]!.label).toBe('December');
  });

  it('marks in-month days and counts event density per day', () => {
    const events: CalendarEvent[] = [
      { id: 'a', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') },
      { id: 'b', start: at('2026-06-15T18:00:00Z'), end: at('2026-06-15T19:00:00Z') },
      { id: 'c', start: at('2026-06-09T13:00:00Z'), end: at('2026-06-11T14:00:00Z') }, // 3 days
    ];
    const vm = buildYearView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events,
      weekStartsOn: 0,
      today: at('2026-06-15T12:00:00Z'),
      locale: 'en-US',
    });
    const june = vm.months[5]!; // June (index 5)
    const jun15 = june.days.find(
      (d) => d.inMonth && adapter.format(d.date, 'd', 'en-US') === '15',
    )!;
    expect(jun15.eventCount).toBe(2);
    expect(jun15.isToday).toBe(true);
    // multi-day event contributes to each covered day
    const jun10 = june.days.find(
      (d) => d.inMonth && adapter.format(d.date, 'd', 'en-US') === '10',
    )!;
    expect(jun10.eventCount).toBe(1);
  });

  it('labels months under a non-Gregorian calendar system', () => {
    const vm = buildYearView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      weekStartsOn: 0,
      locale: 'en-US',
      calendarSystem: 'buddhist',
    });
    // Buddhist year = Gregorian + 543
    expect(vm.year).toBe(2026 + 543);
    expect(vm.months.length).toBe(12);
  });

  it('builds without error for a DST year and keeps all cells at local midnight', () => {
    const vm = buildYearView(adapter, {
      viewDate: at('2026-03-15T12:00:00Z'),
      events: [],
      weekStartsOn: 1,
      locale: 'en-US',
    });
    for (const month of vm.months) {
      for (const day of month.days) {
        expect(adapter.format(day.date, 'HH:mm', 'en-US')).toBe('00:00');
      }
    }
  });
});
