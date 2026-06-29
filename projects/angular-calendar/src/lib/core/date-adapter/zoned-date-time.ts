/**
 * The library-internal representation of an instant.
 *
 * The source of truth is always {@link ZonedDateTime.epochMs} — an absolute
 * point on the timeline (UTC milliseconds since the epoch). The {@link
 * ZonedDateTime.zone} records the IANA zone the value is *displayed and reasoned
 * about in*. Two values with the same `epochMs` but different `zone` are the same
 * instant shown in different places. All view math runs in the display zone; the
 * stored instant never depends on the host's local timezone.
 */
export interface ZonedDateTime {
  /** Absolute instant: UTC milliseconds since the Unix epoch. The source of truth. */
  readonly epochMs: number;
  /** IANA zone id the value is interpreted in, e.g. `'America/New_York'`, `'UTC'`. */
  readonly zone: string;
}

/**
 * Calendar system used for *display and labelling* only. The stored instant
 * ({@link ZonedDateTime.epochMs}) and every layout calculation are unaffected by
 * the calendar system — only rendered year/month/day labels and the month/year
 * grids change. Resolved through `Intl` calendar support in the date adapter.
 */
export type CalendarSystem =
  | 'gregory'
  | 'islamic'
  | 'islamic-umalqura'
  | 'buddhist'
  | 'japanese'
  | 'persian';

/** Calendar-system year/month/day fields plus an optional era label. */
export interface EraFields {
  /** Year number within the calendar system (e.g. 1446 for Hijri, 2567 for Buddhist). */
  readonly year: number;
  /** Month number within the system, 1-based. */
  readonly month: number;
  /** Day of month within the system, 1-based. */
  readonly day: number;
  /** Localised era name where the system distinguishes eras (e.g. Japanese 令和). */
  readonly eraName?: string;
}
