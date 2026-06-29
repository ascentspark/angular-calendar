import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { InjectionToken } from '@angular/core';
import { provideCalendar, withDefaults, withDateAdapter } from './provide-calendar';
import { CALENDAR_CONFIG, DEFAULT_CALENDAR_CONFIG } from './calendar-config';
import { DATE_ADAPTER } from '../date-adapter/date-adapter';
import type { DateAdapter } from '../date-adapter/date-adapter';

const fakeAdapter = {} as DateAdapter;
const FAKE = new InjectionToken<DateAdapter>('fake', { factory: () => fakeAdapter });

describe('provideCalendar', () => {
  it('provides the default config when no features are given', () => {
    TestBed.configureTestingModule({ providers: [provideCalendar()] });
    expect(TestBed.inject(CALENDAR_CONFIG)).toEqual(DEFAULT_CALENDAR_CONFIG);
  });

  it('merges withDefaults overrides over the defaults', () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDefaults({ weekStartsOn: 1, slotMinutes: 15 }))],
    });
    const cfg = TestBed.inject(CALENDAR_CONFIG);
    expect(cfg.weekStartsOn).toBe(1);
    expect(cfg.slotMinutes).toBe(15);
    // untouched defaults remain
    expect(cfg.locale).toBe(DEFAULT_CALENDAR_CONFIG.locale);
    expect(cfg.calendarSystem).toBe('gregory');
  });

  it('later withDefaults wins on conflicting keys', () => {
    TestBed.configureTestingModule({
      providers: [provideCalendar(withDefaults({ slotMinutes: 30 }), withDefaults({ slotMinutes: 10 }))],
    });
    expect(TestBed.inject(CALENDAR_CONFIG).slotMinutes).toBe(10);
  });

  it('wires a date adapter through withDateAdapter', () => {
    TestBed.configureTestingModule({
      providers: [
        provideCalendar(withDateAdapter({ provide: DATE_ADAPTER, useExisting: FAKE })),
        { provide: FAKE, useValue: fakeAdapter },
      ],
    });
    expect(TestBed.inject(DATE_ADAPTER)).toBe(fakeAdapter);
  });
});

describe('CALENDAR_CONFIG root factory', () => {
  it('falls back to the built-in defaults when provideCalendar is absent', () => {
    TestBed.configureTestingModule({ providers: [] });
    expect(TestBed.inject(CALENDAR_CONFIG)).toEqual(DEFAULT_CALENDAR_CONFIG);
  });
});
