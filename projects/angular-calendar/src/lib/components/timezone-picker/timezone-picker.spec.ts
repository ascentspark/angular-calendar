import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CalTimezonePicker } from './timezone-picker';

async function render(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(CalTimezonePicker);
  for (const [k, v] of Object.entries(inputs)) {
    fixture.componentRef.setInput(k, v);
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance, fixture };
}

describe('CalTimezonePicker', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders the default zone list with offset labels', async () => {
    const { el } = await render();
    const opts = el.querySelectorAll('option');
    expect(opts.length).toBeGreaterThan(5);
    expect([...opts].some((o) => o.textContent?.includes('New York'))).toBe(true);
    expect([...opts].some((o) => /GMT/.test(o.textContent ?? ''))).toBe(true);
  });

  it('restricts to a supplied zone subset', async () => {
    const { el } = await render({ zones: ['UTC', 'Asia/Tokyo'] });
    expect(el.querySelectorAll('option').length).toBe(2);
  });

  it('two-way updates value on selection', async () => {
    const { el, cmp } = await render({ zones: ['UTC', 'Asia/Tokyo'], value: 'UTC' });
    const select = el.querySelector('select')!;
    select.value = 'Asia/Tokyo';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(cmp.value()).toBe('Asia/Tokyo');
  });
});
