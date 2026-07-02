import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
} from '@angular/core';
import { RECURRENCE_ADAPTER } from '../../core/recurrence/recurrence-adapter';
import type {
  RecurrenceEnd,
  RecurrenceFreq,
  RecurrenceParts,
} from '../../core/recurrence/recurrence-adapter';

const FREQS: readonly RecurrenceFreq[] = ['daily', 'weekly', 'monthly', 'yearly'];
const WEEKDAYS: readonly { value: number; label: string }[] = [
  { value: 0, label: 'S' },
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
];

const DEFAULT_PARTS: RecurrenceParts = { freq: 'weekly', interval: 1, end: { type: 'never' } };

/**
 * Standalone recurrence editor. Two-way binds an RRULE string via `rule` (signal
 * `model`) and edits it through the injected {@link RECURRENCE_ADAPTER}'s
 * `parse`/`serialize`. Theme-agnostic `--cal-*`, OnPush, fully keyboard-operable.
 * Usable independently of the calendar grid.
 */
@Component({
  selector: 'cal-recurrence-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurrence-editor.html',
  styleUrl: './recurrence-editor.css',
})
export class CalRecurrenceEditor {
  private readonly recurrence = inject(RECURRENCE_ADAPTER);

  /** Two-way bound RRULE string (e.g. `FREQ=WEEKLY;BYDAY=MO`). Empty = no recurrence. */
  readonly rule = model<string>('');
  readonly locale = input<string>('en-US');

  protected readonly freqs = FREQS;
  protected readonly weekdays = WEEKDAYS;

  /** Current parts parsed from the rule (defaults when the rule is empty/invalid). */
  protected readonly parts = computed<RecurrenceParts>(() => {
    const rule = this.rule().trim();
    if (rule === '') {
      return DEFAULT_PARTS;
    }
    try {
      return this.recurrence.parse(rule);
    } catch {
      return DEFAULT_PARTS;
    }
  });

  protected setFreq(event: Event): void {
    const freq = (event.target as HTMLSelectElement).value as RecurrenceFreq;
    this.commit({ ...this.parts(), freq });
  }

  protected setInterval(event: Event): void {
    const n = Math.max(1, Number.parseInt((event.target as HTMLInputElement).value, 10) || 1);
    this.commit({ ...this.parts(), interval: n });
  }

  protected toggleWeekday(day: number): void {
    const current = new Set(this.parts().byWeekday ?? []);
    if (current.has(day)) {
      current.delete(day);
    } else {
      current.add(day);
    }
    this.commit({ ...this.parts(), byWeekday: [...current].sort((a, b) => a - b) });
  }

  protected isWeekdaySelected(day: number): boolean {
    return (this.parts().byWeekday ?? []).includes(day);
  }

  protected setEndType(type: RecurrenceEnd['type']): void {
    let end: RecurrenceEnd;
    if (type === 'count') {
      end = { type: 'count', count: 10 };
    } else if (type === 'until') {
      const now = Date.now();
      end = { type: 'until', until: { epochMs: now + 30 * 86_400_000, zone: 'UTC' } };
    } else {
      end = { type: 'never' };
    }
    this.commit({ ...this.parts(), end });
  }

  protected setCount(event: Event): void {
    const n = Math.max(1, Number.parseInt((event.target as HTMLInputElement).value, 10) || 1);
    this.commit({ ...this.parts(), end: { type: 'count', count: n } });
  }

  protected get endType(): RecurrenceEnd['type'] {
    return this.parts().end.type;
  }

  protected get countValue(): number {
    const end = this.parts().end;
    return end.type === 'count' ? end.count : 10;
  }

  protected get intervalValue(): number {
    return this.parts().interval;
  }

  protected currentFreq(): RecurrenceFreq {
    return this.parts().freq;
  }

  private commit(parts: RecurrenceParts): void {
    this.rule.set(this.recurrence.serialize(parts));
  }
}
