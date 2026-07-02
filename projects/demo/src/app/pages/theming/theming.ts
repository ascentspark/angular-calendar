import { ChangeDetectionStrategy, Component } from '@angular/core';

// STUB — scaffolding only. Replaced with the real page + live examples in a later task.
@Component({
  selector: 'cal-theming',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="page" data-stub="theming">
      <h1>Theming</h1>
      <p class="lead">Drop onto any color scheme with baseColor, accentColor, themeMode and --cal-* tokens.</p>
      <p class="stub-note">Documentation in progress.</p>
    </article>
  `,
})
export class ThemingPage {}
