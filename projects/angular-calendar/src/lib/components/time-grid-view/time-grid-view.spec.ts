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

  it('emits eventClicked on a tap (pointer down+up with no movement)', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await render({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
    });
    let clicked: string | null = null;
    cmp.eventClicked.subscribe((e) => (clicked = e.event.id));
    const eventEl = el.querySelector<HTMLButtonElement>('.cal-tg__event')!;
    eventEl.dispatchEvent(makePointer('pointerdown', 1, 100));
    eventEl.dispatchEvent(makePointer('pointerup', 1, 100));
    expect(clicked).toBe('a');
  });

  it('emits eventChanged with kind "move" when an event is dragged', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await render({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
    });
    let change: { kind: string } | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const eventEl = el.querySelector<HTMLButtonElement>('.cal-tg__event')!;
    // jsdom reports a 0px column height → guard against that for the math
    eventEl.closest<HTMLElement>('.cal-tg__col')!.getBoundingClientRect = () =>
      ({ height: 1440, top: 0, left: 0, right: 0, bottom: 1440, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    eventEl.dispatchEvent(makePointer('pointerdown', 1, 100));
    eventEl.dispatchEvent(makePointer('pointermove', 1, 160)); // +60px → +60min at 1px/min
    eventEl.dispatchEvent(makePointer('pointerup', 1, 160));
    expect(change).not.toBeNull();
    expect(change!.kind).toBe('move');
  });
});

/** Construct a PointerEvent (jsdom-safe), falling back to a MouseEvent with a pointerId. */
function makePointer(type: string, pointerId: number, clientY: number): Event {
  try {
    return new PointerEvent(type, { pointerId, clientY, bubbles: true });
  } catch {
    const e = new MouseEvent(type, { clientY, bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: pointerId });
    return e;
  }
}

describe('CalTimeGridView — drag-create', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('emits eventChanged kind "create" after dragging empty grid space', async () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    });
    const fixture = TestBed.createComponent(CalTimeGridView);
    fixture.componentRef.setInput('events', []);
    fixture.componentRef.setInput('viewDate', at('2026-06-15T12:00:00Z'));
    fixture.componentRef.setInput('days', 1);
    fixture.componentRef.setInput('anchorToWeek', false);
    fixture.componentRef.setInput('dayStartMinutes', 0);
    fixture.componentRef.setInput('dayEndMinutes', 1440);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const cmp = fixture.componentInstance;
    let change: { kind: string; start?: unknown; end?: unknown } | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const col = el.querySelector<HTMLElement>('.cal-tg__col')!;
    col.getBoundingClientRect = () =>
      ({ height: 1440, top: 0, left: 0, right: 100, bottom: 1440, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    col.dispatchEvent(makePointerXY('pointerdown', 1, 0, 540)); // 09:00
    col.dispatchEvent(makePointerXY('pointermove', 1, 0, 660)); // 11:00
    col.dispatchEvent(makePointerXY('pointerup', 1, 0, 660));
    expect(change).not.toBeNull();
    expect(change!.kind).toBe('create');
    expect(change!.start).toBeDefined();
    expect(change!.end).toBeDefined();
  });
});

function makePointerXY(type: string, pointerId: number, clientX: number, clientY: number): Event {
  try {
    return new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true });
  } catch {
    const e = new MouseEvent(type, { clientX, clientY, bubbles: true });
    Object.defineProperty(e, 'pointerId', { value: pointerId });
    return e;
  }
}

describe('CalTimeGridView — resize & veto', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('emits kind "resize" when dragging the bottom handle', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await render({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
    });
    let change: { kind: string } | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const handle = el.querySelector<HTMLElement>('.cal-tg__resize--end')!;
    handle.closest<HTMLElement>('.cal-tg__col')!.getBoundingClientRect = () =>
      ({ height: 1440, top: 0, left: 0, right: 0, bottom: 1440, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    handle.dispatchEvent(makePointer('pointerdown', 1, 100));
    handle.dispatchEvent(makePointer('pointermove', 1, 160));
    handle.dispatchEvent(makePointer('pointerup', 1, 160));
    expect(change).not.toBeNull();
    expect(change!.kind).toBe('resize');
  });

  it('does not emit when validateChange vetoes the move', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await render({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      validateChange: () => false,
    });
    let emitted = false;
    cmp.eventChanged.subscribe(() => (emitted = true));
    const eventEl = el.querySelector<HTMLButtonElement>('.cal-tg__event')!;
    eventEl.closest<HTMLElement>('.cal-tg__col')!.getBoundingClientRect = () =>
      ({ height: 1440, top: 0, left: 0, right: 0, bottom: 1440, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    eventEl.dispatchEvent(makePointer('pointerdown', 1, 100));
    eventEl.dispatchEvent(makePointer('pointermove', 1, 160));
    eventEl.dispatchEvent(makePointer('pointerup', 1, 160));
    expect(emitted).toBe(false);
  });

  it('emits slotSelected on a plain tap of an empty column', async () => {
    const { el, cmp } = await render({
      events: [],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
    });
    let slot = 0;
    cmp.slotSelected.subscribe(() => (slot += 1));
    const col = el.querySelector<HTMLElement>('.cal-tg__col')!;
    col.getBoundingClientRect = () =>
      ({ height: 1440, top: 0, left: 0, right: 100, bottom: 1440, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    col.dispatchEvent(makePointerXY('pointerdown', 1, 0, 540));
    col.dispatchEvent(makePointerXY('pointerup', 1, 0, 540));
    expect(slot).toBe(1);
  });
});

describe('CalTimeGridView — inline edit', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('double-click reveals an input that commits a new title via eventChanged', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'Old', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp, fixture } = await renderWithFixture({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
    });
    let change: { kind: string; title?: string } | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const eventEl = el.querySelector<HTMLButtonElement>('.cal-tg__event')!;
    eventEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const input = el.querySelector<HTMLInputElement>('.cal-tg__inline');
    expect(input).toBeTruthy();
    input!.value = 'New title';
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(change).not.toBeNull();
    expect(change!.kind).toBe('inline-edit');
    expect(change!.title).toBe('New title');
  });

  it('Escape cancels the inline edit without emitting', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'Old', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp, fixture } = await renderWithFixture({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
    });
    let emitted = false;
    cmp.eventChanged.subscribe(() => (emitted = true));
    el.querySelector<HTMLButtonElement>('.cal-tg__event')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const input = el.querySelector<HTMLInputElement>('.cal-tg__inline')!;
    input.value = 'changed';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(emitted).toBe(false);
    expect(el.querySelector('.cal-tg__inline')).toBeNull();
  });
});

async function renderWithFixture(inputs: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
  });
  const fixture = TestBed.createComponent(CalTimeGridView);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance, fixture };
}

describe('CalTimeGridView — keyboard move', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('Enter grabs, ArrowDown moves, Enter commits a move', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await renderWithFixture({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
      snapMinutes: 30,
    });
    let change: { kind: string } | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const eventEl = el.querySelector<HTMLButtonElement>('.cal-tg__event')!;
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(change).not.toBeNull();
    expect(change!.kind).toBe('move');
  });

  it('Escape cancels a keyboard grab without emitting', async () => {
    const ev: CalendarEvent = { id: 'a', title: 'X', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z') };
    const { el, cmp } = await renderWithFixture({
      events: [ev],
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      anchorToWeek: false,
    });
    let emitted = false;
    cmp.eventChanged.subscribe(() => (emitted = true));
    const eventEl = el.querySelector<HTMLButtonElement>('.cal-tg__event')!;
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(emitted).toBe(false);
  });
});
