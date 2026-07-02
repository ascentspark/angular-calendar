import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PageSection {
  id: string;
  label: string;
}

/** "On this page" anchor list, built from a page's section anchors. */
@Component({
  selector: 'cal-page-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sections().length) {
      <nav class="onthispage" aria-label="On this page">
        <span class="onthispage__label">On this page</span>
        <ul>
          @for (s of sections(); track s.id) {
            <li>
              <a [href]="'#' + s.id">{{ s.label }}</a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styles: `
    .onthispage {
      margin: 0 0 1.6rem;
      padding: 0.8rem 1rem;
      border: 1px solid var(--site-line);
      border-radius: 0.6rem;
      background: var(--site-surface);
    }
    .onthispage__label {
      display: block;
      margin-bottom: 0.4rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--site-ink-soft);
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
    }
    a {
      color: var(--site-accent);
      text-decoration: none;
      font-size: 0.88rem;
    }
    a:hover {
      text-decoration: underline;
    }
  `,
})
export class PageNav {
  readonly sections = input<PageSection[]>([]);
}
