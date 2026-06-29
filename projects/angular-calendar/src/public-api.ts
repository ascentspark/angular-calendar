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

// ── Headless layout primitives (pure, DOM-free) ─────────────────────────────
export { overlaps, type Interval } from './lib/core/layout/interval';
export { packRows, type LanePlacement, type RowPacking } from './lib/core/layout/pack-rows';
export {
  packColumns,
  type ColumnPlacement,
  type ColumnPacking,
} from './lib/core/layout/pack-columns';
export {
  clampFraction,
  offsetFraction,
  sizeFraction,
  valueAtFraction,
  snapValue,
  type ProjectionRange,
} from './lib/core/layout/projection';

// ── Configuration & providers ───────────────────────────────────────────────
export {
  CALENDAR_CONFIG,
  DEFAULT_CALENDAR_CONFIG,
  type CalendarConfig,
} from './lib/core/config/calendar-config';
export {
  provideCalendar,
  withDefaults,
  withDateAdapter,
  type CalendarFeature,
  type CalendarFeatureKind,
} from './lib/core/config/provide-calendar';

// ── View-models (month) ─────────────────────────────────────────────────────
export { type ViewPeriod } from './lib/core/view-model/view-period';
export { type PositionedChip } from './lib/core/view-model/positioned-chip';
export {
  type MonthDay,
  type MonthWeek,
  type MonthViewModel,
  type MonthViewArgs,
} from './lib/core/view-model/month-view-model';
export { buildMonthView } from './lib/core/view-model/build-month-view';
export {
  type YearDay,
  type YearMonth,
  type YearViewModel,
  type YearViewArgs,
} from './lib/core/view-model/year-view-model';
export { buildYearView } from './lib/core/view-model/build-year-view';
export {
  type PositionedEvent,
  type ShadeBand,
} from './lib/core/view-model/positioned-event';
export {
  type TimeColumn,
  type TimeTick,
  type TimeGridViewModel,
  type TimeGridViewArgs,
} from './lib/core/view-model/time-grid-view-model';
export { buildTimeGridView } from './lib/core/view-model/build-time-grid-view';

// ── Accessibility ───────────────────────────────────────────────────────────
export { CalCalendarA11y } from './lib/a11y/cal-calendar-a11y';

// ── Template-override directives ─────────────────────────────────────────────
export { CalEventTemplate, type CalEventContext } from './lib/directives/cal-event-template';
export { CalCellTemplate, type CalCellContext } from './lib/directives/cal-cell-template';
export {
  CalOverflowTemplate,
  type CalOverflowContext,
} from './lib/directives/cal-overflow-template';

// ── Components ───────────────────────────────────────────────────────────────
export { CalMonthView } from './lib/components/month-view/month-view';
export { CalYearView } from './lib/components/year-view/year-view';
