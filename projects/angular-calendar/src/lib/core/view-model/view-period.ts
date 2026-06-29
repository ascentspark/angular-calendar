import type { ZonedDateTime } from '../date-adapter/zoned-date-time';

/**
 * The half-open instant window a view currently displays. Emitted to consumers
 * (via `viewPeriodChanged`) so they can lazy-load exactly the visible range.
 */
export interface ViewPeriod {
  readonly start: ZonedDateTime;
  /** Exclusive upper bound. */
  readonly end: ZonedDateTime;
  readonly zone: string;
}
