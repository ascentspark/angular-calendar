/*
 * Public API surface of @ascentsparksoftware/angular-calendar.
 * Only symbols re-exported here are part of the semver contract.
 */

// ── Theming engine ──────────────────────────────────────────────────────────
export { deriveTheme, type CalThemeMode } from './lib/theme/derive-theme';
export { applyTheme, type CalTokenBridge } from './lib/theme/apply-theme';
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

// ── Recurrence contract ─────────────────────────────────────────────────────
export {
  type RecurrenceAdapter,
  type RecurrenceParts,
  type RecurrenceFreq,
  type RecurrenceEnd,
  type RecurrenceEditScope,
  RECURRENCE_ADAPTER,
} from './lib/core/recurrence/recurrence-adapter';
export {
  expandRecurringEvents,
  type ExpandContext,
} from './lib/core/recurrence/expand-recurring-events';
export {
  addRecurrenceException,
  splitSeriesAt,
  type SeriesSplit,
} from './lib/core/recurrence/recurrence-edit';

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
  withTokenBridge,
  CAL_TOKEN_BRIDGE,
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
export {
  flattenResources,
  type FlatResource,
} from './lib/core/view-model/flatten-resources';
export {
  type TimeHeaderCell,
  type TimeHeaderUnit,
  type TimeHeaderRow,
  type ResourceRow,
  type TimelineViewModel,
  type TimelineViewArgs,
} from './lib/core/view-model/timeline-view-model';
export { buildTimelineView } from './lib/core/view-model/build-timeline-view';
export {
  type AgendaDay,
  type AgendaViewModel,
  type AgendaViewArgs,
} from './lib/core/view-model/agenda-view-model';
export { buildAgendaView } from './lib/core/view-model/build-agenda-view';
export {
  detectConflicts,
  filterByStatus,
  type EventConflict,
} from './lib/core/view-model/event-queries';

// ── Accessibility ───────────────────────────────────────────────────────────
export { CalCalendarA11y } from './lib/a11y/cal-calendar-a11y';
export { CalCalendarIntl } from './lib/i18n/cal-calendar-intl';

// ── Template-override directives ─────────────────────────────────────────────
export { CalEventTemplate, type CalEventContext } from './lib/directives/cal-event-template';
export {
  CalEventDetailTemplate,
  type CalEventDetailContext,
} from './lib/directives/cal-event-detail-template';
export { CalEventDialog } from './lib/components/event-dialog/event-dialog';
export { CalCellTemplate, type CalCellContext } from './lib/directives/cal-cell-template';
export {
  CalOverflowTemplate,
  type CalOverflowContext,
} from './lib/directives/cal-overflow-template';
export {
  CalResourceHeaderTemplate,
  type CalResourceHeaderContext,
} from './lib/directives/cal-resource-header-template';

// ── Components ───────────────────────────────────────────────────────────────
export { CalMonthView } from './lib/components/month-view/month-view';
export { CalYearView } from './lib/components/year-view/year-view';
export { CalTimeGridView } from './lib/components/time-grid-view/time-grid-view';
export { CalTimelineView } from './lib/components/timeline-view/timeline-view';
export { CalAgendaView } from './lib/components/agenda-view/agenda-view';
export { CalRecurrenceEditor } from './lib/components/recurrence-editor/recurrence-editor';
export { CalTimezonePicker } from './lib/components/timezone-picker/timezone-picker';

// ── Interactions ────────────────────────────────────────────────────────────
export {
  type EventChange,
  type EventChangeKind,
  type EventChangeRequest,
} from './lib/interactions/event-change';
export {
  computeDragTimes,
  type DragKind,
  type DragInput,
  type DragTimes,
} from './lib/interactions/drag-preview';
