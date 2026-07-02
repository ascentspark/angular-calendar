import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { CALENDAR_CONFIG, resolveTimeFormat } from '../../core/config/calendar-config';
import type { EventChange } from '../../interactions/event-change';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import type { CalendarSystem, ZonedDateTime } from '../../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../../core/model/calendar-event';
import type { CalendarResource } from '../../core/model/calendar-resource';
import { buildTimelineView } from '../../core/view-model/build-timeline-view';
import { computeRowWindow, type VirtualWindow } from '../../core/layout/virtual-window';
import type { TimeHeaderUnit, ResourceRow } from '../../core/view-model/timeline-view-model';
import { RECURRENCE_ADAPTER } from '../../core/recurrence/recurrence-adapter';
import { expandRecurringEvents } from '../../core/recurrence/expand-recurring-events';
import type { PositionedEvent, ShadeBand } from '../../core/view-model/positioned-event';
import { applyTheme } from '../../theme/apply-theme';
import { CAL_TOKEN_BRIDGE, CAL_VIRTUALIZATION } from '../../core/config/provide-calendar';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';
import { CalCalendarIntl } from '../../i18n/cal-calendar-intl';
import { CalEventTemplate } from '../../directives/cal-event-template';
import { CalResourceHeaderTemplate } from '../../directives/cal-resource-header-template';

const FALLBACK_BASE = '#ffffff';
const FALLBACK_ACCENT = '#3b82f6';
/** Movement past this many px before a press is treated as a drag (not a click). */
const DRAG_THRESHOLD_PX = 4;

/** In-flight gesture moving/resizing a timeline block along time / across lanes. */
interface TimelineDrag {
  readonly eventId: string;
  readonly kind: 'move' | 'resize-end';
  readonly originStartMs: number;
  readonly originEndMs: number;
  readonly originResourceId: string;
  /** Resource lane the block will land in (keyboard lane moves change this). */
  readonly targetResourceId: string;
  readonly pointerId: number;
  readonly startClientX: number;
  readonly deltaMinutes: number;
  readonly active: boolean;
}

/** Sentinel pointerId marking a keyboard-driven grab (vs a real pointer). */
const KEYBOARD_POINTER = -1;

/** Absolute epoch ms of a `Date | ZonedDateTime`. */
function epochOf(value: Date | ZonedDateTime): number {
  return value instanceof Date ? value.getTime() : value.epochMs;
}

/**
 * Resource × time dispatch board. Renders the pure {@link buildTimelineView}
 * model with a frozen resource-header column, sticky multi-level time headers,
 * per-resource lanes of positioned event blocks, off-hours / block-out shading,
 * a live now-line, and expand/collapse of the resource tree. Theme-agnostic
 * `--cal-*`; OnPush; all date math delegated to the adapter.
 */
@Component({
  selector: 'cal-timeline-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './timeline-view.html',
  styleUrl: './timeline-view.css',
})
export class CalTimelineView<TMeta = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
  private readonly tokenBridge = inject(CAL_TOKEN_BRIDGE, { optional: true });
  private readonly recurrence = inject(RECURRENCE_ADAPTER, { optional: true });
  readonly a11y = inject(CalCalendarA11y);
  readonly intl = inject(CalCalendarIntl);

  readonly events = input.required<readonly CalendarEvent<TMeta>[]>();
  readonly resources = input.required<readonly CalendarResource<TMeta>[]>();
  readonly viewDate = input.required<Date | ZonedDateTime>();
  readonly days = input<number>(1);
  readonly dayStartMinutes = input<number | null>(null);
  readonly dayEndMinutes = input<number | null>(null);
  readonly headerGroupings = input<readonly TimeHeaderUnit[]>(['day', 'hour']);
  readonly today = input<Date | ZonedDateTime | null>(null);
  readonly now = input<Date | ZonedDateTime | null>(null);
  readonly weekStartsOn = input<number | null>(null);
  readonly timezone = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly calendarSystem = input<CalendarSystem | null>(null);
  /** Pixel width of one hour along the time axis (controls horizontal density). */
  readonly hourWidth = input<number>(60);
  /** Pixel height of one event sub-lane. */
  readonly laneHeight = input<number>(34);

  readonly baseColor = input<string>(FALLBACK_BASE);
  readonly accentColor = input<string>(FALLBACK_ACCENT);
  readonly themeMode = input<CalThemeMode>('light');
  readonly statusColors = input<Record<string, string>>({});
  /** Optional hex override for on-accent text (`--cal-accent-ink`); null = auto. */
  readonly accentInk = input<string | null>(null);

  /** Whether blocks can be dragged to reschedule / reassign. */
  readonly editable = input<boolean>(true);
  /** Drag quantisation in minutes; defaults to the config snap. */
  readonly snapMinutes = input<number | null>(null);
  /** Live veto: return false to reject an in-flight change (the block snaps back). */
  readonly validateChange = input<((change: EventChange<TMeta>) => boolean) | null>(null);

  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();
  readonly viewPeriodChanged = output<{ start: ZonedDateTime; end: ZonedDateTime; zone: string }>();
  /** Fired when a block is dragged to a new time and/or resource lane. */
  readonly eventChanged = output<EventChange<TMeta>>();
  readonly slotSelected = output<{ date: ZonedDateTime; resourceId: string }>();
  readonly resourceToggled = output<{ resource: CalendarResource<TMeta>; expanded: boolean }>();
  /**
   * Fired when an external item (e.g. an unassigned job from a side list) is
   * dropped onto a resource lane. Carries the drop time, target resource, and the
   * dropped `text/plain` payload so the host can create/assign the event.
   */
  readonly externalDrop = output<{ date: ZonedDateTime; resourceId: string; data: string }>();

  readonly eventTemplate = contentChild(CalEventTemplate);
  readonly resourceHeaderTemplate = contentChild(CalResourceHeaderTemplate);

  /** Local collapse overrides (id → collapsed), so the board is self-contained. */
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  private readonly resolvedLocale = computed(() => this.locale() ?? this.config.locale);
  private readonly resolvedZone = computed(
    () => this.timezone() ?? this.config.timezone ?? hostZone(),
  );

  /** Resources with local collapse applied (expanded:false for collapsed ids). */
  private readonly effectiveResources = computed<readonly CalendarResource<TMeta>[]>(() => {
    const collapsed = this.collapsed();
    if (collapsed.size === 0) {
      return this.resources();
    }
    return this.resources().map((r) =>
      collapsed.has(r.id) ? { ...r, expanded: false } : r,
    );
  });

  protected readonly viewModel = computed(() => {
    const zone = this.resolvedZone();
    const todayValue = this.today();
    const nowValue = this.now();
    const args = {
      viewDate: this.adapter.toZoned(this.viewDate(), zone),
      resources: this.effectiveResources(),
      days: this.days(),
      dayStartMinutes: this.dayStartMinutes() ?? this.config.dayStartMinutes,
      dayEndMinutes: this.dayEndMinutes() ?? this.config.dayEndMinutes,
      headerGroupings: this.headerGroupings(),
      orientation: 'horizontal' as const,
      weekStartsOn: this.weekStartsOn() ?? this.config.weekStartsOn,
      locale: this.resolvedLocale(),
      hour12: this.config.hour12,
      ...(nowValue !== null ? { now: this.adapter.toZoned(nowValue, zone) } : {}),
      ...(todayValue !== null ? { today: this.adapter.toZoned(todayValue, zone) } : {}),
    };
    const events = this.expandedEvents(zone, args);
    return buildTimelineView<TMeta>(this.adapter, { ...args, events });
  });

  /** Expand recurring events against the timeline window when an adapter is present. */
  private expandedEvents(
    zone: string,
    args: Omit<Parameters<typeof buildTimelineView<TMeta>>[1], 'events'>,
  ): readonly CalendarEvent<TMeta>[] {
    const raw = this.events();
    if (this.recurrence === null || !raw.some((e) => e.recurrenceRule !== undefined)) {
      return raw;
    }
    const probe = buildTimelineView<TMeta>(this.adapter, { ...args, events: [] });
    return expandRecurringEvents<TMeta>(raw, {
      recurrence: this.recurrence,
      dates: this.adapter,
      windowStart: probe.period.start,
      windowEnd: probe.period.end,
      zone,
    });
  }

  /** Total hours along the axis (for the time-area width). */
  protected readonly totalHours = computed(() => {
    const p = this.viewModel().period;
    return this.adapter.differenceInMinutes(p.end, p.start) / 60;
  });

  private readonly theme = computed(() => {
    try {
      return deriveTheme(this.baseColor(), this.accentColor(), this.themeMode(), this.statusColors(), this.accentInk());
    } catch {
      return deriveTheme(FALLBACK_BASE, FALLBACK_ACCENT, this.themeMode(), this.statusColors());
    }
  });

  // ── Virtualization (rows windowed vertically, events culled horizontally) ────
  private readonly virtual = inject(CAL_VIRTUALIZATION);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly scrollTop = signal(0);
  private readonly scrollLeft = signal(0);
  private readonly viewportHeight = signal(0);
  private readonly viewportWidth = signal(0);

  /** The slice of resource rows to render, plus the spacer heights that preserve scroll height. */
  protected readonly rowWindow = computed<VirtualWindow>(() => {
    const rows = this.viewModel().resourceRows;
    const vh = this.viewportHeight();
    // Disabled, unmeasured, or a modest list ⇒ render everything (un-virtualized layout).
    if (!this.virtual.enabled || rows.length <= this.virtual.rowThreshold || vh <= 0) {
      return { start: 0, end: rows.length, padTop: 0, padBottom: 0 };
    }
    const laneH = this.laneHeight();
    const heights = rows.map((r) => r.laneCount * laneH);
    return computeRowWindow(heights, this.scrollTop(), vh, this.virtual.overscanPx);
  });

  /** The resource rows currently in (or near) the viewport. */
  protected readonly visibleRows = computed(() => {
    const w = this.rowWindow();
    return this.viewModel().resourceRows.slice(w.start, w.end);
  });

  /**
   * Events in a lane that intersect the horizontal viewport (+overscan) — so a wide
   * month timeline doesn't render thousands of off-screen event nodes. Falls back to
   * the full lane when virtualization is off or the width isn't measured yet.
   */
  protected visibleEvents(row: ResourceRow<TMeta>): readonly PositionedEvent<TMeta>[] {
    const vw = this.viewportWidth();
    if (!this.virtual.enabled || vw <= 0) {
      return row.events;
    }
    const totalW = this.totalHours() * this.hourWidth();
    const left = this.scrollLeft() - this.virtual.overscanPx;
    const right = this.scrollLeft() + vw + this.virtual.overscanPx;
    return row.events.filter((e) => {
      const x0 = e.startOffset * totalW;
      const x1 = (e.startOffset + e.span) * totalW;
      return x1 >= left && x0 <= right;
    });
  }

  protected onScroll(target: EventTarget | null): void {
    if (target instanceof HTMLElement) {
      this.scrollTop.set(target.scrollTop);
      this.scrollLeft.set(target.scrollLeft);
    }
  }

  constructor() {
    effect(() => applyTheme(this.host.nativeElement, this.theme(), this.tokenBridge));
    effect(() => this.viewPeriodChanged.emit(this.viewModel().period));

    // Track the scroll viewport's size (browser-only) so windowing + culling know
    // how much to render on each axis.
    afterNextRender(() => {
      const el = this.scroller()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      const measure = (): void => {
        this.viewportHeight.set(el.clientHeight);
        this.viewportWidth.set(el.clientWidth);
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected eventLabel(event: CalendarEvent<TMeta>): string {
    return this.a11y.eventLabel(event);
  }

  /** Hover tooltip: title + localized time range. */
  protected tooltip(event: CalendarEvent<TMeta>): string {
    const title = event.title ?? '';
    const zone = this.resolvedZone();
    const locale = this.resolvedLocale();
    const start = this.adapter.format(this.adapter.toZoned(event.start, zone), resolveTimeFormat(this.config.hour12), locale);
    if (event.end === undefined) {
      return `${title} · ${start}`.trim();
    }
    const end = this.adapter.format(this.adapter.toZoned(event.end, zone), resolveTimeFormat(this.config.hour12), locale);
    return `${title} · ${start}–${end}`.trim();
  }

  protected rowHeightPx(row: ResourceRow<TMeta>): number {
    return row.laneCount * this.laneHeight();
  }

  protected eventStyle(ev: PositionedEvent<TMeta>): Record<string, string> {
    const key = ev.event.status !== undefined ? sanitizeStatusKey(ev.event.status) : '';
    const bg = key !== '' ? `var(--cal-event-${key}, var(--cal-accent))` : 'var(--cal-accent)';
    const fg = key !== '' ? `var(--cal-event-${key}-ink, var(--cal-accent-ink))` : 'var(--cal-accent-ink)';
    return {
      'inset-inline-start': `${ev.startOffset * 100}%`,
      'inline-size': `calc(${ev.span * 100}% - 2px)`,
      'inset-block-start': `${ev.lane * this.laneHeight()}px`,
      'block-size': `${this.laneHeight() - 3}px`,
      background: bg,
      color: fg,
    };
  }

  protected shadeStyle(band: ShadeBand): Record<string, string> {
    return {
      'inset-inline-start': `${band.startOffset * 100}%`,
      'inline-size': `${band.span * 100}%`,
    };
  }

  protected nowStyle(): Record<string, string> {
    const off = this.viewModel().nowOffset ?? 0;
    return { 'inset-inline-start': `${off * 100}%` };
  }

  protected toggle(row: ResourceRow<TMeta>): void {
    if (!row.hasChildren) {
      return;
    }
    const id = row.resource.id;
    const next = new Set(this.collapsed());
    const willCollapse = !next.has(id);
    if (willCollapse) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.collapsed.set(next);
    this.resourceToggled.emit({ resource: row.resource, expanded: !willCollapse });
  }

  protected isCollapsed(row: ResourceRow<TMeta>): boolean {
    return this.collapsed().has(row.resource.id);
  }

  /** In-flight block drag, or null. Drives the live horizontal preview. */
  protected readonly drag = signal<TimelineDrag | null>(null);
  /** Set briefly after an active drag so the trailing click doesn't also fire. */
  private suppressClick = false;
  /** Live-region text announced during keyboard move/resize. */
  protected readonly announcement = signal('');
  /** Lane order (resource ids top→bottom) for keyboard lane navigation. */
  private readonly laneOrder = computed(() => this.viewModel().resourceRows.map((r) => r.resource.id));

  protected onEventClick(event: CalendarEvent<TMeta>, dom: Event): void {
    dom.stopPropagation();
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.eventClicked.emit({ event });
  }

  protected onEventPointerDown(
    ev: PositionedEvent<TMeta>,
    row: ResourceRow<TMeta>,
    dom: PointerEvent,
  ): void {
    if (!this.editable() || ev.event.isReadonly === true || dom.button !== 0) {
      return;
    }
    const startMs = epochOf(ev.event.start);
    const endMs = ev.event.end !== undefined ? epochOf(ev.event.end) : startMs + 3_600_000;
    this.drag.set({
      eventId: ev.event.id,
      kind: 'move',
      originStartMs: startMs,
      originEndMs: endMs,
      originResourceId: row.resource.id,
      targetResourceId: row.resource.id,
      pointerId: dom.pointerId,
      startClientX: dom.clientX,
      deltaMinutes: 0,
      active: false,
    });
    const target = dom.currentTarget as HTMLElement;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(dom.pointerId);
      } catch {
        /* best-effort: not critical to the gesture */
      }
    }
  }

  protected onEventPointerMove(dom: PointerEvent): void {
    const d = this.drag();
    if (d === null || d.pointerId !== dom.pointerId) {
      return;
    }
    const dx = dom.clientX - d.startClientX;
    const eff = this.isRtl() ? -dx : dx;
    const pxPerMinute = this.hourWidth() / 60;
    const snap = this.snapMinutes() ?? this.config.snapMinutes;
    const minutes = Math.round(eff / pxPerMinute / snap) * snap;
    const active = d.active || Math.abs(dx) > DRAG_THRESHOLD_PX;
    this.drag.set({ ...d, deltaMinutes: minutes, active });
  }

  protected onEventPointerUp(ev: PositionedEvent<TMeta>, dom: PointerEvent): void {
    const d = this.drag();
    if (d === null || d.pointerId !== dom.pointerId) {
      return;
    }
    this.drag.set(null);
    if (!d.active) {
      return; // a plain click; let (click) handle selection
    }
    this.suppressClick = true;
    const targetResource = this.resourceAtPoint(dom.clientX, dom.clientY) ?? d.originResourceId;
    this.commitDrag(ev.event, { ...d, targetResourceId: targetResource });
  }

  /** Build the change for a gesture, run it past `validateChange`, and emit if allowed. */
  private commitDrag(event: CalendarEvent<TMeta>, d: TimelineDrag): void {
    const zone = this.resolvedZone();
    const deltaMs = d.deltaMinutes * 60_000;
    if (deltaMs === 0 && d.targetResourceId === d.originResourceId) {
      return; // no net change
    }
    const start =
      d.kind === 'resize-end'
        ? this.adapter.toZoned(new Date(d.originStartMs), zone)
        : this.adapter.toZoned(new Date(d.originStartMs + deltaMs), zone);
    const end = this.adapter.toZoned(new Date(d.originEndMs + deltaMs), zone);
    const change: EventChange<TMeta> = {
      kind: d.kind === 'resize-end' ? 'resize' : 'move',
      event,
      start,
      end,
      resourceId: d.targetResourceId,
    };
    const validate = this.validateChange();
    if (validate !== null && !validate(change)) {
      return; // vetoed — preview already cleared, so the block snaps back
    }
    this.eventChanged.emit(change);
  }

  protected onEventPointerCancel(dom: PointerEvent): void {
    const d = this.drag();
    if (d !== null && d.pointerId === dom.pointerId) {
      this.drag.set(null);
    }
  }

  /**
   * Keyboard move/resize on a focused block (a11y). Enter/Space grabs; Left/Right move
   * by one snap step (Shift = resize the end); Up/Down move across resource lanes; Enter
   * drops (→ `validateChange` → `eventChanged`), Escape cancels.
   */
  protected onEventKeydown(
    ev: PositionedEvent<TMeta>,
    row: ResourceRow<TMeta>,
    dom: KeyboardEvent,
  ): void {
    if (!this.editable() || ev.event.isReadonly === true) {
      return;
    }
    const d = this.drag();
    const grabbing = d !== null && d.pointerId === KEYBOARD_POINTER && d.eventId === ev.event.id;
    const snap = this.snapMinutes() ?? this.config.snapMinutes;

    if (!grabbing) {
      if (dom.key === 'Enter' || dom.key === ' ') {
        dom.preventDefault();
        const startMs = epochOf(ev.event.start);
        const endMs = ev.event.end !== undefined ? epochOf(ev.event.end) : startMs + 3_600_000;
        this.drag.set({
          eventId: ev.event.id,
          kind: 'move',
          originStartMs: startMs,
          originEndMs: endMs,
          originResourceId: row.resource.id,
          targetResourceId: row.resource.id,
          pointerId: KEYBOARD_POINTER,
          startClientX: 0,
          deltaMinutes: 0,
          active: true,
        });
        this.announcement.set(this.a11y.grabbedLabel(ev.event));
      }
      return;
    }

    switch (dom.key) {
      case 'ArrowLeft':
        dom.preventDefault();
        this.nudge(d, dom.shiftKey ? 'resize-end' : 'move', -snap);
        break;
      case 'ArrowRight':
        dom.preventDefault();
        this.nudge(d, dom.shiftKey ? 'resize-end' : 'move', snap);
        break;
      case 'ArrowUp':
        dom.preventDefault();
        this.moveLane(d, -1);
        break;
      case 'ArrowDown':
        dom.preventDefault();
        this.moveLane(d, 1);
        break;
      case 'Enter':
      case ' ':
        dom.preventDefault();
        this.drag.set(null);
        this.announcement.set(
          this.a11y.droppedLabel(ev.event, this.zonedFromMs(d.originStartMs + d.deltaMinutes * 60_000)),
        );
        this.commitDrag(ev.event, d);
        break;
      case 'Escape':
        dom.preventDefault();
        this.drag.set(null);
        this.announcement.set(this.a11y.moveCancelledLabel(ev.event));
        break;
      default:
        break;
    }
  }

  private nudge(d: TimelineDrag, kind: 'move' | 'resize-end', step: number): void {
    const deltaMinutes = d.deltaMinutes + step;
    this.drag.set({ ...d, kind, deltaMinutes });
    if (kind === 'resize-end') {
      this.announcement.set(this.a11y.resizedLabel(this.zonedFromMs(d.originEndMs + deltaMinutes * 60_000)));
    } else {
      this.announcement.set(this.a11y.movedLabel(this.zonedFromMs(d.originStartMs + deltaMinutes * 60_000)));
    }
  }

  private moveLane(d: TimelineDrag, dir: number): void {
    const order = this.laneOrder();
    const idx = order.indexOf(d.targetResourceId);
    const next = order[Math.min(order.length - 1, Math.max(0, idx + dir))];
    if (next !== undefined && next !== d.targetResourceId) {
      this.drag.set({ ...d, targetResourceId: next });
      const name = this.resources().find((r) => r.id === next)?.name ?? next;
      this.announcement.set(`Moved to lane ${name}`);
    }
  }

  private zonedFromMs(epochMs: number): ZonedDateTime {
    return this.adapter.toZoned(new Date(epochMs), this.resolvedZone());
  }

  protected isDragging(ev: PositionedEvent<TMeta>): boolean {
    const d = this.drag();
    return d !== null && d.active && d.eventId === ev.event.id;
  }

  /** Live horizontal offset (px) for the block being dragged, else null. */
  protected dragTransform(ev: PositionedEvent<TMeta>): string | null {
    const d = this.drag();
    if (d === null || !d.active || d.eventId !== ev.event.id) {
      return null;
    }
    const px = d.deltaMinutes * (this.hourWidth() / 60);
    return `translateX(${this.isRtl() ? -px : px}px)`;
  }

  /** Resolve the resource lane under a viewport point (for cross-lane reassignment). */
  private resourceAtPoint(x: number, y: number): string | null {
    if (typeof this.doc.elementFromPoint !== 'function') {
      return null;
    }
    let el: Element | null;
    try {
      el = this.doc.elementFromPoint(x, y);
    } catch {
      return null;
    }
    const lane = el === null ? null : el.closest('.cal-tl__row');
    return lane?.getAttribute('data-resource-id') ?? null;
  }

  private isRtl(): boolean {
    return getComputedStyleSafe(this.host.nativeElement) === 'rtl';
  }

  protected onRowClick(row: ResourceRow<TMeta>, dom: MouseEvent): void {
    const vm = this.viewModel();
    const total = this.adapter.differenceInMinutes(vm.period.end, vm.period.start);
    const target = dom.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const rtl = getComputedStyleSafe(target) === 'rtl';
    const x = rtl ? rect.right - dom.clientX : dom.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, x / Math.max(1, rect.width)));
    const date = this.adapter.addMinutes(vm.period.start, Math.round(frac * total));
    this.slotSelected.emit({ date, resourceId: row.resource.id });
  }

  /** Map a clientX on a lane back to a drop time (RTL-aware). */
  private dropTime(row: ResourceRow<TMeta>, target: HTMLElement, clientX: number): ZonedDateTime {
    const vm = this.viewModel();
    const total = this.adapter.differenceInMinutes(vm.period.end, vm.period.start);
    const rect = target.getBoundingClientRect();
    const rtl = getComputedStyleSafe(target) === 'rtl';
    const x = rtl ? rect.right - clientX : clientX - rect.left;
    const frac = Math.max(0, Math.min(1, x / Math.max(1, rect.width)));
    return this.adapter.addMinutes(vm.period.start, Math.round(frac * total));
  }

  /** Allow a native drag to drop on a lane. */
  protected onLaneDragOver(dom: DragEvent): void {
    dom.preventDefault();
    if (dom.dataTransfer) {
      dom.dataTransfer.dropEffect = 'copy';
    }
  }

  /** Handle an external item dropped onto a lane → resolve (time, resource, payload). */
  protected onExternalDrop(row: ResourceRow<TMeta>, dom: DragEvent): void {
    dom.preventDefault();
    const target = dom.currentTarget as HTMLElement;
    const date = this.dropTime(row, target, dom.clientX);
    const data = dom.dataTransfer?.getData('text/plain') ?? '';
    this.externalDrop.emit({ date, resourceId: row.resource.id, data });
  }

  protected trackRow(_index: number, row: ResourceRow<TMeta>): string {
    return row.resource.id;
  }

  protected trackEvent(_index: number, ev: PositionedEvent<TMeta>): string {
    return ev.event.id;
  }

  protected trackCell(index: number): number {
    return index;
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

function getComputedStyleSafe(el: HTMLElement): string {
  try {
    return getComputedStyle(el).direction;
  } catch {
    return 'ltr';
  }
}
