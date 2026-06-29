import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularCalendar } from './angular-calendar';

describe('AngularCalendar', () => {
  let component: AngularCalendar;
  let fixture: ComponentFixture<AngularCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AngularCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(AngularCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
