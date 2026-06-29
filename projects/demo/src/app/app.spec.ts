import { TestBed } from '@angular/core/testing';
import { provideCalendar, withDateAdapter } from '@ascentsparksoftware/angular-calendar';
import { provideDateFnsAdapter } from '@ascentsparksoftware/angular-calendar/date-fns';
import { App } from './app';

describe('Demo App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideCalendar(withDateAdapter(provideDateFnsAdapter()))],
    }).compileComponents();
  });

  it('creates and renders the month view', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('cal-month-view')).toBeTruthy();
    expect(el.querySelector('[role="grid"]')).toBeTruthy();
  });
});
