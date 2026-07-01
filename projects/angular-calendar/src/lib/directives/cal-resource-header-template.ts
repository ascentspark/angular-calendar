import { Directive, inject, TemplateRef } from '@angular/core';
import type { CalendarResource } from '../core/model/calendar-resource';

/** Context passed to a consumer's `*calResourceHeader` template. */
export interface CalResourceHeaderContext<TMeta = unknown> {
  readonly $implicit: CalendarResource<TMeta>;
  readonly depth: number;
  readonly hasChildren: boolean;
  readonly collapsed: boolean;
}

/**
 * Override the default resource-row header (timeline):
 * ```html
 * <ng-template calResourceHeader let-resource let-depth="depth"> … </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[calResourceHeader]', standalone: true })
export class CalResourceHeaderTemplate<TMeta = unknown> {
  readonly template = inject<TemplateRef<CalResourceHeaderContext<TMeta>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: CalResourceHeaderTemplate<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in the type predicate below
    ctx: unknown,
  ): ctx is CalResourceHeaderContext<T> {
    return true;
  }
}
