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
import { buildMonthView } from '../../core/view-model/build-month-view';
import type { MonthDay } from '../../core/view-model/month-view-model';
import type { PositionedChip } from '../../core/view-model/positioned-chip';
import { applyTheme } from '../../theme/apply-theme';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';
import { CalCellTemplate } from '../../directives/cal-cell-template';
import { CalEventTemplate } from '../../directives/cal-event-template';
import { CalOverflowTemplate } from '../../directives/cal-overflow-template';

const FALLBACK_BASE = '#ffffff';
const FALLBACK_ACCENT = '#3b82f6';

/**
 * Standalone month grid. Renders the pure {@link buildMonthView} view-model with
 * theme-agnostic `--cal-*` styling, ARIA `grid` semantics, multi-day spanning
 * chips, status colours, and "+N more" overflow. All date math is delegated to
 * the injected {@link DATE_ADAPTER}; the component holds no layout logic.
 */
@Component({
  selector: 'cal-month-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './month-view.html',
  styleUrl: './month-view.css',
})
export class CalMonthView<TMeta = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
  readonly a11y = inject(CalCalendarA11y);

  // ── data inputs ─────────────────────────────────────────────────────────
  readonly events = input.required<readonly CalendarEvent<TMeta>[]>();
  readonly viewDate = input.required<Date | ZonedDateTime>();
  readonly today = input<Date | ZonedDateTime | null>(null);
  readonly weekStartsOn = input<number | null>(null);
  readonly maxLanes = input<number | null>(null);
  readonly weekendDays = input<readonly number[] | null>(null);
  readonly timezone = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly calendarSystem = input<CalendarSystem | null>(null);

  // ── theming inputs ──────────────────────────────────────────────────────
  readonly baseColor = input<string>(FALLBACK_BASE);
  readonly accentColor = input<string>(FALLBACK_ACCENT);
  readonly themeMode = input<CalThemeMode>('light');
  readonly statusColors = input<Record<string, string>>({});

  // ── outputs ─────────────────────────────────────────────────────────────
  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();
  readonly daySelected = output<{ date: ZonedDateTime }>();
  readonly viewPeriodChanged = output<{ start: ZonedDateTime; end: ZonedDateTime; zone: string }>();

  // ── consumer template overrides ─────────────────────────────────────────
  readonly cellTemplate = contentChild(CalCellTemplate);
  readonly eventTemplate = contentChild(CalEventTemplate);
  readonly overflowTemplate = contentChild(CalOverflowTemplate);

  /** The selected day (epoch of start-of-day), for highlight. */
  readonly selectedEpoch = signal<number | null>(null);
  /** The day currently holding roving focus (tabindex 0); null ⇒ use the default. */
  readonly focusedEpoch = signal<number | null>(null);

  /** Flattened day cells in reading order (for keyboard navigation). */
  protected readonly flatDays = computed(() => this.viewModel().weeks.flatMap((w) => w.days));

  /** The effective roving-focus target: explicit focus, else today, else first in-month. */
  readonly effectiveFocus = computed(() => {
    const days = this.flatDays();
    const explicit = this.focusedEpoch();
    if (explicit !== null && days.some((d) => d.date.epochMs === explicit)) {
      return explicit;
    }
    const today = days.find((d) => d.isToday);
    if (today !== undefined) {
      return today.date.epochMs;
    }
    const firstIn = days.find((d) => d.inMonth) ?? days[0];
    return firstIn?.date.epochMs ?? null;
  });

  protected readonly resolvedLocale = computed(() => this.locale() ?? this.config.locale);
  protected readonly resolvedSystem = computed(
    () => this.calendarSystem() ?? this.config.calendarSystem,
  );
  private readonly resolvedZone = computed(
    () => this.timezone() ?? this.config.timezone ?? hostZone(),
  );

  protected readonly viewModel = computed(() => {
    const zone = this.resolvedZone();
    const viewDate = this.adapter.toZoned(this.viewDate(), zone);
    const todayValue = this.today();
    const weekend = this.weekendDays();
    const lanes = this.maxLanes();
    return buildMonthView<TMeta>(this.adapter, {
      viewDate,
      events: this.events(),
      weekStartsOn: this.weekStartsOn() ?? this.config.weekStartsOn,
      ...(todayValue !== null ? { today: this.adapter.toZoned(todayValue, zone) } : {}),
      ...(lanes !== null ? { maxLanes: lanes } : {}),
      ...(weekend !== null ? { weekendDays: weekend } : {}),
    });
  });

  /** Weekday header labels (short) in the configured locale + calendar system. */
  protected readonly weekdayLabels = computed(() => {
    const week = this.viewModel().weeks[0];
    if (week === undefined) {
      return [];
    }
    const locale = this.resolvedLocale();
    const system = this.resolvedSystem();
    return week.days.map((day) => ({
      short: this.adapter.format(day.date, 'EEE', locale, system),
      narrow: this.adapter.format(day.date, 'EEEEE', locale, system),
    }));
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
    effect(() => {
      const period = this.viewModel().period;
      this.viewPeriodChanged.emit(period);
    });
  }

  /** Day-of-month number for a cell, in the active calendar system. */
  protected dayNumber(day: MonthDay<TMeta>): string {
    return this.adapter.format(day.date, 'd', this.resolvedLocale(), this.resolvedSystem());
  }

  protected dayLabel(day: MonthDay<TMeta>): string {
    return this.a11y.dayLabel(day.date);
  }

  protected eventLabel(event: CalendarEvent<TMeta>): string {
    return this.a11y.eventLabel(event);
  }

  protected moreLabel(count: number): string {
    return this.a11y.moreLabel(count);
  }

  /**
   * Inline style for a chip: status-tinted background + guaranteed-contrast
   * on-colour, positioned absolutely so a multi-day span overflows rightward
   * across sibling cells while staying logically inside its start gridcell.
   */
  protected chipStyle(chip: PositionedChip<TMeta>): Record<string, string> {
    const status = chip.event.status;
    const key = status !== undefined ? sanitizeStatusKey(status) : '';
    const bg =
      key !== ''
        ? `var(--cal-event-${key}-soft, var(--cal-accent-soft))`
        : 'var(--cal-accent-soft)';
    const fg =
      key !== ''
        ? `var(--cal-event-${key}-soft-ink, var(--cal-accent-soft-ink))`
        : 'var(--cal-accent-soft-ink)';
    return {
      top: `calc(var(--cal-day-head) + ${chip.lane} * var(--cal-chip-row))`,
      left: '1px',
      width: `calc(${chip.span} * 100% - 2px)`,
      background: bg,
      color: fg,
    };
  }

  /** Lane rows to reserve in a week (max visible lane + an overflow row if any). */
  protected weekLanes(week: { days: readonly MonthDay<TMeta>[] }): number {
    let maxLane = -1;
    let hasOverflow = false;
    for (const day of week.days) {
      for (const chip of day.events) {
        if (chip.lane > maxLane) {
          maxLane = chip.lane;
        }
      }
      if (day.overflowCount > 0) {
        hasOverflow = true;
      }
    }
    return maxLane + 1 + (hasOverflow ? 1 : 0);
  }

  protected isSelected(day: MonthDay<TMeta>): boolean {
    return this.selectedEpoch() === day.date.epochMs;
  }

  protected isFocusTarget(day: MonthDay<TMeta>): boolean {
    return this.effectiveFocus() === day.date.epochMs;
  }

  /** Roving-tabindex keyboard navigation over the day grid (RTL-aware). */
  protected onGridKeydown(dom: KeyboardEvent): void {
    const days = this.flatDays();
    const current = days.findIndex((d) => d.date.epochMs === this.effectiveFocus());
    if (current === -1) {
      return;
    }
    const rtl = this.isRtl();
    const col = current % 7;
    let target = current;
    let select = false;

    switch (dom.key) {
      case 'ArrowRight':
        target = current + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        target = current + (rtl ? 1 : -1);
        break;
      case 'ArrowDown':
        target = current + 7;
        break;
      case 'ArrowUp':
        target = current - 7;
        break;
      case 'Home':
        target = current - col;
        break;
      case 'End':
        target = current + (6 - col);
        break;
      case 'Enter':
      case ' ':
        select = true;
        break;
      default:
        return;
    }

    dom.preventDefault();
    if (select) {
      const day = days[current];
      if (day !== undefined) {
        this.onDayClick(day);
      }
      return;
    }
    if (target < 0 || target >= days.length) {
      return;
    }
    const next = days[target];
    if (next !== undefined) {
      this.focusedEpoch.set(next.date.epochMs);
      this.focusCell(next.date.epochMs);
    }
  }

  private isRtl(): boolean {
    try {
      return getComputedStyle(this.host.nativeElement).direction === 'rtl';
    } catch {
      return false;
    }
  }

  private focusCell(epoch: number): void {
    const cell = this.host.nativeElement.querySelector<HTMLElement>(`[data-epoch="${epoch}"]`);
    cell?.focus();
  }

  protected onEventClick(event: CalendarEvent<TMeta>, dom: Event): void {
    dom.stopPropagation();
    this.eventClicked.emit({ event });
  }

  protected onDayClick(day: MonthDay<TMeta>): void {
    this.selectedEpoch.set(day.date.epochMs);
    this.daySelected.emit({ date: day.date });
  }

  protected trackWeek(index: number): number {
    return index;
  }

  protected trackDay(_index: number, day: MonthDay<TMeta>): number {
    return day.date.epochMs;
  }

  protected trackChip(_index: number, chip: PositionedChip<TMeta>): string {
    return `${chip.event.id}:${chip.startColumn}`;
  }
}

/** Resolve the host timezone, SSR-safe (falls back to UTC off the browser). */
function hostZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && tz.length > 0 ? tz : 'UTC';
  } catch {
    return 'UTC';
  }
}
