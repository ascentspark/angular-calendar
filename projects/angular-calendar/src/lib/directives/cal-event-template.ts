import { Directive, inject, TemplateRef } from '@angular/core';
import type { CalendarEvent } from '../core/model/calendar-event';
import type { PositionedChip } from '../core/view-model/positioned-chip';

/**
 * Context passed to a consumer's `*calEventTemplate`. `$implicit` is always the
 * event; `chip` is provided in month / all-day contexts (where the event renders
 * as a positioned chip) and omitted in time-grid contexts.
 */
export interface CalEventContext<TMeta = unknown> {
  readonly $implicit: CalendarEvent<TMeta>;
  readonly chip?: PositionedChip<TMeta>;
}

/**
 * Override the default event-chip rendering:
 * ```html
 * <ng-template calEventTemplate let-event let-chip="chip"> … </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[calEventTemplate]', standalone: true })
export class CalEventTemplate<TMeta = unknown> {
  readonly template = inject<TemplateRef<CalEventContext<TMeta>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: CalEventTemplate<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in the type predicate below
    ctx: unknown,
  ): ctx is CalEventContext<T> {
    return true;
  }
}
