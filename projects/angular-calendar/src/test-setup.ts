import {
  EnvironmentProviders,
  Provider,
  provideZonelessChangeDetection,
} from '@angular/core';

/**
 * Test-environment providers for the library's unit tests.
 *
 * The `@angular/build:unit-test` builder initialises the Angular testing
 * environment itself; this file only contributes the providers that every
 * `TestBed` in the project should have. We pin zoneless change detection so the
 * tests exercise the same change-detection model the library ships with
 * (no `zone.js` anywhere).
 */
const testProviders: (Provider | EnvironmentProviders)[] = [
  provideZonelessChangeDetection(),
];

export default testProviders;
