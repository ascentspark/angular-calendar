import { ChangeDetectionStrategy, Component } from '@angular/core';

// STUB — scaffolding only. Replaced with the real page + live examples in a later task.
@Component({
  selector: 'cal-recurrence',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page" data-stub="recurrence">
      <h1>Recurrence</h1>
      <p class="lead">RFC 5545 RRULE with this / this-and-following / all edit semantics.</p>
      <p class="stub-note">Documentation in progress.</p>
    </article>
  `,
})
export class RecurrencePage {}
