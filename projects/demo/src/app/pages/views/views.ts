import { ChangeDetectionStrategy, Component } from '@angular/core';

// STUB — scaffolding only. Replaced with the real page + live examples in a later task.
@Component({
  selector: 'cal-views',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page" data-stub="views">
      <h1>Views</h1>
      <p class="lead">Month, week, day, timeline scheduler, week-as-rows, agenda and year.</p>
      <p class="stub-note">Documentation in progress.</p>
    </article>
  `,
})
export class ViewsPage {}
