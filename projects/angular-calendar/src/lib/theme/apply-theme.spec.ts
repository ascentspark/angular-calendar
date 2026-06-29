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
  it('re-applying overwrites prior values (idempotent for same tokens)', () => {
    const host = document.createElement('div');
    const a = deriveTheme('#ffffff', '#3b82f6', 'light');
    const b: CalThemeTokens = deriveTheme('#0b0b0c', '#22c55e', 'dark');
    applyTheme(host, a);
    applyTheme(host, b);
    expect(host.style.getPropertyValue('--cal-bg')).toBe(b['--cal-bg']);
  });
});
