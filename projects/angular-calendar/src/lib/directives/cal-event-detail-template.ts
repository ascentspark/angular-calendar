import { Directive, inject, TemplateRef } from '@angular/core';
import type { CalendarEvent } from '../core/model/calendar-event';

/**
 * Context passed to a consumer's `*calEventDetail` template. `$implicit` is the
 * event; `close` dismisses the dialog (wire it to your own buttons).
 */
export interface CalEventDetailContext<TMeta = unknown> {
  readonly $implicit: CalendarEvent<TMeta>;
  readonly close: () => void;
}

/**
 * Override the {@link CalEventDialog} body to render your own event detail UI:
 * ```html
 * <cal-event-dialog [event]="selected()" (closed)="selected.set(null)">
 *   <ng-template calEventDetail let-event let-close="close">
 *     <h2>{{ event.title }}</h2>
 *     <button (click)="edit(event); close()">Edit</button>
 *   </ng-template>
 * </cal-event-dialog>
 * ```
 * When omitted, the dialog renders a sensible default (title, status, time range,
 * resources, description).
 */
@Directive({ selector: 'ng-template[calEventDetail]', standalone: true })
export class CalEventDetailTemplate<TMeta = unknown> {
  readonly template = inject<TemplateRef<CalEventDetailContext<TMeta>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: CalEventDetailTemplate<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in the type predicate below
    ctx: unknown,
  ): ctx is CalEventDetailContext<T> {
    return true;
  }
}
