import { describe, it, expect } from 'vitest';
import { applyTheme } from './apply-theme';
import { deriveTheme } from './derive-theme';
import type { CalThemeTokens } from './tokens';

describe('applyTheme', () => {
  it('writes every token as an inline custom property on the host', () => {
    const host = document.createElement('div');
    const tokens = deriveTheme('#ffffff', '#3b82f6', 'light', { scheduled: '#3b82f6' });
    applyTheme(host, tokens);
    expect(host.style.getPropertyValue('--cal-bg')).toBe(tokens['--cal-bg']);
    expect(host.style.getPropertyValue('--cal-accent')).toBe(tokens['--cal-accent']);
    expect(host.style.getPropertyValue('--cal-event-scheduled')).toBe(
      tokens['--cal-event-scheduled'],
    );
  });
  it('scopes properties to the host only (no document-level leak)', () => {
    const host = document.createElement('div');
    applyTheme(host, deriveTheme('#ffffff', '#3b82f6', 'light'));
    // a sibling element with no inline tokens resolves to empty
    const sibling = document.createElement('div');
    expect(sibling.style.getPropertyValue('--cal-bg')).toBe('');
  });
  it('skips undefined token values (defensive against partial maps)', () => {
    const host = document.createElement('div');
    const partial = {
      '--cal-bg': '#ffffff',
      '--cal-event-ghost': undefined,
    } as unknown as CalThemeTokens;
    applyTheme(host, partial);
    expect(host.style.getPropertyValue('--cal-bg')).toBe('#ffffff');
    expect(host.style.getPropertyValue('--cal-event-ghost')).toBe('');
  });

  it('re-applying overwrites prior values (idempotent for same tokens)', () => {
    const host = document.createElement('div');
    const a = deriveTheme('#ffffff', '#3b82f6', 'light');
    const b: CalThemeTokens = deriveTheme('#0b0b0c', '#22c55e', 'dark');
    applyTheme(host, a);
    applyTheme(host, b);
    expect(host.style.getPropertyValue('--cal-bg')).toBe(b['--cal-bg']);
  });

  describe('token bridge', () => {
    it('overrides bridged tokens with var() refs while keeping unbridged derived values', () => {
      const host = document.createElement('div');
      const tokens = deriveTheme('#ffffff', '#3b82f6', 'light');
      applyTheme(host, tokens, { '--cal-accent': '--brand-500' });
      expect(host.style.getPropertyValue('--cal-accent')).toBe('var(--brand-500)');
      // an unbridged token keeps its derived value
      expect(host.style.getPropertyValue('--cal-bg')).toBe(tokens['--cal-bg']);
    });

    it('passes through an already-wrapped var() reference unchanged', () => {
      const host = document.createElement('div');
      applyTheme(host, deriveTheme('#ffffff', '#3b82f6', 'light'), {
        '--cal-bg': 'var(--surface, #fff)',
      });
      expect(host.style.getPropertyValue('--cal-bg')).toBe('var(--surface, #fff)');
    });

    it('is applied after the theme, so the bridge always wins on re-apply', () => {
      const host = document.createElement('div');
      const bridge = { '--cal-accent': '--brand-500' };
      applyTheme(host, deriveTheme('#ffffff', '#3b82f6', 'light'), bridge);
      applyTheme(host, deriveTheme('#0b0b0c', '#22c55e', 'dark'), bridge);
      expect(host.style.getPropertyValue('--cal-accent')).toBe('var(--brand-500)');
    });

    it('ignores a null/empty bridge', () => {
      const host = document.createElement('div');
      const tokens = deriveTheme('#ffffff', '#3b82f6', 'light');
      applyTheme(host, tokens, null);
      expect(host.style.getPropertyValue('--cal-accent')).toBe(tokens['--cal-accent']);
    });
  });
});
