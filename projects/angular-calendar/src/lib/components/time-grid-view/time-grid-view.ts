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
import type { TimeAxisOrientation } from '../../core/model/view';
import { buildTimeGridView } from '../../core/view-model/build-time-grid-view';
import type { PositionedChip } from '../../core/view-model/positioned-chip';
import type { PositionedEvent } from '../../core/view-model/positioned-event';
import type { TimeColumn } from '../../core/view-model/time-grid-view-model';
import { applyTheme } from '../../theme/apply-theme';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';
import { CalEventTemplate } from '../../directives/cal-event-template';

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
  readonly a11y = inject(CalCalendarA11y);

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

  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();
  readonly slotSelected = output<{ date: ZonedDateTime; minutes: number }>();

  readonly eventTemplate = contentChild(CalEventTemplate);

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
    return buildTimeGridView<TMeta>(this.adapter, {
      viewDate: this.adapter.toZoned(this.viewDate(), zone),
      events: this.events(),
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
    });
  });

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
  }

  protected eventLabel(event: CalendarEvent<TMeta>): string {
    return this.a11y.eventLabel(event);
  }

  /** Inline geometry for a timed event (time axis + cross-axis lane), status-tinted. */
  protected eventStyle(ev: PositionedEvent<TMeta>): Record<string, string> {
    const key = ev.event.status !== undefined ? sanitizeStatusKey(ev.event.status) : '';
    const bg = key !== '' ? `var(--cal-event-${key}, var(--cal-accent))` : 'var(--cal-accent)';
    const fg = key !== '' ? `var(--cal-event-${key}-ink, var(--cal-accent-ink))` : 'var(--cal-accent-ink)';
    const widthPct = (ev.columnSpan / ev.laneCount) * 100;
    const leftPct = (ev.lane / ev.laneCount) * 100;
    return {
      '--ev-start': `${ev.startOffset * 100}%`,
      '--ev-size': `${ev.span * 100}%`,
      '--ev-cross-start': `${leftPct}%`,
      '--ev-cross-size': `${widthPct}%`,
      background: bg,
      color: fg,
    };
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

  protected onColumnClick(column: TimeColumn<TMeta>, dom: MouseEvent): void {
    // Map the click position along the time axis back to a minute, then snap.
    const vm = this.viewModel();
    const total = vm.dayEndMinutes - vm.dayStartMinutes;
    const rect = (dom.currentTarget as HTMLElement).getBoundingClientRect();
    const frac =
      vm.orientation === 'vertical'
        ? (dom.clientY - rect.top) / Math.max(1, rect.height)
        : (dom.clientX - rect.left) / Math.max(1, rect.width);
    const minutes = vm.dayStartMinutes + Math.max(0, Math.min(1, frac)) * total;
    const date = this.adapter.addMinutes(column.date, Math.round(minutes));
    this.slotSelected.emit({ date, minutes: Math.round(minutes) });
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
