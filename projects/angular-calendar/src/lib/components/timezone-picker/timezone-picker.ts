import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/** A small, sensible default IANA zone list when the host supplies none. */
const DEFAULT_ZONES: readonly string[] = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

/**
 * Standalone timezone picker. Two-way binds the selected IANA zone via `value`
 * (signal `model`). The list is the host-supplied `zones` (e.g. the calendar's
 * `timezonePickerZones`) or a sensible default. Each option shows the zone's
 * current GMT offset so a dispatcher can pick the right region quickly.
 */
@Component({
  selector: 'cal-timezone-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="cal-tzp">
      <span class="cal-tzp__label">{{ label() }}</span>
      <select
        class="cal-tzp__select"
        [attr.aria-label]="label()"
        (change)="onChange($any($event.target).value)"
      >
        @for (z of options(); track z.id) {
          <option [value]="z.id" [selected]="z.id === value()">{{ z.label }}</option>
        }
      </select>
    </label>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        color: var(--cal-ink, inherit);
        font-family: inherit;
      }
      .cal-tzp {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.82rem;
      }
      .cal-tzp__label {
        color: var(--cal-ink-muted);
      }
      .cal-tzp__select {
        font: inherit;
        font-size: 0.82rem;
        padding: 0.25rem 0.4rem;
        border: 1px solid var(--cal-line-strong, currentColor);
        border-radius: var(--cal-radius-sm, 6px);
        background: var(--cal-bg, transparent);
        color: var(--cal-ink, inherit);
      }
      .cal-tzp__select:focus-visible {
        outline: 2px solid var(--cal-ring);
      }
    `,
  ],
})
export class CalTimezonePicker {
  /** Selected IANA zone (two-way). */
  readonly value = model<string>('UTC');
  /** Restrict/order the offered zones; falls back to a default list. */
  readonly zones = input<readonly string[] | null>(null);
  readonly locale = input<string>('en-US');
  readonly label = input<string>('Time zone');

  protected readonly options = computed(() => {
    const list = this.zones() ?? DEFAULT_ZONES;
    const locale = this.locale();
    return list.map((id) => ({ id, label: `${id.replace(/_/g, ' ')} (${offsetLabel(id, locale)})` }));
  });

  protected onChange(zone: string): void {
    this.value.set(zone);
  }
}

/** Current GMT offset label for an IANA zone, e.g. "GMT-4". */
function offsetLabel(zone: string, locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}
