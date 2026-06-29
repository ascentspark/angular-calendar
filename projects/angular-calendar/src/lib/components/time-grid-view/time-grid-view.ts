import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CALENDAR_CONFIG } from '../../core/config/calendar-config';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import type { CalendarSystem, ZonedDateTime } from '../../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../../core/model/calendar-event';
import type { TimeAxisOrientation } from '../../core/model/view';
import { buildTimeGridView } from '../../core/view-model/build-time-grid-view';
import { RECURRENCE_ADAPTER } from '../../core/recurrence/recurrence-adapter';
import { expandRecurringEvents } from '../../core/recurrence/expand-recurring-events';
import type { PositionedChip } from '../../core/view-model/positioned-chip';
import type { PositionedEvent } from '../../core/view-model/positioned-event';
import type { TimeColumn } from '../../core/view-model/time-grid-view-model';
import { applyTheme } from '../../theme/apply-theme';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';
import { CalCalendarIntl } from '../../i18n/cal-calendar-intl';
import { CalEventTemplate } from '../../directives/cal-event-template';
import type { EventChange } from '../../interactions/event-change';
import { computeDragTimes, type DragKind } from '../../interactions/drag-preview';

/** Internal record of an in-flight pointer gesture on the time grid. */
interface DragGesture {
  readonly kind: DragKind;
  readonly eventId: string;
  readonly originStartMs: number;
  readonly originEndMs: number;
  readonly pointerId: number;
  readonly startClientY: number;
  readonly pxPerMinute: number;
  readonly deltaMinutes: number;
  /** True once movement passed the start threshold (so a plain click still selects). */
  readonly active: boolean;
  /** For `create`: the column (day) the new event belongs to. */
  readonly columnEpoch?: number;
}

const DRAG_THRESHOLD_PX = 4;
/** Sentinel pointerId marking a keyboard-driven grab (vs a real pointer). */
const KEYBOARD_POINTER = -1;

const FALLBACK_BASE = '#ffffff';
const FALLBACK_ACCENT = '#3b82f6';

/**
 * Time-grid workhorse for week / work-week / day. Renders the pure
 * {@link buildTimeGridView} model: a time gutter, an all-day band, day columns
 * with side-by-side packed timed events, working-hours shading hooks, and a live
 * now-indicator. Theme-agnostic `--cal-*`; OnPush; date math delegated to the
 * adapter. `orientation` toggles time-on-Y (vertical) vs time-on-X (horizontal).
 */
@Component({
  selector: 'cal-time-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './time-grid-view.html',
  styleUrl: './time-grid-view.css',
  host: {
    '[class.cal-tg--horizontal]': "orientation() === 'horizontal'",
    '[class.cal-tg--vertical]': "orientation() === 'vertical'",
  },
})
export class CalTimeGridView<TMeta = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
  private readonly recurrence = inject(RECURRENCE_ADAPTER, { optional: true });
  readonly a11y = inject(CalCalendarA11y);
  readonly intl = inject(CalCalendarIntl);

  readonly events = input.required<readonly CalendarEvent<TMeta>[]>();
  readonly viewDate = input.required<Date | ZonedDateTime>();
  readonly days = input<number>(7);
  readonly anchorToWeek = input<boolean>(true);
  readonly orientation = input<TimeAxisOrientation>('vertical');
  readonly today = input<Date | ZonedDateTime | null>(null);
  readonly now = input<Date | ZonedDateTime | null>(null);
  readonly weekStartsOn = input<number | null>(null);
  readonly slotMinutes = input<number | null>(null);
  readonly dayStartMinutes = input<number | null>(null);
  readonly dayEndMinutes = input<number | null>(null);
  readonly excludeDays = input<readonly number[] | null>(null);
  readonly weekendDays = input<readonly number[] | null>(null);
  readonly timezone = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly calendarSystem = input<CalendarSystem | null>(null);

  readonly baseColor = input<string>(FALLBACK_BASE);
  readonly accentColor = input<string>(FALLBACK_ACCENT);
  readonly themeMode = input<CalThemeMode>('light');
  readonly statusColors = input<Record<string, string>>({});

  /** Whether events can be dragged / resized. */
  readonly editable = input<boolean>(true);
  /** Drag/resize quantisation in minutes; defaults to the config snap. */
  readonly snapMinutes = input<number | null>(null);
  /** Live veto: return false to reject an in-flight change (preview snaps back). */
  readonly validateChange = input<((change: EventChange<TMeta>) => boolean) | null>(null);

  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();
  readonly slotSelected = output<{ date: ZonedDateTime; minutes: number }>();
  readonly eventChanged = output<EventChange<TMeta>>();

  /** Enable single-/double-click inline editing of an event's title. */
  readonly inlineEdit = input<boolean>(true);

  readonly eventTemplate = contentChild(CalEventTemplate);

  /** In-flight drag/resize gesture, or null. Drives the live preview. */
  protected readonly dragState = signal<DragGesture | null>(null);
  /** Id of the event whose title is being inline-edited, or null. */
  protected readonly editingId = signal<string | null>(null);
  private readonly inlineInput = viewChild<ElementRef<HTMLInputElement>>('inlineInput');

  private readonly resolvedLocale = computed(() => this.locale() ?? this.config.locale);
  private readonly resolvedZone = computed(
    () => this.timezone() ?? this.config.timezone ?? hostZone(),
  );

  protected readonly viewModel = computed(() => {
    const zone = this.resolvedZone();
    const todayValue = this.today();
    const nowValue = this.now();
    const exclude = this.excludeDays();
    const weekend = this.weekendDays();
    const args = {
      viewDate: this.adapter.toZoned(this.viewDate(), zone),
      days: this.days(),
      weekStartsOn: this.weekStartsOn() ?? this.config.weekStartsOn,
      orientation: this.orientation(),
      slotMinutes: this.slotMinutes() ?? this.config.slotMinutes,
      dayStartMinutes: this.dayStartMinutes() ?? this.config.dayStartMinutes,
      dayEndMinutes: this.dayEndMinutes() ?? this.config.dayEndMinutes,
      locale: this.resolvedLocale(),
      anchorToWeek: this.anchorToWeek(),
      ...(todayValue !== null ? { today: this.adapter.toZoned(todayValue, zone) } : {}),
      ...(nowValue !== null ? { now: this.adapter.toZoned(nowValue, zone) } : {}),
      ...(exclude !== null ? { excludeDays: exclude } : {}),
      ...(weekend !== null ? { weekendDays: weekend } : {}),
    };
    const events = this.expandedEvents(zone, args);
    return buildTimeGridView<TMeta>(this.adapter, { ...args, events });
  });

  /** Expand recurring events against the grid window when a recurrence adapter is present. */
  private expandedEvents(
    zone: string,
    args: Omit<Parameters<typeof buildTimeGridView<TMeta>>[1], 'events'>,
  ): readonly CalendarEvent<TMeta>[] {
    const raw = this.events();
    if (this.recurrence === null || !raw.some((e) => e.recurrenceRule !== undefined)) {
      return raw;
    }
    const probe = buildTimeGridView<TMeta>(this.adapter, { ...args, events: [] });
    return expandRecurringEvents<TMeta>(raw, {
      recurrence: this.recurrence,
      dates: this.adapter,
      windowStart: probe.period.start,
      windowEnd: probe.period.end,
      zone,
    });
  }

  /** Number of all-day band lanes (for reserving band height). */
  protected readonly allDayLanes = computed(() => {
    let max = -1;
    for (const chip of this.viewModel().allDay) {
      if (chip.lane > max) {
        max = chip.lane;
      }
    }
    return max + 1;
  });

  protected readonly columnHeaders = computed(() => {
    const locale = this.resolvedLocale();
    const system = this.calendarSystem() ?? this.config.calendarSystem;
    return this.viewModel().columns.map((c) => ({
      weekday: this.adapter.format(c.date, 'EEE', locale, system),
      day: this.adapter.format(c.date, 'd', locale, system),
      isToday: c.isToday,
      isWeekend: c.isWeekend,
    }));
  });

  private readonly theme = computed(() => {
    try {
      return deriveTheme(this.baseColor(), this.accentColor(), this.themeMode(), this.statusColors());
    } catch {
      return deriveTheme(FALLBACK_BASE, FALLBACK_ACCENT, this.themeMode(), this.statusColors());
    }
  });

  protected readonly columnFocus = signal(0);

  constructor() {
    effect(() => applyTheme(this.host.nativeElement, this.theme()));
    effect(() => {
      if (this.editingId() !== null) {
        const el = this.inlineInput()?.nativeElement;
        if (el) {
          el.focus();
          el.select();
        }
      }
    });
  }

  protected eventLabel(event: CalendarEvent<TMeta>): string {
    return this.a11y.eventLabel(event);
  }

  /** Hover tooltip: title + localized time range (events truncate at small sizes). */
  protected tooltip(event: CalendarEvent<TMeta>): string {
    const title = event.title ?? '';
    if (event.allDay === true) {
      return `${title} · ${this.intl.allDay}`.trim();
    }
    const zone = this.resolvedZone();
    const locale = this.resolvedLocale();
    const start = this.adapter.format(this.adapter.toZoned(event.start, zone), 'h:mm a', locale);
    if (event.end === undefined) {
      return `${title} · ${start}`.trim();
    }
    const end = this.adapter.format(this.adapter.toZoned(event.end, zone), 'h:mm a', locale);
    return `${title} · ${start}–${end}`.trim();
  }

  /** Inline geometry for a timed event (time axis + cross-axis lane), status-tinted. */
  protected eventStyle(ev: PositionedEvent<TMeta>, column: TimeColumn<TMeta>): Record<string, string> {
    const key = ev.event.status !== undefined ? sanitizeStatusKey(ev.event.status) : '';
    const bg = key !== '' ? `var(--cal-event-${key}, var(--cal-accent))` : 'var(--cal-accent)';
    const fg = key !== '' ? `var(--cal-event-${key}-ink, var(--cal-accent-ink))` : 'var(--cal-accent-ink)';
    const geo = this.previewGeometry(ev, column);
    const widthPct = (ev.columnSpan / ev.laneCount) * 100;
    const leftPct = (ev.lane / ev.laneCount) * 100;
    return {
      '--ev-start': `${geo.startOffset * 100}%`,
      '--ev-size': `${geo.span * 100}%`,
      '--ev-cross-start': `${leftPct}%`,
      '--ev-cross-size': `${widthPct}%`,
      background: bg,
      color: fg,
    };
  }

  /** Whether this event is the one currently being dragged/resized. */
  protected isDragging(ev: PositionedEvent<TMeta>): boolean {
    const drag = this.dragState();
    return drag !== null && drag.active && drag.eventId === ev.event.id;
  }

  /** Time-axis geometry, replaced by the live preview while this event is dragged. */
  private previewGeometry(
    ev: PositionedEvent<TMeta>,
    column: TimeColumn<TMeta>,
  ): { startOffset: number; span: number } {
    const drag = this.dragState();
    if (drag === null || !drag.active || drag.eventId !== ev.event.id) {
      return { startOffset: ev.startOffset, span: ev.span };
    }
    const vm = this.viewModel();
    const total = vm.dayEndMinutes - vm.dayStartMinutes;
    const times = computeDragTimes({
      kind: drag.kind,
      originStartMs: drag.originStartMs,
      originEndMs: drag.originEndMs,
      deltaMinutes: drag.deltaMinutes,
      snapMinutes: this.snapMinutes() ?? this.config.snapMinutes,
      minDurationMinutes: Math.max(5, this.config.slotMinutes),
    });
    const dayStart0 = this.adapter.startOfDay(column.date);
    const zone = this.resolvedZone();
    const sMin = this.adapter.differenceInMinutes(this.adapter.toZoned(new Date(times.startMs), zone), dayStart0);
    const eMin = this.adapter.differenceInMinutes(this.adapter.toZoned(new Date(times.endMs), zone), dayStart0);
    const cs = Math.max(vm.dayStartMinutes, Math.min(sMin, vm.dayEndMinutes));
    const ce = Math.max(cs, Math.min(eMin, vm.dayEndMinutes));
    return { startOffset: (cs - vm.dayStartMinutes) / total, span: (ce - cs) / total };
  }

  /** Begin a move/resize gesture on pointer-down over an event (or its handle). */
  protected onEventPointerDown(
    ev: PositionedEvent<TMeta>,
    column: TimeColumn<TMeta>,
    kind: DragKind,
    dom: PointerEvent,
  ): void {
    if (!this.editable() || ev.event.isReadonly === true || ev.event.editable === false) {
      return;
    }
    if (kind === 'move' && ev.event.draggable === false) {
      return;
    }
    const colEl = (dom.currentTarget as HTMLElement).closest<HTMLElement>('.cal-tg__col');
    if (colEl === null) {
      return;
    }
    const vm = this.viewModel();
    const total = vm.dayEndMinutes - vm.dayStartMinutes;
    const pxPerMinute = colEl.getBoundingClientRect().height / Math.max(1, total);
    const zone = this.resolvedZone();
    const start = this.adapter.toZoned(ev.event.start, zone);
    const end = ev.event.end === undefined ? start : this.adapter.toZoned(ev.event.end, zone);
    const target = dom.currentTarget as HTMLElement;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(dom.pointerId);
      } catch {
        // setPointerCapture is best-effort (not critical to the gesture).
      }
    }
    dom.stopPropagation();
    this.dragState.set({
      kind,
      eventId: ev.event.id,
      originStartMs: start.epochMs,
      originEndMs: end.epochMs,
      pointerId: dom.pointerId,
      startClientY: dom.clientY,
      pxPerMinute,
      deltaMinutes: 0,
      active: false,
    });
  }

  protected onEventPointerMove(dom: PointerEvent): void {
    const drag = this.dragState();
    if (drag === null || drag.pointerId !== dom.pointerId) {
      return;
    }
    const dyPx = dom.clientY - drag.startClientY;
    const active = drag.active || Math.abs(dyPx) > DRAG_THRESHOLD_PX;
    this.dragState.set({ ...drag, deltaMinutes: dyPx / drag.pxPerMinute, active });
  }

  protected onEventPointerUp(ev: PositionedEvent<TMeta>, column: TimeColumn<TMeta>, dom: PointerEvent): void {
    const drag = this.dragState();
    if (drag === null || drag.pointerId !== dom.pointerId) {
      return;
    }
    if (!drag.active) {
      // No real movement → treat as a click/select.
      this.dragState.set(null);
      this.eventClicked.emit({ event: ev.event });
      return;
    }
    this.commitGesture(ev, drag);
  }

  /** Build, validate, and emit the change for a finished move/resize gesture. */
  private commitGesture(ev: PositionedEvent<TMeta>, drag: DragGesture): void {
    const times = computeDragTimes({
      kind: drag.kind,
      originStartMs: drag.originStartMs,
      originEndMs: drag.originEndMs,
      deltaMinutes: drag.deltaMinutes,
      snapMinutes: this.snapMinutes() ?? this.config.snapMinutes,
      minDurationMinutes: Math.max(5, this.config.slotMinutes),
    });
    const zone = this.resolvedZone();
    const change: EventChange<TMeta> = {
      kind: drag.kind === 'move' ? 'move' : 'resize',
      event: ev.event,
      start: this.adapter.toZoned(new Date(times.startMs), zone),
      end: this.adapter.toZoned(new Date(times.endMs), zone),
    };
    this.dragState.set(null);
    const validate = this.validateChange();
    if (validate !== null && !validate(change)) {
      return; // vetoed → preview already cleared (snaps back)
    }
    this.eventChanged.emit(change);
  }

  protected onEventPointerCancel(dom: PointerEvent): void {
    const drag = this.dragState();
    if (drag !== null && drag.pointerId === dom.pointerId) {
      this.dragState.set(null);
    }
  }

  /**
   * Keyboard move/resize on a focused event (a11y). Enter/Space grabs; Arrow
   * Up/Down move by one snap step (Shift = resize the end); Enter drops, Escape
   * cancels. Uses the same `dragState` preview + commit path as pointer drag.
   */
  protected onEventKeydown(ev: PositionedEvent<TMeta>, dom: KeyboardEvent): void {
    const drag = this.dragState();
    const grabbing = drag !== null && drag.pointerId === KEYBOARD_POINTER && drag.eventId === ev.event.id;
    const snap = this.snapMinutes() ?? this.config.snapMinutes;

    if (!grabbing) {
      if (dom.key === 'Enter' || dom.key === ' ') {
        if (!this.editable() || ev.event.isReadonly === true || ev.event.editable === false) {
          return;
        }
        dom.preventDefault();
        const zone = this.resolvedZone();
        const start = this.adapter.toZoned(ev.event.start, zone);
        const end = ev.event.end === undefined ? start : this.adapter.toZoned(ev.event.end, zone);
        this.dragState.set({
          kind: 'move',
          eventId: ev.event.id,
          originStartMs: start.epochMs,
          originEndMs: end.epochMs,
          pointerId: KEYBOARD_POINTER,
          startClientY: 0,
          pxPerMinute: 1,
          deltaMinutes: 0,
          active: true,
        });
      }
      return;
    }

    switch (dom.key) {
      case 'ArrowUp':
        dom.preventDefault();
        this.dragState.set({
          ...drag,
          kind: dom.shiftKey ? 'resize-end' : 'move',
          deltaMinutes: drag.deltaMinutes - snap,
        });
        break;
      case 'ArrowDown':
        dom.preventDefault();
        this.dragState.set({
          ...drag,
          kind: dom.shiftKey ? 'resize-end' : 'move',
          deltaMinutes: drag.deltaMinutes + snap,
        });
        break;
      case 'Enter':
      case ' ':
        dom.preventDefault();
        this.commitGesture(ev, drag);
        break;
      case 'Escape':
        dom.preventDefault();
        this.dragState.set(null);
        break;
      default:
        break;
    }
  }

  // ── inline title editing ──────────────────────────────────────────────────
  protected isEditing(ev: PositionedEvent<TMeta>): boolean {
    return this.editingId() === ev.event.id;
  }

  protected startInlineEdit(ev: PositionedEvent<TMeta>, dom: Event): void {
    if (!this.inlineEdit() || ev.event.isReadonly === true) {
      return;
    }
    dom.stopPropagation();
    this.dragState.set(null);
    this.editingId.set(ev.event.id);
  }

  protected commitInlineEdit(ev: PositionedEvent<TMeta>, value: string): void {
    if (this.editingId() !== ev.event.id) {
      return;
    }
    this.editingId.set(null);
    const title = value.trim();
    if (title !== (ev.event.title ?? '')) {
      this.eventChanged.emit({ kind: 'inline-edit', event: ev.event, title });
    }
  }

  protected cancelInlineEdit(): void {
    this.editingId.set(null);
  }

  protected onInlineKeydown(ev: PositionedEvent<TMeta>, dom: KeyboardEvent): void {
    if (dom.key === 'Enter') {
      dom.preventDefault();
      this.commitInlineEdit(ev, (dom.target as HTMLInputElement).value);
    } else if (dom.key === 'Escape') {
      dom.preventDefault();
      this.cancelInlineEdit();
    }
  }

  protected chipStyle(chip: PositionedChip<TMeta>): Record<string, string> {
    const key = chip.event.status !== undefined ? sanitizeStatusKey(chip.event.status) : '';
    const bg = key !== '' ? `var(--cal-event-${key}-soft, var(--cal-accent-soft))` : 'var(--cal-accent-soft)';
    const fg = key !== '' ? `var(--cal-event-${key}-soft-ink, var(--cal-accent-soft-ink))` : 'var(--cal-accent-soft-ink)';
    return {
      'grid-column': `${chip.startColumn + 1} / span ${chip.span}`,
      'grid-row': `${chip.lane + 1}`,
      background: bg,
      color: fg,
    };
  }

  protected nowStyle(offset: number): Record<string, string> {
    return { '--now-pos': `${offset * 100}%` };
  }

  protected onEventClick(event: CalendarEvent<TMeta>, dom: Event): void {
    dom.stopPropagation();
    this.eventClicked.emit({ event });
  }

  /** Begin a drag-create on empty grid space (pointer-down on the column itself). */
  protected onColumnPointerDown(column: TimeColumn<TMeta>, dom: PointerEvent): void {
    // Ignore if the gesture started on an event/handle (those stopPropagation).
    if (!this.editable()) {
      return;
    }
    const colEl = dom.currentTarget as HTMLElement;
    const vm = this.viewModel();
    const total = vm.dayEndMinutes - vm.dayStartMinutes;
    const rect = colEl.getBoundingClientRect();
    const pxPerMinute = rect.height / Math.max(1, total);
    const frac = (dom.clientY - rect.top) / Math.max(1, rect.height);
    const minutes = vm.dayStartMinutes + Math.max(0, Math.min(1, frac)) * total;
    const anchorMs = this.adapter.addMinutes(column.date, Math.round(minutes)).epochMs;
    if (typeof colEl.setPointerCapture === 'function') {
      try {
        colEl.setPointerCapture(dom.pointerId);
      } catch {
        // best-effort
      }
    }
    this.dragState.set({
      kind: 'create',
      eventId: '',
      originStartMs: anchorMs,
      originEndMs: anchorMs,
      pointerId: dom.pointerId,
      startClientY: dom.clientY,
      pxPerMinute,
      deltaMinutes: 0,
      active: false,
      columnEpoch: column.date.epochMs,
    });
  }

  protected onColumnPointerMove(dom: PointerEvent): void {
    const drag = this.dragState();
    if (drag === null || drag.kind !== 'create' || drag.pointerId !== dom.pointerId) {
      return;
    }
    const dyPx = dom.clientY - drag.startClientY;
    const active = drag.active || Math.abs(dyPx) > DRAG_THRESHOLD_PX;
    this.dragState.set({ ...drag, deltaMinutes: dyPx / drag.pxPerMinute, active });
  }

  protected onColumnPointerUp(column: TimeColumn<TMeta>, dom: PointerEvent): void {
    const drag = this.dragState();
    if (drag === null || drag.kind !== 'create' || drag.pointerId !== dom.pointerId) {
      return;
    }
    const vm = this.viewModel();
    if (!drag.active) {
      // No drag → a plain slot click.
      this.dragState.set(null);
      const minutes = this.adapter.differenceInMinutes(
        this.adapter.toZoned(new Date(drag.originStartMs), this.resolvedZone()),
        this.adapter.startOfDay(column.date),
      );
      this.slotSelected.emit({
        date: this.adapter.toZoned(new Date(drag.originStartMs), this.resolvedZone()),
        minutes: Math.round(minutes),
      });
      return;
    }
    const times = this.createTimes(drag);
    const zone = this.resolvedZone();
    const change: EventChange<TMeta> = {
      kind: 'create',
      event: null,
      start: this.adapter.toZoned(new Date(times.startMs), zone),
      end: this.adapter.toZoned(new Date(times.endMs), zone),
    };
    void vm;
    this.dragState.set(null);
    const validate = this.validateChange();
    if (validate !== null && !validate(change)) {
      return;
    }
    this.eventChanged.emit(change);
  }

  /** Preview geometry for the in-flight create ghost in a given column, or null. */
  protected createGhostStyle(column: TimeColumn<TMeta>): Record<string, string> | null {
    const drag = this.dragState();
    if (
      drag === null ||
      drag.kind !== 'create' ||
      !drag.active ||
      drag.columnEpoch !== column.date.epochMs
    ) {
      return null;
    }
    const vm = this.viewModel();
    const total = vm.dayEndMinutes - vm.dayStartMinutes;
    const times = this.createTimes(drag);
    const dayStart0 = this.adapter.startOfDay(column.date);
    const zone = this.resolvedZone();
    const sMin = this.adapter.differenceInMinutes(this.adapter.toZoned(new Date(times.startMs), zone), dayStart0);
    const eMin = this.adapter.differenceInMinutes(this.adapter.toZoned(new Date(times.endMs), zone), dayStart0);
    const cs = Math.max(vm.dayStartMinutes, Math.min(sMin, vm.dayEndMinutes));
    const ce = Math.max(cs, Math.min(eMin, vm.dayEndMinutes));
    return {
      '--ev-start': `${((cs - vm.dayStartMinutes) / total) * 100}%`,
      '--ev-size': `${((ce - cs) / total) * 100}%`,
    };
  }

  private createTimes(drag: DragGesture): { startMs: number; endMs: number } {
    return computeDragTimes({
      kind: 'create',
      originStartMs: drag.originStartMs,
      originEndMs: drag.originEndMs,
      deltaMinutes: 0,
      pointerMs: drag.originStartMs + drag.deltaMinutes * 60_000,
      snapMinutes: this.snapMinutes() ?? this.config.snapMinutes,
      minDurationMinutes: Math.max(5, this.config.slotMinutes),
    });
  }

  protected trackColumn(_index: number, column: TimeColumn<TMeta>): number {
    return column.date.epochMs;
  }

  protected trackEvent(_index: number, ev: PositionedEvent<TMeta>): string {
    return ev.event.id;
  }

  protected trackChip(_index: number, chip: PositionedChip<TMeta>): string {
    return `${chip.event.id}:${chip.startColumn}`;
  }
}

function hostZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}
