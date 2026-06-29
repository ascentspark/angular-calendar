import { describe, it, expect, beforeEach } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';
import { CalEventDialog } from './event-dialog';
import { CalEventDetailTemplate } from '../../directives/cal-event-detail-template';

const zone = 'America/New_York';
const at = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone });

const sample: CalendarEvent = {
  id: 'e1',
  title: 'Boiler repair',
  start: at('2026-06-15T14:30:00Z'),
  end: at('2026-06-15T16:30:00Z'),
  status: 'scheduled',
  resourceIds: ['bob'],
};

describe('CalEventDialog', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('stays closed when event is null and opens with a default body', async () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    });
    const fixture = TestBed.createComponent(CalEventDialog);
    fixture.componentRef.setInput('event', null);
    fixture.componentRef.setInput('timezone', zone);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.cal-evd')).toBeNull();

    fixture.componentRef.setInput('event', sample);
    fixture.detectChanges();
    const dialog = el.querySelector('.cal-evd');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('role')).toBe('dialog');
    expect(el.querySelector('.cal-evd__title')!.textContent).toContain('Boiler repair');
    // 14:30 UTC → 10:30 EDT, 16:30 UTC → 12:30 EDT
    expect(el.textContent).toContain('10:30 AM');
    expect(el.textContent).toContain('12:30 PM');
    expect(el.textContent?.toLowerCase()).toContain('scheduled');
  });

  it('resolves resourceIds to names when resources are supplied', async () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    });
    const fixture = TestBed.createComponent(CalEventDialog);
    fixture.componentRef.setInput('event', sample);
    fixture.componentRef.setInput('timezone', zone);
    fixture.componentRef.setInput('resources', [{ id: 'bob', name: 'Bob Reyes' }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Bob Reyes');
  });

  it('emits closed on the × button and on Escape', async () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    });
    const fixture = TestBed.createComponent(CalEventDialog);
    fixture.componentRef.setInput('event', sample);
    fixture.componentRef.setInput('timezone', zone);
    let closes = 0;
    fixture.componentInstance.closed.subscribe(() => (closes += 1));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLButtonElement>('.cal-evd__close')!.click();
    expect(closes).toBe(1);

    const scrim = el.querySelector<HTMLElement>('.cal-evd__scrim')!;
    scrim.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closes).toBe(2);
  });

  it('renders a custom *calEventDetail template instead of the default', async () => {
    @Component({
      standalone: true,
      imports: [CalEventDialog, CalEventDetailTemplate],
      template: `
        <cal-event-dialog [event]="ev()" [timezone]="'America/New_York'">
          <ng-template calEventDetail let-event let-close="close">
            <p class="custom">Custom: {{ event.title }}</p>
            <button class="custom-close" (click)="close()">Done</button>
          </ng-template>
        </cal-event-dialog>
      `,
    })
    class Host {
      readonly ev = signal<CalendarEvent | null>(sample);
    }
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.custom')!.textContent).toContain('Custom: Boiler repair');
    // default body is not rendered when a custom template is provided
    expect(el.querySelector('.cal-evd__body')).toBeNull();
  });
});
