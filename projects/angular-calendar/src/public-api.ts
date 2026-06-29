/*
 * Public API surface of @ascentsparksoftware/angular-calendar.
 * Only symbols re-exported here are part of the semver contract.
 */

// ── Theming engine ──────────────────────────────────────────────────────────
export { deriveTheme, type CalThemeMode } from './lib/theme/derive-theme';
export { applyTheme } from './lib/theme/apply-theme';
export {
  COLOR_TOKEN_NAMES,
  STATIC_TOKEN_NAMES,
  THEME_TOKEN_NAMES,
  STATIC_TOKENS,
  sanitizeStatusKey,
  type CalThemeTokens,
  type ColorTokenName,
  type StaticTokenName,
  type ThemeTokenName,
} from './lib/theme/tokens';

// ── Date adapter & instant model ────────────────────────────────────────────
export {
  type ZonedDateTime,
  type CalendarSystem,
  type EraFields,
} from './lib/core/date-adapter/zoned-date-time';
export { type DateAdapter, DATE_ADAPTER } from './lib/core/date-adapter/date-adapter';

// ── Core data model ─────────────────────────────────────────────────────────
export { type CalendarEvent } from './lib/core/model/calendar-event';
export { type CalendarResource } from './lib/core/model/calendar-resource';
export { type WorkingHours } from './lib/core/model/working-hours';
export { type CalendarViewName, type TimeAxisOrientation } from './lib/core/model/view';
