import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { CALENDAR_CONFIG } from '../../core/config/calendar-config';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import type { CalendarSystem, ZonedDateTime } from '../../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../../core/model/calendar-event';
import { buildAgendaView } from '../../core/view-model/build-agenda-view';
import type { AgendaDay } from '../../core/view-model/agenda-view-model';
import { applyTheme } from '../../theme/apply-theme';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';

const FALLBACK_BASE = '#ffffff';
const FALLBACK_ACCENT = '#3b82f6';

/**
 * Agenda (list) view: events grouped under day headings, all-day first then by
 * start. Theme-agnostic `--cal-*`, OnPush, list ARIA semantics, date math via the
 * adapter. The most compact, mobile-friendly view (and the narrow-width fallback).
 */
@Component({
  selector: 'cal-agenda-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-view.html',
  styleUrl: './agenda-view.css',
})
export class CalAgendaView<TMeta = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
  readonly a11y = inject(CalCalendarA11y);

  readonly events = input.required<readonly CalendarEvent<TMeta>[]>();
  readonly viewDate = input.required<Date | ZonedDateTime>();
  readonly days = input<number>(7);
  readonly today = input<Date | ZonedDateTime | null>(null);
  readonly hideEmptyDays = input<boolean>(false);
  readonly timezone = input<string | null>(null);
  readonly locale = input<string | null>(null);
  readonly calendarSystem = input<CalendarSystem | null>(null);

  readonly baseColor = input<string>(FALLBACK_BASE);
  readonly accentColor = input<string>(FALLBACK_ACCENT);
  readonly themeMode = input<CalThemeMode>('light');
  readonly statusColors = input<Record<string, string>>({});

  readonly eventClicked = output<{ event: CalendarEvent<TMeta> }>();

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
    return buildAgendaView<TMeta>(this.adapter, {
      viewDate: this.adapter.toZoned(this.viewDate(), zone),
      events: this.events(),
      days: this.days(),
      hideEmptyDays: this.hideEmptyDays(),
      ...(todayValue !== null ? { today: this.adapter.toZoned(todayValue, zone) } : {}),
    });
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

  protected dayHeading(day: AgendaDay<TMeta>): string {
    return this.adapter.format(day.date, 'full-date', this.resolvedLocale(), this.resolvedSystem());
  }

  protected timeLabel(event: CalendarEvent<TMeta>): string {
    if (event.allDay === true) {
      return 'All day';
    }
    const zone = this.resolvedZone();
    const start = this.adapter.toZoned(event.start, zone);
    const startLabel = this.adapter.format(start, 'h:mm a', this.resolvedLocale());
    if (event.end === undefined) {
      return startLabel;
    }
    const end = this.adapter.toZoned(event.end, zone);
    return `${startLabel} – ${this.adapter.format(end, 'h:mm a', this.resolvedLocale())}`;
  }

  protected eventLabel(event: CalendarEvent<TMeta>): string {
    return `${this.timeLabel(event)}, ${this.a11y.eventLabel(event)}`;
  }

  protected dotStyle(event: CalendarEvent<TMeta>): Record<string, string> {
    const key = event.status !== undefined ? sanitizeStatusKey(event.status) : '';
    const bg = key !== '' ? `var(--cal-event-${key}, var(--cal-accent))` : 'var(--cal-accent)';
    return { background: bg };
  }

  protected onEventClick(event: CalendarEvent<TMeta>): void {
    this.eventClicked.emit({ event });
  }

  protected trackDay(_index: number, day: AgendaDay<TMeta>): number {
    return day.date.epochMs;
  }

  protected trackEvent(_index: number, event: CalendarEvent<TMeta>): string {
    return event.id;
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
