import { ChangeDetectionStrategy, Component } from '@angular/core';

// STUB — scaffolding only. Replaced with the real page + live examples in a later task.
@Component({
  selector: 'cal-reference',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page" data-stub="reference">
      <h1>Integration & API</h1>
      <p class="lead">Inputs, outputs, the headless engine, the date adapter, a11y and security.</p>
      <p class="stub-note">Documentation in progress.</p>
    </article>
  `,
})
export class ReferencePage {}
