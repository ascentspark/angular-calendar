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
import { CALENDAR_CONFIG } from '../../core/config/calendar-config';
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
import { CAL_TOKEN_BRIDGE } from '../../core/config/provide-calendar';
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

/** In-flight pointer gesture moving a timeline block along time / across lanes. */
interface TimelineDrag {
  readonly eventId: string;
  readonly originStartMs: number;
  readonly originEndMs: number;
  readonly originResourceId: string;
  readonly pointerId: number;
  readonly startClientX: number;
  readonly deltaMinutes: number;
  readonly active: boolean;
}

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

  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();
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

  // ── Row virtualization ──────────────────────────────────────────────────────
  /** Below this many resource rows, render everything (windowing overhead isn't worth it). */
  private static readonly VIRTUAL_THRESHOLD = 40;
  /** Extra pixels rendered above/below the viewport to avoid blank flashes on scroll. */
  private static readonly OVERSCAN_PX = 400;

  private readonly destroyRef = inject(DestroyRef);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);

  /** The slice of resource rows to render, plus the spacer heights that preserve scroll height. */
  protected readonly rowWindow = computed<VirtualWindow>(() => {
    const rows = this.viewModel().resourceRows;
    const vh = this.viewportHeight();
    // Until measured, or for modest lists, render all rows (identical to the un-virtualized layout).
    if (rows.length <= CalTimelineView.VIRTUAL_THRESHOLD || vh <= 0) {
      return { start: 0, end: rows.length, padTop: 0, padBottom: 0 };
    }
    const laneH = this.laneHeight();
    const heights = rows.map((r) => r.laneCount * laneH);
    return computeRowWindow(heights, this.scrollTop(), vh, CalTimelineView.OVERSCAN_PX);
  });

  /** The resource rows currently in (or near) the viewport. */
  protected readonly visibleRows = computed(() => {
    const w = this.rowWindow();
    return this.viewModel().resourceRows.slice(w.start, w.end);
  });

  protected onScroll(target: EventTarget | null): void {
    if (target instanceof HTMLElement) {
      this.scrollTop.set(target.scrollTop);
    }
  }

  constructor() {
    effect(() => applyTheme(this.host.nativeElement, this.theme(), this.tokenBridge));

    // Track the scroll viewport's height (browser-only) so windowing knows how much to render.
    afterNextRender(() => {
      const el = this.scroller()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        return;
      }
      this.viewportHeight.set(el.clientHeight);
      const observer = new ResizeObserver(() => this.viewportHeight.set(el.clientHeight));
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
    const start = this.adapter.format(this.adapter.toZoned(event.start, zone), 'h:mm a', locale);
    if (event.end === undefined) {
      return `${title} · ${start}`.trim();
    }
    const end = this.adapter.format(this.adapter.toZoned(event.end, zone), 'h:mm a', locale);
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
      originStartMs: startMs,
      originEndMs: endMs,
      originResourceId: row.resource.id,
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
    const zone = this.resolvedZone();
    const deltaMs = d.deltaMinutes * 60_000;
    const targetResource = this.resourceAtPoint(dom.clientX, dom.clientY) ?? d.originResourceId;
    if (deltaMs === 0 && targetResource === d.originResourceId) {
      return; // no net change
    }
    const change: EventChange<TMeta> = {
      kind: 'move',
      event: ev.event,
      start: this.adapter.toZoned(new Date(d.originStartMs + deltaMs), zone),
      end: this.adapter.toZoned(new Date(d.originEndMs + deltaMs), zone),
      resourceId: targetResource,
    };
    this.eventChanged.emit(change);
  }

  protected onEventPointerCancel(dom: PointerEvent): void {
    const d = this.drag();
    if (d !== null && d.pointerId === dom.pointerId) {
      this.drag.set(null);
    }
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
