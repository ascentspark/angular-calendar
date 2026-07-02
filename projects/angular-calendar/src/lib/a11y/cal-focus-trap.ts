import {
  afterNextRender,
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

/**
 * Keeps keyboard focus inside its host while active (the modal-dialog focus-trap
 * pattern) — dependency-free, no CDK. On activation it moves focus to the first
 * focusable descendant (or the host itself) and remembers what was focused before,
 * restoring it when the host is destroyed. <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>
 * wrap around the host's focusable elements instead of escaping to the page behind.
 *
 * Apply to a container that carries `role="dialog"` (or similar) and is only present
 * while open, e.g. behind an `@if`:
 * ```html
 * <div role="dialog" tabindex="-1" calFocusTrap> … </div>
 * ```
 * Disable dynamically with `[calFocusTrap]="isOpen()"`.
 */
@Directive({
  selector: '[calFocusTrap]',
  standalone: true,
  host: {
    '(keydown.Tab)': 'onTab($event, false)',
    '(keydown.shift.Tab)': 'onTab($event, true)',
  },
})
export class CalFocusTrap {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Whether the trap is active. Bare `calFocusTrap` ⇒ `true`. */
  readonly enabled = input(true, { alias: 'calFocusTrap', transform: booleanAttribute });

  private restoreTo: HTMLElement | null = null;

  constructor() {
    // afterNextRender is browser-only, so this is SSR-safe: no focus work on the server.
    afterNextRender(() => {
      if (!this.enabled()) {
        return;
      }
      const active = this.host.nativeElement.ownerDocument.activeElement;
      this.restoreTo = active instanceof HTMLElement ? active : null;
      this.focusFirst();
    });
    inject(DestroyRef).onDestroy(() => this.restoreTo?.focus());
  }

  private focusable(): HTMLElement[] {
    const selector =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
      'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(selector));
  }

  private focusFirst(): void {
    (this.focusable()[0] ?? this.host.nativeElement).focus();
  }

  protected onTab(event: Event, backward: boolean): void {
    if (!this.enabled()) {
      return;
    }
    const els = this.focusable();
    const host = this.host.nativeElement;
    const first = els[0];
    const last = els[els.length - 1];
    if (!first || !last) {
      event.preventDefault();
      host.focus();
      return;
    }
    const active = host.ownerDocument.activeElement;
    if (backward && (active === first || active === host)) {
      event.preventDefault();
      last.focus();
    } else if (!backward && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
