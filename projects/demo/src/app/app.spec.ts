import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('Demo shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the branded header and sidebar nav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand__text strong')?.textContent).toContain('angular-calendar');
    expect(el.querySelector('.site-nav')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });
});
