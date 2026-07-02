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
import { CALENDAR_CONFIG, resolveTimeFormat } from '../../core/config/calendar-config';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import type { CalendarSystem, ZonedDateTime } from '../../core/date-adapter/zoned-date-time';
import type { CalendarEvent } from '../../core/model/calendar-event';
import { buildAgendaView } from '../../core/view-model/build-agenda-view';
import type { AgendaDay } from '../../core/view-model/agenda-view-model';
import { RECURRENCE_ADAPTER } from '../../core/recurrence/recurrence-adapter';
import { expandRecurringEvents } from '../../core/recurrence/expand-recurring-events';
import { applyTheme } from '../../theme/apply-theme';
import { CAL_TOKEN_BRIDGE } from '../../core/config/provide-calendar';
import { deriveTheme, type CalThemeMode } from '../../theme/derive-theme';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalCalendarA11y } from '../../a11y/cal-calendar-a11y';
import { CalCalendarIntl } from '../../i18n/cal-calendar-intl';

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
  private readonly tokenBridge = inject(CAL_TOKEN_BRIDGE, { optional: true });
  private readonly recurrence = inject(RECURRENCE_ADAPTER, { optional: true });
  readonly a11y = inject(CalCalendarA11y);
  readonly intl = inject(CalCalendarIntl);

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
  /** Optional hex override for on-accent text (`--cal-accent-ink`); null = auto. */
  readonly accentInk = input<string | null>(null);

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
    const viewDate = this.adapter.toZoned(this.viewDate(), zone);
    const days = this.days();
    return buildAgendaView<TMeta>(this.adapter, {
      viewDate,
      events: this.expandedEvents(zone, viewDate, days),
      days,
      hideEmptyDays: this.hideEmptyDays(),
      ...(todayValue !== null ? { today: this.adapter.toZoned(todayValue, zone) } : {}),
    });
  });

  /** Expand recurring events into the agenda window when a recurrence adapter is present. */
  private expandedEvents(
    zone: string,
    viewDate: ZonedDateTime,
    days: number,
  ): readonly CalendarEvent<TMeta>[] {
    const raw = this.events();
    if (this.recurrence === null || !raw.some((e) => e.recurrenceRule !== undefined)) {
      return raw;
    }
    const probe = buildAgendaView<TMeta>(this.adapter, { viewDate, events: [], days });
    return expandRecurringEvents<TMeta>(raw, {
      recurrence: this.recurrence,
      dates: this.adapter,
      windowStart: probe.period.start,
      windowEnd: probe.period.end,
      zone,
    });
  }

  private readonly theme = computed(() => {
    try {
      return deriveTheme(this.baseColor(), this.accentColor(), this.themeMode(), this.statusColors(), this.accentInk());
    } catch {
      return deriveTheme(FALLBACK_BASE, FALLBACK_ACCENT, this.themeMode(), this.statusColors());
    }
  });

  constructor() {
    effect(() => applyTheme(this.host.nativeElement, this.theme(), this.tokenBridge));
  }

  protected dayHeading(day: AgendaDay<TMeta>): string {
    return this.adapter.format(day.date, 'full-date', this.resolvedLocale(), this.resolvedSystem());
  }

  protected timeLabel(event: CalendarEvent<TMeta>): string {
    if (event.allDay === true) {
      return this.intl.allDay;
    }
    const zone = this.resolvedZone();
    const start = this.adapter.toZoned(event.start, zone);
    const startLabel = this.adapter.format(start, resolveTimeFormat(this.config.hour12), this.resolvedLocale());
    if (event.end === undefined) {
      return startLabel;
    }
    const end = this.adapter.toZoned(event.end, zone);
    return `${startLabel} – ${this.adapter.format(end, resolveTimeFormat(this.config.hour12), this.resolvedLocale())}`;
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
