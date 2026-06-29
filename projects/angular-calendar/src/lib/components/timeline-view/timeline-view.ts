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
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CALENDAR_CONFIG } from '../../core/config/calendar-config';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import type { CalendarSystem, ZonedDateTime } from '../../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../../core/model/calendar-event';
import type { CalendarResource } from '../../core/model/calendar-resource';
import { buildTimelineView } from '../../core/view-model/build-timeline-view';
import type { TimeHeaderUnit, ResourceRow } from '../../core/view-model/timeline-view-model';
import { RECURRENCE_ADAPTER } from '../../core/recurrence/recurrence-adapter';
import { expandRecurringEvents } from '../../core/recurrence/expand-recurring-events';
import type { PositionedEvent, ShadeBand } from '../../core/view-model/positioned-event';
import { applyTheme } from '../../theme/apply-theme';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';
import { CalCalendarIntl } from '../../i18n/cal-calendar-intl';
import { CalEventTemplate } from '../../directives/cal-event-template';
import { CalResourceHeaderTemplate } from '../../directives/cal-resource-header-template';

const FALLBACK_BASE = '#ffffff';
const FALLBACK_ACCENT = '#3b82f6';

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
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
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

  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();
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
      return deriveTheme(this.baseColor(), this.accentColor(), this.themeMode(), this.statusColors());
    } catch {
      return deriveTheme(FALLBACK_BASE, FALLBACK_ACCENT, this.themeMode(), this.statusColors());
    }
  });

  constructor() {
    effect(() => applyTheme(this.host.nativeElement, this.theme()));
  }

  protected eventLabel(event: CalendarEvent<TMeta>): string {
    return this.a11y.eventLabel(event);
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

  protected onEventClick(event: CalendarEvent<TMeta>, dom: Event): void {
    dom.stopPropagation();
    this.eventClicked.emit({ event });
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
