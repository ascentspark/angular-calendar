import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CALENDAR_CONFIG } from '../../core/config/calendar-config';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import type { CalendarSystem, ZonedDateTime } from '../../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../../core/model/calendar-event';
import { buildYearView } from '../../core/view-model/build-year-view';
import type { YearDay } from '../../core/view-model/year-view-model';
import { applyTheme } from '../../theme/apply-theme';
import { CAL_TOKEN_BRIDGE } from '../../core/config/provide-calendar';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';

const FALLBACK_BASE = '#ffffff';
const FALLBACK_ACCENT = '#3b82f6';

/**
 * Standalone year overview: 12 compact mini-month grids with per-day event
 * density, "today" marking, theme-agnostic `--cal-*` styling, ARIA grid
 * semantics, roving-tabindex keyboard navigation, and drill-down to a day.
 */
@Component({
  selector: 'cal-year-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './year-view.html',
  styleUrl: './year-view.css',
})
export class CalYearView<TMeta = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
  private readonly tokenBridge = inject(CAL_TOKEN_BRIDGE, { optional: true });
  readonly a11y = inject(CalCalendarA11y);

  readonly events = input.required<readonly CalendarEvent<TMeta>[]>();
  readonly viewDate = input.required<Date | ZonedDateTime>();
  readonly today = input<Date | ZonedDateTime | null>(null);
  readonly weekStartsOn = input<number | null>(null);
  readonly timezone = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly calendarSystem = input<CalendarSystem | null>(null);

  readonly baseColor = input<string>(FALLBACK_BASE);
  readonly accentColor = input<string>(FALLBACK_ACCENT);
  readonly themeMode = input<CalThemeMode>('light');
  readonly statusColors = input<Record<string, string>>({});

  readonly daySelected = output<{ date: ZonedDateTime }>();
  readonly monthSelected = output<{ date: ZonedDateTime }>();

  readonly focusedEpoch = signal<number | null>(null);

  private readonly resolvedLocale = computed(() => this.locale() ?? this.config.locale);
  private readonly resolvedSystem = computed(
    () => this.calendarSystem() ?? this.config.calendarSystem,
  );
  private readonly resolvedZone = computed(
    () => this.timezone() ?? this.config.timezone ?? hostZone(),
  );

  protected readonly viewModel = computed(() => {
    const zone = this.resolvedZone();
    const todayValue = this.today();
    return buildYearView<TMeta>(this.adapter, {
      viewDate: this.adapter.toZoned(this.viewDate(), zone),
      events: this.events(),
      weekStartsOn: this.weekStartsOn() ?? this.config.weekStartsOn,
      locale: this.resolvedLocale(),
      calendarSystem: this.resolvedSystem(),
      ...(todayValue !== null ? { today: this.adapter.toZoned(todayValue, zone) } : {}),
    });
  });

  /** Weekday initials for the mini-month header row. */
  protected readonly weekdayInitials = computed(() => {
    const month = this.viewModel().months[0];
    if (month === undefined) {
      return [];
    }
    const locale = this.resolvedLocale();
    const system = this.resolvedSystem();
    return month.days.slice(0, 7).map((d) => this.adapter.format(d.date, 'EEEEE', locale, system));
  });

  /** In-month day cells across the whole year, in reading order (keyboard nav). */
  protected readonly navDays = computed(() =>
    this.viewModel().months.flatMap((m) => m.days.filter((d) => d.inMonth)),
  );

  protected readonly effectiveFocus = computed(() => {
    const days = this.navDays();
    const explicit = this.focusedEpoch();
    if (explicit !== null && days.some((d) => d.date.epochMs === explicit)) {
      return explicit;
    }
    const today = days.find((d) => d.isToday);
    return today?.date.epochMs ?? days[0]?.date.epochMs ?? null;
  });

  private readonly theme = computed(() => {
    try {
      return deriveTheme(this.baseColor(), this.accentColor(), this.themeMode(), this.statusColors());
    } catch {
      return deriveTheme(FALLBACK_BASE, FALLBACK_ACCENT, this.themeMode(), this.statusColors());
    }
  });

  constructor() {
    effect(() => applyTheme(this.host.nativeElement, this.theme(), this.tokenBridge));
  }

  protected dayNumber(day: YearDay): string {
    return this.adapter.format(day.date, 'd', this.resolvedLocale(), this.resolvedSystem());
  }

  /** Chunk a mini-month's flat day list into calendar weeks (rows of 7) so each
   *  week can be a proper ARIA `row` of day gridcells. */
  protected weeksOf(days: readonly YearDay[]): readonly (readonly YearDay[])[] {
    const weeks: YearDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      // Skip a trailing week that lies entirely outside the month — an all-blank
      // ARIA row would have no perceivable cell children.
      if (week.some((d) => d.inMonth)) {
        weeks.push(week);
      }
    }
    return weeks;
  }

  protected dayLabel(day: YearDay): string {
    const base = this.a11y.dayLabel(day.date);
    if (day.eventCount === 0) {
      return base;
    }
    const noun = day.eventCount === 1 ? 'event' : 'events';
    return `${base}, ${day.eventCount} ${noun}`;
  }

  /** Density bucket 0–4 for heat styling. */
  protected density(day: YearDay): number {
    const c = day.eventCount;
    return c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : c <= 6 ? 3 : 4;
  }

  protected isFocusTarget(day: YearDay): boolean {
    return this.effectiveFocus() === day.date.epochMs;
  }

  protected onDayClick(day: YearDay): void {
    this.focusedEpoch.set(day.date.epochMs);
    this.daySelected.emit({ date: day.date });
  }

  protected onMonthClick(monthIndex: number): void {
    const month = this.viewModel().months[monthIndex];
    const firstIn = month?.days.find((d) => d.inMonth);
    if (firstIn !== undefined) {
      this.monthSelected.emit({ date: firstIn.date });
    }
  }

  protected onGridKeydown(dom: KeyboardEvent): void {
    const days = this.navDays();
    const current = days.findIndex((d) => d.date.epochMs === this.effectiveFocus());
    if (current === -1) {
      return;
    }
    const rtl = this.isRtl();
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
        target = 0;
        break;
      case 'End':
        target = days.length - 1;
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
      this.host.nativeElement
        .querySelector<HTMLElement>(`[data-epoch="${next.date.epochMs}"]`)
        ?.focus();
    }
  }

  private isRtl(): boolean {
    try {
      return getComputedStyle(this.host.nativeElement).direction === 'rtl';
    } catch {
      return false;
    }
  }

  protected trackMonth(index: number): number {
    return index;
  }

  protected trackDay(_index: number, day: YearDay): number {
    return day.date.epochMs;
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
