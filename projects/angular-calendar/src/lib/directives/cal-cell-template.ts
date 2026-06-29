import { Directive, inject, TemplateRef } from '@angular/core';
import type { MonthDay } from '../core/view-model/month-view-model';

/** Context passed to a consumer's `*calCellTemplate` (the day cell body). */
export interface CalCellContext<TMeta = unknown> {
  readonly $implicit: MonthDay<TMeta>;
}

/**
 * Override the default day-cell rendering:
 * ```html
 * <ng-template calCellTemplate let-day> … </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[calCellTemplate]', standalone: true })
export class CalCellTemplate<TMeta = unknown> {
  readonly template = inject<TemplateRef<CalCellContext<TMeta>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: CalCellTemplate<T>,
    ctx: unknown,
  ): ctx is CalCellContext<T> {
    return true;
  }
}
