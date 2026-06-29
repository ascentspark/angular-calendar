import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRruleAdapter } from '@ascentsparksoftware/angular-calendar/recurrence';
import { CalRecurrenceEditor } from './recurrence-editor';

async function render(initialRule = '') {
  TestBed.configureTestingModule({ providers: [provideRruleAdapter()] });
  const fixture = TestBed.createComponent(CalRecurrenceEditor);
  fixture.componentRef.setInput('rule', initialRule);
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance, fixture };
}

describe('CalRecurrenceEditor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('reflects an existing weekly rule (weekday chips, frequency)', async () => {
    const { el } = await render('FREQ=WEEKLY;BYDAY=MO,WE');
    expect(el.querySelector<HTMLSelectElement>('#cal-rec-freq')!.value).toBe('weekly');
    const on = [...el.querySelectorAll('.cal-rec__day--on')];
    expect(on.length).toBe(2); // Mon + Wed
  });

  it('toggling a weekday updates the rule string', async () => {
    const { el, cmp, fixture } = await render('FREQ=WEEKLY');
    // Friday is index 5 in the weekday button list
    const fri = el.querySelectorAll<HTMLButtonElement>('.cal-rec__day')[5]!;
    fri.click();
    await fixture.whenStable();
    expect(cmp.rule()).toContain('FREQ=WEEKLY');
    expect(cmp.rule()).toContain('BYDAY=FR');
  });

  it('changing the count end-type writes COUNT', async () => {
    const { el, cmp, fixture } = await render('FREQ=DAILY');
    const countRadio = el.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!;
    countRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(cmp.rule()).toContain('COUNT=');
  });

  it('shows a live RRULE preview', async () => {
    const { el } = await render('FREQ=MONTHLY;BYMONTHDAY=15');
    expect(el.querySelector('.cal-rec__preview')?.textContent).toContain('FREQ=MONTHLY');
  });
});
