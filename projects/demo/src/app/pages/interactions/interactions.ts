import { ChangeDetectionStrategy, Component } from '@angular/core';

// STUB — scaffolding only. Replaced with the real page + live examples in a later task.
@Component({
  selector: 'cal-interactions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page" data-stub="interactions">
      <h1>Interactions</h1>
      <p class="lead">Pointer drag/resize/create, full keyboard operability, and external drag-in.</p>
      <p class="stub-note">Documentation in progress.</p>
    </article>
  `,
})
export class InteractionsPage {}
