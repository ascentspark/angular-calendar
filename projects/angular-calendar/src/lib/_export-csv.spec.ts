import { describe, it, expect } from 'vitest';
import { eventsToCsv } from '@ascentsparksoftware/angular-calendar/export';
import type { ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

const z = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone: 'UTC' });

describe('eventsToCsv', () => {
  it('emits a header row and one row per event', () => {
    const csv = eventsToCsv([
      { id: 'a', title: 'Meeting', start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T14:00:00Z'), status: 'scheduled', resourceIds: ['t1', 't2'] },
    ]);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe('id,title,start,end,allDay,status,resourceIds');
    expect(lines[1]).toBe('a,Meeting,2026-06-15T13:00:00.000Z,2026-06-15T14:00:00.000Z,false,scheduled,t1;t2');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = eventsToCsv([{ id: 'a', title: 'A, "B"\nC', start: z('2026-06-15T13:00:00Z') }]);
    expect(csv).toContain('"A, ""B""\nC"');
  });

  it('marks all-day events', () => {
    const csv = eventsToCsv([{ id: 'a', allDay: true, start: z('2026-06-15T00:00:00Z') }]);
    expect(csv).toContain(',true,');
  });
});
