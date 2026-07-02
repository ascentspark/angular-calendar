import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** A single source snippet shown in the example's code panel. */
export interface ExampleSource {
  label: string;
  code: string;
  lang?: 'ts' | 'html' | 'bash' | 'css';
}

/**
 * Reusable doc example: a titled section with a live demo (projected content) and a
 * tabbed, copy-to-clipboard source panel, so the result and its exact source sit
 * together. `anchor` sets the section id for the page's "on this page" links.
 */
@Component({
  selector: 'cal-doc-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ex" [id]="anchor()">
      <header class="ex__head">
        <div class="ex__titlerow">
          <h2 class="ex__title">{{ title() }}</h2>
          @if (docsUrl()) {
            <a class="ex__docs" [href]="docsUrl()" target="_blank" rel="noopener">Docs ↗</a>
          }
        </div>
        @if (description()) {
          <p class="ex__desc">{{ description() }}</p>
        }
      </header>

      @if (hasProjected()) {
        <div class="ex__live">
          <ng-content />
        </div>
      }

      @if (sources().length) {
        <div class="ex__code">
          <div class="ex__tabs" role="tablist">
            @for (s of sources(); track s.label; let i = $index) {
              <button
                type="button"
                role="tab"
                class="ex__tab"
                [class.ex__tab--active]="active() === i"
                [attr.aria-selected]="active() === i"
                (click)="active.set(i)"
              >
                {{ s.label }}
              </button>
            }
            <button type="button" class="ex__copy" (click)="copy()">
              {{ copied() ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <pre
            class="ex__pre"
          ><code [attr.data-lang]="current().lang">{{ current().code }}</code></pre>
        </div>
      }
    </section>
  `,
  styles: `
    .ex {
      background: var(--site-surface);
      border: 1px solid var(--site-line);
      border-radius: 0.7rem;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      margin-bottom: 1.8rem;
      scroll-margin-top: 4.5rem;
    }
    .ex__head {
      padding: 1.15rem 1.35rem 0.4rem;
    }
    .ex__titlerow {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .ex__title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .ex__docs {
      flex: none;
      font-size: 0.76rem;
      font-weight: 500;
      color: var(--site-accent);
      text-decoration: none;
      border: 1px solid var(--site-line);
      border-radius: 999px;
      padding: 0.22rem 0.7rem;
      white-space: nowrap;
    }
    .ex__docs:hover {
      border-color: var(--site-accent);
    }
    .ex__desc {
      margin: 0.4rem 0 0;
      color: var(--site-ink-soft);
      line-height: 1.6;
    }
    .ex__live {
      padding: 1.2rem 1.35rem 1.35rem;
    }
    .ex__code {
      border-top: 1px solid var(--site-line);
      background: #12141a;
    }
    .ex__tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 0.8rem 0;
      align-items: center;
    }
    .ex__tab {
      background: transparent;
      color: rgba(255, 255, 255, 0.55);
      border: none;
      border-radius: 0.35rem 0.35rem 0 0;
      padding: 0.4rem 0.8rem;
      font-size: 0.76rem;
      cursor: pointer;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .ex__tab:hover {
      color: #fff;
    }
    .ex__tab--active {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    .ex__tab--active::after {
      content: '';
      display: block;
      height: 2px;
      margin-top: 0.4rem;
      background: var(--site-accent);
    }
    .ex__copy {
      margin-left: auto;
      background: transparent;
      color: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      padding: 0.28rem 0.8rem;
      font-size: 0.7rem;
      cursor: pointer;
    }
    .ex__copy:hover {
      border-color: var(--site-accent);
      color: #fff;
    }
    .ex__pre {
      margin: 0;
      padding: 1.05rem 1.35rem;
      overflow-x: auto;
      color: #e6e6e6;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8rem;
      line-height: 1.6;
    }
    .ex__pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: inherit;
    }
  `,
})
export class DocExample {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly sources = input<ExampleSource[]>([]);
  readonly docsUrl = input<string>('');
  readonly anchor = input<string>('');
  /** Set to false on doc-only blocks (no live demo) to drop the empty live region. */
  readonly hasProjected = input<boolean>(true);

  protected readonly active = signal(0);
  protected readonly copied = signal(false);
  protected readonly current = computed(
    () => this.sources()[this.active()] ?? { label: '', code: '', lang: undefined },
  );

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.current().code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context). Ignore silently.
    }
  }
}
