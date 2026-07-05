import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type {
  CalendarEvent,
  CalendarResource,
  EventChange,
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
  // Pin the timezone to the test data's zone so day-window projection is deterministic
  // regardless of the host machine's zone (the view falls back to the host zone otherwise).
  for (const [k, v] of Object.entries({ timezone: zone, ...inputs })) {
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

describe('CalTimelineView — slot selection', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('emits slotSelected with the resource id when a lane is clicked', async () => {
    const { el, cmp } = await render({
      events: [],
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    let resourceId: string | null = null;
    cmp.slotSelected.subscribe((s) => (resourceId = s.resourceId));
    const row = el.querySelector<HTMLElement>('.cal-tl__row')!;
    row.getBoundingClientRect = () =>
      ({ height: 40, top: 0, left: 0, right: 1000, bottom: 40, width: 1000, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    row.dispatchEvent(new MouseEvent('click', { clientX: 500, clientY: 20, bubbles: true }));
    expect(resourceId).toBe('t1');
  });
});

describe('CalTimelineView — external drop', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('emits externalDrop with resource id, time, and payload', async () => {
    const { el, cmp } = await render({
      events: [],
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 0,
      dayEndMinutes: 1440,
      headerGroupings: ['hour'],
    });
    let drop: { resourceId: string; data: string } | null = null;
    cmp.externalDrop.subscribe((d) => (drop = d));
    const row = el.querySelector<HTMLElement>('.cal-tl__row')!;
    row.getBoundingClientRect = () =>
      ({ height: 40, top: 0, left: 0, right: 1000, bottom: 40, width: 1000, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const evt = new Event('drop', { bubbles: true });
    Object.defineProperty(evt, 'clientX', { value: 500 });
    Object.defineProperty(evt, 'clientY', { value: 20 });
    Object.defineProperty(evt, 'dataTransfer', {
      value: { getData: (t: string) => (t === 'text/plain' ? 'job-42' : ''), dropEffect: '' },
    });
    row.dispatchEvent(evt);
    expect(drop).not.toBeNull();
    expect(drop!.resourceId).toBe('t1');
    expect(drop!.data).toBe('job-42');
  });

  it('drags a block along the time axis and emits a move (duration preserved)', async () => {
    const events: CalendarEvent[] = [
      {
        id: 'job1',
        resourceIds: ['t1'],
        title: 'Install',
        start: at('2026-06-15T13:00:00Z'),
        end: at('2026-06-15T14:00:00Z'),
        status: 'scheduled',
      },
    ];
    const { el, cmp } = await render({
      events,
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 480,
      dayEndMinutes: 1080,
      headerGroupings: ['hour'],
      hourWidth: 60, // 1px == 1 minute
    });
    let change: {
      kind: string;
      resourceId?: string;
      start?: ZonedDateTime;
      end?: ZonedDateTime;
    } | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));

    const block = el.querySelector<HTMLElement>('.cal-tl__event')!;
    const fire = (type: string, clientX: number): void => {
      const e = new Event(type, { bubbles: true });
      Object.defineProperty(e, 'button', { value: 0 });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'clientX', { value: clientX });
      Object.defineProperty(e, 'clientY', { value: 0 });
      block.dispatchEvent(e);
    };
    fire('pointerdown', 100);
    fire('pointermove', 160); // +60px → +60 min (snapped to 15)
    fire('pointerup', 160);

    expect(change).not.toBeNull();
    expect(change!.kind).toBe('move');
    expect(change!.resourceId).toBe('t1'); // jsdom elementFromPoint → keeps origin lane
    expect(change!.start!.epochMs).toBe(Date.parse('2026-06-15T14:00:00Z'));
    expect(change!.end!.epochMs).toBe(Date.parse('2026-06-15T15:00:00Z'));
  });

  it('does not emit a move for a click below the drag threshold', async () => {
    const events: CalendarEvent[] = [
      {
        id: 'job1',
        resourceIds: ['t1'],
        title: 'Install',
        start: at('2026-06-15T13:00:00Z'),
        end: at('2026-06-15T14:00:00Z'),
      },
    ];
    const { el, cmp } = await render({
      events,
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 480,
      dayEndMinutes: 1080,
      headerGroupings: ['hour'],
    });
    let moved = false;
    cmp.eventChanged.subscribe(() => (moved = true));
    const block = el.querySelector<HTMLElement>('.cal-tl__event')!;
    const fire = (type: string, clientX: number): void => {
      const e = new Event(type, { bubbles: true });
      Object.defineProperty(e, 'button', { value: 0 });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'clientX', { value: clientX });
      Object.defineProperty(e, 'clientY', { value: 0 });
      block.dispatchEvent(e);
    };
    fire('pointerdown', 100);
    fire('pointermove', 102); // 2px < threshold
    fire('pointerup', 102);
    expect(moved).toBe(false);
  });
});

describe('CalTimelineView — keyboard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const job: CalendarEvent = {
    id: 'e',
    title: 'Install',
    start: at('2026-06-15T13:00:00Z'),
    end: at('2026-06-15T14:00:00Z'),
    resourceIds: ['t1'],
  };
  const base = {
    events: [job],
    resources,
    viewDate: at('2026-06-15T12:00:00Z'),
    days: 1,
    dayStartMinutes: 480,
    dayEndMinutes: 1080,
    timezone: zone,
  };
  const press = (el: HTMLElement, key: string, shift = false): void => {
    el.querySelector<HTMLButtonElement>('.cal-tl__event')!.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey: shift, bubbles: true }),
    );
  };

  it('grab → move → drop emits a later start and announces to the live region', async () => {
    const { el, cmp } = await render(base);
    let change: EventChange | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    press(el, 'Enter');
    press(el, 'ArrowRight');
    press(el, 'ArrowRight');
    press(el, 'Enter');
    const captured = change as EventChange | null;
    expect(captured).not.toBeNull();
    expect(captured!.kind).toBe('move');
    expect(captured!.start!.epochMs).toBeGreaterThan(Date.parse('2026-06-15T13:00:00Z'));
  });

  it('validateChange vetoes a keyboard move', async () => {
    const { el, cmp } = await render({ ...base, validateChange: () => false });
    let emitted = false;
    cmp.eventChanged.subscribe(() => (emitted = true));
    press(el, 'Enter');
    press(el, 'ArrowRight');
    press(el, 'Enter');
    expect(emitted).toBe(false);
  });

  it('ArrowDown reassigns the block to the next resource lane', async () => {
    const { el, cmp } = await render(base);
    let change: EventChange | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    press(el, 'Enter');
    press(el, 'ArrowDown');
    press(el, 'Enter');
    expect((change as EventChange | null)?.resourceId).toBe('t2');
  });
});

describe('CalTimelineView — pointer resize & create', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const base = {
    resources,
    viewDate: at('2026-06-15T12:00:00Z'),
    days: 1,
    dayStartMinutes: 480,
    dayEndMinutes: 1080,
    timezone: zone,
  };
  const fireOn = (target: Element, type: string, clientX: number): void => {
    const e = new Event(type, { bubbles: true });
    Object.defineProperty(e, 'button', { value: 0 });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    Object.defineProperty(e, 'clientX', { value: clientX });
    Object.defineProperty(e, 'clientY', { value: 0 });
    target.dispatchEvent(e);
  };

  it('dragging the end handle emits a resize with a later end', async () => {
    const job: CalendarEvent = {
      id: 'j',
      resourceIds: ['t1'],
      title: 'Install',
      start: at('2026-06-15T13:00:00Z'),
      end: at('2026-06-15T14:00:00Z'),
    };
    const { el, cmp } = await render({ ...base, events: [job] });
    let change: EventChange | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const handle = el.querySelector('.cal-tl__resize--end')!;
    fireOn(handle, 'pointerdown', 100);
    fireOn(handle, 'pointermove', 160); // +60px → +60min at 60px/hr
    fireOn(handle, 'pointerup', 160);
    const c = change as EventChange | null;
    expect(c?.kind).toBe('resize');
    expect(c!.start!.epochMs).toBe(Date.parse('2026-06-15T13:00:00Z')); // start unchanged
    expect(c!.end!.epochMs).toBe(Date.parse('2026-06-15T15:00:00Z')); // +1h
  });

  it('dragging on an empty lane emits a create with a duration', async () => {
    const { el, cmp } = await render({ ...base, events: [] });
    let change: EventChange | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));
    const lane = el.querySelector('.cal-tl__row')!; // first lane = t1
    fireOn(lane, 'pointerdown', 100);
    fireOn(lane, 'pointermove', 220); // +120px → +120min duration
    fireOn(lane, 'pointerup', 220);
    const c = change as EventChange | null;
    expect(c?.kind).toBe('create');
    expect(c?.event).toBeNull();
    expect(c?.resourceId).toBe('t1');
    expect((c!.end!.epochMs - c!.start!.epochMs) / 60_000).toBe(120);
  });
});

describe('CalTimelineView — vertical orientation', () => {
  beforeEach(() => TestBed.resetTestingModule());

  const hostBase = {
    events: [] as CalendarEvent[],
    resources,
    viewDate: at('2026-06-15T12:00:00Z'),
    days: 1,
    headerGroupings: ['hour'] as const,
  };

  it('does not add the cal-tl--vertical host class by default (horizontal)', async () => {
    const { el } = await render(hostBase);
    expect((el as HTMLElement).classList.contains('cal-tl--vertical')).toBe(false);
  });

  it('adds the cal-tl--vertical host class in vertical mode', async () => {
    const { el } = await render({ ...hostBase, orientation: 'vertical' });
    expect((el as HTMLElement).classList.contains('cal-tl--vertical')).toBe(true);
  });

  it('renders the same event set in vertical mode, placed in the owning resource', async () => {
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
      orientation: 'vertical',
    });
    const rows = el.querySelectorAll('.cal-tl__row');
    expect(rows[0]!.querySelector('.cal-tl__event')?.textContent).toContain('Install');
    expect(rows[1]!.querySelector('.cal-tl__event')).toBeNull();
  });

  it('packs three overlapping events into three sub-lanes (--ev-lane steps by laneHeight)', async () => {
    const events: CalendarEvent[] = [
      { id: 'a', resourceIds: ['t1'], title: 'A', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'b', resourceIds: ['t1'], title: 'B', start: at('2026-06-15T13:30:00Z'), end: at('2026-06-15T15:00:00Z') },
      { id: 'c', resourceIds: ['t1'], title: 'C', start: at('2026-06-15T14:00:00Z'), end: at('2026-06-15T15:00:00Z') },
    ];
    const { el } = await render({
      events,
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 480,
      dayEndMinutes: 1080,
      headerGroupings: ['hour'],
      orientation: 'vertical',
      laneHeight: 40,
    });
    const lanes = Array.from(el.querySelectorAll<HTMLElement>('.cal-tl__row')[0]!.querySelectorAll<HTMLElement>('.cal-tl__event'))
      .map((b) => b.style.getPropertyValue('--ev-lane').trim());
    expect(lanes.length).toBe(3);
    expect(new Set(lanes)).toEqual(new Set(['0px', '40px', '80px']));
  });

  it('drags a block along the vertical (Y) time axis and emits a move', async () => {
    const events: CalendarEvent[] = [
      { id: 'job1', resourceIds: ['t1'], title: 'Install', start: at('2026-06-15T13:00:00Z'), end: at('2026-06-15T14:00:00Z'), status: 'scheduled' },
    ];
    const { el, cmp } = await render({
      events,
      resources,
      viewDate: at('2026-06-15T12:00:00Z'),
      days: 1,
      dayStartMinutes: 480,
      dayEndMinutes: 1080,
      headerGroupings: ['hour'],
      hourWidth: 60, // 1px == 1 minute (px-per-hour on Y in vertical)
      orientation: 'vertical',
    });
    let change: EventChange | null = null;
    cmp.eventChanged.subscribe((c) => (change = c));

    const block = el.querySelector<HTMLElement>('.cal-tl__event')!;
    const fire = (type: string, clientY: number): void => {
      const e = new Event(type, { bubbles: true });
      Object.defineProperty(e, 'button', { value: 0 });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'clientX', { value: 0 });
      Object.defineProperty(e, 'clientY', { value: clientY });
      block.dispatchEvent(e);
    };
    fire('pointerdown', 100);
    fire('pointermove', 160); // +60px on Y → +60 min later
    fire('pointerup', 160);

    const c = change as EventChange | null;
    expect(c?.kind).toBe('move');
    expect(c?.start?.epochMs).toBe(Date.parse('2026-06-15T14:00:00Z'));
    expect(c?.end?.epochMs).toBe(Date.parse('2026-06-15T15:00:00Z'));
  });
});
