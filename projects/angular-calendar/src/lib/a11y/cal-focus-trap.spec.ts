import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CalFocusTrap } from './cal-focus-trap';

@Component({
  standalone: true,
  imports: [CalFocusTrap],
  template: `
    <button id="outside">outside</button>
    @if (open()) {
      <div role="dialog" tabindex="-1" calFocusTrap>
        <button id="a">a</button>
        <button id="b">b</button>
        <button id="c">c</button>
      </div>
    }
  `,
})
class HostComponent {
  readonly open = signal(false);
}

function tab(el: Element, shift: boolean): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true }));
}

describe('CalFocusTrap', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('wraps Tab from the last focusable back to the first', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const a = el.querySelector<HTMLButtonElement>('#a')!;
    const c = el.querySelector<HTMLButtonElement>('#c')!;

    c.focus();
    tab(c, false);
    expect(el.ownerDocument.activeElement).toBe(a);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const a = el.querySelector<HTMLButtonElement>('#a')!;
    const c = el.querySelector<HTMLButtonElement>('#c')!;

    a.focus();
    tab(a, true);
    expect(el.ownerDocument.activeElement).toBe(c);
  });

  it('does not trap when disabled', () => {
    @Component({
      standalone: true,
      imports: [CalFocusTrap],
      template: `
        <div role="dialog" tabindex="-1" [calFocusTrap]="false">
          <button id="a">a</button>
          <button id="c">c</button>
        </div>
      `,
    })
    class DisabledHost {}
    const fixture = TestBed.createComponent(DisabledHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const c = el.querySelector<HTMLButtonElement>('#c')!;
    c.focus();
    tab(c, false);
    // disabled ⇒ the trap does not intervene, focus stays put
    expect(el.ownerDocument.activeElement).toBe(c);
  });
});
