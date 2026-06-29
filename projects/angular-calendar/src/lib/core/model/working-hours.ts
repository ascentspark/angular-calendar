/**
 * A recurring working-hours window, used for shading and (later) block-out
 * checks. Times are minutes from local midnight in the calendar's display zone.
 */
export interface WorkingHours {
  /** Days the window applies to, 0=Sun … 6=Sat. */
  readonly daysOfWeek: readonly number[];
  /** Window start, minutes from midnight (0–1440). */
  readonly startMinutes: number;
  /** Window end, minutes from midnight (0–1440). */
  readonly endMinutes: number;
}
