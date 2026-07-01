import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  contentChild,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DATE_ADAPTER } from '../../core/date-adapter/date-adapter';
import { CALENDAR_CONFIG } from '../../core/config/calendar-config';
import { CalCalendarIntl } from '../../i18n/cal-calendar-intl';
import type { CalendarEvent } from '../../core/model/calendar-event';
import type { CalendarResource } from '../../core/model/calendar-resource';
import type { CalendarSystem } from '../../core/date-adapter/zoned-date-time';
import { sanitizeStatusKey } from '../../theme/tokens';
import { CalEventDetailTemplate } from '../../directives/cal-event-detail-template';

/**
 * Accessible, theme-agnostic event-detail dialog. Bind `event` to open it; emit
 * `closed` to dismiss. Renders a sensible default body (title, status, date, time
 * range, resources, "repeats") — or a host-supplied `*calEventDetail` template for
 * full customization (the "provide a default, allow override" pattern).
 *
 * Dependency-free (no CDK): `role="dialog"` + `aria-modal`, focus moves into the
 * dialog on open, `Esc` / backdrop dismiss, SSR-safe.
 */
@Component({
  selector: 'cal-event-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './event-dialog.html',
  styleUrl: './event-dialog.css',
})
export class CalEventDialog<TMeta = unknown> {
  private readonly adapter = inject(DATE_ADAPTER);
  private readonly config = inject(CALENDAR_CONFIG);
  readonly intl = inject(CalCalendarIntl);

  /** The event to show. `null` keeps the dialog closed. */
  readonly event = input<CalendarEvent<TMeta> | null>(null);
  /** Resources, used to resolve `resourceIds` to readable names in the default body. */
  readonly resources = input<readonly CalendarResource<TMeta>[]>([]);
  readonly locale = input<string | null>(null);
  readonly timezone = input<string | null>(null);
  readonly calendarSystem = input<CalendarSystem | null>(null);

  readonly closed = output<void>();

  readonly detailTemplate = contentChild(CalEventDetailTemplate);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  constructor() {
    // Move focus into the dialog when it opens (a11y).
    effect(() => {
      if (this.event() !== null) {
        this.panel()?.nativeElement.focus();
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  /** Bound `close` for the custom template context. */
  protected readonly closeFn = (): void => this.close();

  private zone(): string {
    return this.timezone() ?? this.config.timezone ?? hostZone();
  }
  private resolvedLocale(): string {
    return this.locale() ?? this.config.locale;
  }
  private system(): CalendarSystem {
    return this.calendarSystem() ?? this.config.calendarSystem;
  }

  protected dateLabel(ev: CalendarEvent<TMeta>): string {
    return this.adapter.format(
      this.adapter.toZoned(ev.start, this.zone()),
      'full-date',
      this.resolvedLocale(),
      this.system(),
    );
  }

  protected timeLabel(ev: CalendarEvent<TMeta>): string {
    if (ev.allDay === true) {
      return this.intl.allDay;
    }
    const zone = this.zone();
    const locale = this.resolvedLocale();
    const start = this.adapter.format(this.adapter.toZoned(ev.start, zone), 'h:mm a', locale);
    if (ev.end === undefined) {
      return start;
    }
    const end = this.adapter.format(this.adapter.toZoned(ev.end, zone), 'h:mm a', locale);
    return `${start} – ${end}`;
  }

  protected statusColor(ev: CalendarEvent<TMeta>): string {
    if (ev.status === undefined) {
      return 'var(--cal-accent)';
    }
    return `var(--cal-event-${sanitizeStatusKey(ev.status)}, var(--cal-accent))`;
  }

  /** Ink proven AA against the status colour (so badge text stays legible). */
  protected statusInk(ev: CalendarEvent<TMeta>): string {
    if (ev.status === undefined) {
      return 'var(--cal-accent-ink)';
    }
    return `var(--cal-event-${sanitizeStatusKey(ev.status)}-ink, var(--cal-accent-ink))`;
  }

  protected resourceNames(ev: CalendarEvent<TMeta>): string {
    const ids = ev.resourceIds ?? [];
    if (ids.length === 0) {
      return '';
    }
    const byId = new Map(this.resources().map((r) => [r.id, r.name]));
    return ids.map((id) => byId.get(id) ?? id).join(', ');
  }

  protected isRecurring(ev: CalendarEvent<TMeta>): boolean {
    return ev.recurrenceRule !== undefined || ev.recurrenceId !== undefined;
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
