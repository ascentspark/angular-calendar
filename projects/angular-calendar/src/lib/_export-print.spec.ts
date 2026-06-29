import { describe, it, expect, vi } from 'vitest';
import {
  eventsToPrintHtml,
  printDocument,
  CAL_PRINT_STYLES,
  eventsToExcelXml,
} from '@ascentsparksoftware/angular-calendar/export';
import type { CalendarEvent } from '@ascentsparksoftware/angular-calendar';

// All timestamps are explicit UTC instants; tests pin timeZone:'UTC' so the
// rendered wall-clock is deterministic regardless of the host machine.
const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e1',
  title: 'Meeting',
  start: new Date('2026-03-10T09:00:00Z'),
  end: new Date('2026-03-10T10:00:00Z'),
  ...over,
});

describe('eventsToPrintHtml', () => {
  it('emits a complete HTML document with the title and styles', () => {
    const html = eventsToPrintHtml([ev({})], { title: 'My Schedule', timeZone: 'UTC' });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<title>My Schedule</title>');
    expect(html).toContain('<h1>My Schedule</h1>');
    expect(html).toContain(CAL_PRINT_STYLES);
  });

  it('groups events under a day heading and renders a time range', () => {
    const html = eventsToPrintHtml([ev({})], { timeZone: 'UTC', hour12: false });
    expect(html).toContain('Tuesday'); // 2026-03-10 is a Tuesday
    expect(html).toContain('09:00');
    expect(html).toContain('10:00');
    expect(html).toContain('Meeting');
  });

  it('labels all-day events and omits a range', () => {
    const allDay: CalendarEvent = {
      id: 'e1',
      title: 'Holiday',
      start: new Date('2026-03-10T00:00:00Z'),
      allDay: true,
    };
    const html = eventsToPrintHtml([allDay], { timeZone: 'UTC' });
    expect(html).toContain('All day');
  });

  it('escapes HTML in titles to prevent injection', () => {
    const html = eventsToPrintHtml([ev({ title: '<script>alert(1)</script>' })], {
      timeZone: 'UTC',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders an empty-state when there are no events', () => {
    const html = eventsToPrintHtml([], {});
    expect(html).toContain('No events.');
  });

  it('sorts events by start and groups across days', () => {
    const later: CalendarEvent = {
      id: 'e2',
      title: 'Later',
      start: new Date('2026-03-11T08:00:00Z'),
    };
    const earlier = ev({ id: 'e1', title: 'Earlier', start: new Date('2026-03-10T09:00:00Z') });
    const html = eventsToPrintHtml([later, earlier], { timeZone: 'UTC' });
    expect(html.indexOf('Earlier')).toBeLessThan(html.indexOf('Later'));
    expect(html.match(/<h2>/g)?.length).toBe(2); // two distinct day sections
  });
});

describe('printDocument', () => {
  it('writes the html to the target window and triggers print', () => {
    const write = vi.fn();
    const fakeDoc = { open: vi.fn(), write, close: vi.fn() } as unknown as Document;
    const target = { document: fakeDoc, focus: vi.fn(), print: vi.fn() };
    const ok = printDocument('<html></html>', target);
    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledWith('<html></html>');
    expect(target.print).toHaveBeenCalledOnce();
  });

  it('returns false when no window can be opened', () => {
    expect(printDocument('<html></html>', null)).toBe(false);
  });
});

describe('eventsToExcelXml', () => {
  it('produces a SpreadsheetML workbook Excel recognises', () => {
    const xml = eventsToExcelXml([ev({})]);
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('urn:schemas-microsoft-com:office:spreadsheet');
    expect(xml).toContain('ss:Name="Events"');
  });

  it('emits a header row and one data row per event with DateTime cells', () => {
    const xml = eventsToExcelXml([ev({})]);
    expect(xml).toContain('<Data ss:Type="String">Title</Data>');
    expect(xml).toContain('<Data ss:Type="DateTime">2026-03-10T09:00:00.000Z</Data>');
    expect(xml.match(/<Row>/g)?.length).toBe(2); // header + 1 event
  });

  it('escapes XML-special characters in titles', () => {
    const xml = eventsToExcelXml([ev({ title: 'A & B < C > "D"' })]);
    expect(xml).toContain('A &amp; B &lt; C &gt; &quot;D&quot;');
  });

  it('joins resourceIds and renders all-day as Yes/No', () => {
    const xml = eventsToExcelXml([ev({ allDay: true, resourceIds: ['r1', 'r2'] })]);
    expect(xml).toContain('r1; r2');
    expect(xml).toContain('<Data ss:Type="String">Yes</Data>');
  });
});
