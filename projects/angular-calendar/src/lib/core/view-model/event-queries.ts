import type { DateAdapter } from '../date-adapter/date-adapter';
import type { CalendarEvent } from '../model/calendar-event';

/** A detected scheduling conflict between two overlapping events. */
export interface EventConflict<TMeta = unknown> {
  readonly a: CalendarEvent<TMeta>;
  readonly b: CalendarEvent<TMeta>;
}

interface Span {
  readonly event: CalendarEvent<unknown>;
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * Detect overlapping events. By default two events conflict when their time
 * intervals overlap **and** they share at least one resource (or both are
 * unassigned). Pass `sameResourceOnly: false` to flag any time overlap globally.
 * Block-out and all-day events are ignored. Pure; uses a per-group sweep so it is
 * O(n log n) within each resource group.
 */
export function detectConflicts<TMeta = unknown>(
  events: readonly CalendarEvent<TMeta>[],
  ctx: { readonly dates: DateAdapter; readonly zone: string; readonly sameResourceOnly?: boolean },
): EventConflict<TMeta>[] {
  const sameResourceOnly = ctx.sameResourceOnly ?? true;
  const spans: Span[] = [];
  for (const event of events) {
    if (event.isBlock === true || event.allDay === true) {
      continue;
    }
    const start = ctx.dates.toZoned(event.start, ctx.zone);
    const end = event.end === undefined ? start : ctx.dates.toZoned(event.end, ctx.zone);
    spans.push({ event, startMs: start.epochMs, endMs: end.epochMs });
  }

  const sharesResource = (a: CalendarEvent<unknown>, b: CalendarEvent<unknown>): boolean => {
    if (!sameResourceOnly) {
      return true;
    }
    const ar = a.resourceIds ?? [];
    const br = b.resourceIds ?? [];
    if (ar.length === 0 && br.length === 0) {
      return true;
    }
    return ar.some((id) => br.includes(id));
  };

  const sorted = [...spans].sort((x, y) => x.startMs - y.startMs);
  const conflicts: EventConflict<TMeta>[] = [];
  const active: Span[] = [];
  for (const span of sorted) {
    // drop active spans that ended at/before this one starts
    for (let i = active.length - 1; i >= 0; i--) {
      if ((active[i]?.endMs ?? 0) <= span.startMs) {
        active.splice(i, 1);
      }
    }
    for (const other of active) {
      if (span.startMs < other.endMs && sharesResource(span.event, other.event)) {
        conflicts.push({
          a: other.event as CalendarEvent<TMeta>,
          b: span.event as CalendarEvent<TMeta>,
        });
      }
    }
    active.push(span);
  }
  return conflicts;
}

/**
 * Filter events to those whose `status` is in `allowed`. Events without a status
 * are kept only when `includeUntagged` is true (default true).
 */
export function filterByStatus<TMeta = unknown>(
  events: readonly CalendarEvent<TMeta>[],
  allowed: ReadonlySet<string>,
  includeUntagged = true,
): CalendarEvent<TMeta>[] {
  return events.filter((e) =>
    e.status === undefined ? includeUntagged : allowed.has(e.status),
  );
}
