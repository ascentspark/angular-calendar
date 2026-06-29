import { Directive, inject, TemplateRef } from '@angular/core';
import type { MonthDay } from '../core/view-model/month-view-model';

/** Context passed to a consumer's `*calOverflow` ("+N more") template. */
export interface CalOverflowContext<TMeta = unknown> {
  readonly $implicit: number;
  readonly day: MonthDay<TMeta>;
}

/**
 * Override the default "+N more" overflow control:
 * ```html
 * <ng-template calOverflow let-count let-day="day"> … </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[calOverflow]', standalone: true })
export class CalOverflowTemplate<TMeta = unknown> {
  readonly template = inject<TemplateRef<CalOverflowContext<TMeta>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: CalOverflowTemplate<T>,
    ctx: unknown,
  ): ctx is CalOverflowContext<T> {
    return true;
  }
}
