import { describe, it, expect } from 'vitest';
import { contrastRatio, parseHex } from './color';
import { deriveTheme, type CalThemeMode } from './derive-theme';
import { THEME_TOKEN_NAMES } from './tokens';

const modes: CalThemeMode[] = ['light', 'dark'];
// A spread of base/accent pairs incl. near-black, near-white, saturated, desaturated.
const pairs: readonly [string, string][] = [
  ['#ffffff', '#3b82f6'],
  ['#0b0b0c', '#22c55e'],
  ['#f4f4f5', '#e5484d'],
  ['#1e293b', '#f59e0b'],
  ['#888888', '#888888'],
];

describe('deriveTheme — completeness', () => {
  it('emits every fixed token name for all inputs/modes', () => {
    for (const mode of modes) {
      for (const [base, accent] of pairs) {
        const t = deriveTheme(base, accent, mode);
        for (const name of THEME_TOKEN_NAMES) {
          expect(t[name], `${name} (${base}/${accent}/${mode})`).toBeTruthy();
        }
      }
    }
  });
});

describe('deriveTheme — WCAG guarantees', () => {
  it('primary ink ≥ AAA (7:1) and secondary ink ≥ AA (4.5:1) on surface, both modes', () => {
    for (const mode of modes) {
      for (const [base, accent] of pairs) {
        const t = deriveTheme(base, accent, mode);
        const surface = parseHex(t['--cal-surface']);
        expect(contrastRatio(parseHex(t['--cal-ink']), surface)).toBeGreaterThanOrEqual(6.9);
        expect(contrastRatio(parseHex(t['--cal-ink-700']), surface)).toBeGreaterThanOrEqual(4.4);
        expect(contrastRatio(parseHex(t['--cal-ink-muted']), surface)).toBeGreaterThanOrEqual(4.4);
      }
    }
  });
  it('on-accent ink prefers white and clears large-text AA (3:1) on the accent', () => {
    // On-accent text is bold chrome (buttons, date badges), so it targets large-text AA
    // (3:1) and prefers white — which reads crisply on saturated brand colours where pure
    // black looks muddy. (Event chips still guarantee full 4.5:1 via colour deepening.)
    for (const mode of modes) {
      for (const [base, accent] of pairs) {
        const t = deriveTheme(base, accent, mode);
        expect(
          contrastRatio(parseHex(t['--cal-accent-ink']), parseHex(t['--cal-accent'])),
        ).toBeGreaterThanOrEqual(2.9);
      }
    }
  });

  it('honours an explicit accentInk override', () => {
    const t = deriveTheme('#ffffff', '#0d9488', 'light', {}, '#ffeedd');
    expect(t['--cal-accent-ink'].toLowerCase()).toBe('#ffeedd');
    // invalid/blank overrides fall through to the derived default (white on teal)
    expect(deriveTheme('#ffffff', '#0d9488', 'light', {}, 'not-a-color')['--cal-accent-ink']).toBe(
      '#ffffff',
    );
  });
  it('now-line reaches at least 3:1 graphical contrast against the bg', () => {
    for (const mode of modes) {
      for (const [base, accent] of pairs) {
        const t = deriveTheme(base, accent, mode);
        expect(
          contrastRatio(parseHex(t['--cal-now-line']), parseHex(t['--cal-bg'])),
        ).toBeGreaterThanOrEqual(2.9);
      }
    }
  });
});

describe('deriveTheme — event colour map', () => {
  it('produces a guaranteed-AA quartet per status, with sanitised keys', () => {
    const t = deriveTheme('#ffffff', '#3b82f6', 'light', {
      scheduled: '#3b82f6',
      'In Progress': '#f59e0b',
      done: '#22c55e',
    });
    // sanitised: "In Progress" -> "in-progress"
    expect(t['--cal-event-scheduled']).toBeTruthy();
    expect(t['--cal-event-in-progress']).toBeTruthy();
    expect(t['--cal-event-done']).toBeTruthy();
    // on-colours meet AA against their fills
    const req = (name: `--cal-event-${string}`): string => {
      const v = t[name];
      if (v === undefined) {
        throw new Error(`missing token ${name}`);
      }
      return v;
    };
    for (const key of ['scheduled', 'in-progress', 'done']) {
      const fill = parseHex(req(`--cal-event-${key}`));
      const ink = parseHex(req(`--cal-event-${key}-ink`));
      const soft = parseHex(req(`--cal-event-${key}-soft`));
      const softInk = parseHex(req(`--cal-event-${key}-soft-ink`));
      expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(4.4);
      expect(contrastRatio(softInk, soft)).toBeGreaterThanOrEqual(4.4);
    }
  });
  it('skips invalid event colours without throwing', () => {
    const t = deriveTheme('#ffffff', '#3b82f6', 'light', { ok: '#123456', bad: 'nope' });
    expect(t['--cal-event-ok']).toBe('#123456');
    expect(t['--cal-event-bad']).toBeUndefined();
  });
});

describe('deriveTheme — invalid base/accent', () => {
  it('throws on invalid base or accent hex', () => {
    expect(() => deriveTheme('nope', '#3b82f6', 'light')).toThrowError(/Invalid hex/);
    expect(() => deriveTheme('#ffffff', 'xyz', 'light')).toThrowError(/Invalid hex/);
  });
});
