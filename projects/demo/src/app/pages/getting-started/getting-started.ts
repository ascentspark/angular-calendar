import { ChangeDetectionStrategy, Component } from '@angular/core';

// STUB — scaffolding only. Replaced with the real page + live examples in a later task.
@Component({
  selector: 'cal-getting-started',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page" data-stub="getting-started">
      <h1>Getting started</h1>
      <p class="lead">Install @ascentsparksoftware/angular-calendar and render your first view.</p>
      <p class="stub-note">Documentation in progress.</p>
    </article>
  `,
})
export class GettingStartedPage {}
