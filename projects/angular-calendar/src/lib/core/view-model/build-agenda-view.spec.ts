import { describe, it, expect } from 'vitest';
import { DateFnsDateAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { buildAgendaView } from './build-agenda-view';

const adapter = new DateFnsDateAdapter();
const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => adapter.toZoned(new Date(iso), zone);

describe('buildAgendaView', () => {
  it('lists the requested number of days', () => {
    const vm = buildAgendaView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [],
      days: 7,
    });
    expect(vm.days.length).toBe(7);
  });

  it('groups events under each day, all-day first then by start time', () => {
    const events: CalendarEvent[] = [
      { id: 'timed2', start: at('2026-06-15T18:00:00Z') },
      { id: 'timed1', start: at('2026-06-15T13:00:00Z') },
      { id: 'allday', allDay: true, start: at('2026-06-15T04:00:00Z'), end: at('2026-06-16T04:00:00Z') },
    ];
    const vm = buildAgendaView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events,
      days: 1,
      today: at('2026-06-15T12:00:00Z'),
    });
    expect(vm.days[0]!.isToday).toBe(true);
    expect(vm.days[0]!.events.map((e) => e.id)).toEqual(['allday', 'timed1', 'timed2']);
  });

  it('repeats a multi-day event under each covered day', () => {
    const events: CalendarEvent[] = [
      { id: 'trip', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-17T14:00:00Z') },
    ];
    const vm = buildAgendaView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events,
      days: 4,
    });
    expect(vm.days[0]!.events.length).toBe(1);
    expect(vm.days[1]!.events.length).toBe(1);
    expect(vm.days[2]!.events.length).toBe(1);
    expect(vm.days[3]!.events.length).toBe(0); // event ended on the 17th
  });

  it('omits empty days when hideEmptyDays is set', () => {
    const vm = buildAgendaView(adapter, {
      viewDate: at('2026-06-15T12:00:00Z'),
      events: [{ id: 'a', start: at('2026-06-16T13:00:00Z') }],
      days: 5,
      hideEmptyDays: true,
    });
    expect(vm.days.length).toBe(1);
    expect(adapter.format(vm.days[0]!.date, 'd', 'en-US')).toBe('16');
  });
});
