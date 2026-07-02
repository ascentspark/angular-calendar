import type { CalendarEvent, CalendarResource, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

/** Fixed demo timezone + anchor dates so every page renders the same deterministic week. */
export const ZONE = 'America/New_York';

const z = (iso: string): ZonedDateTime => ({ epochMs: Date.parse(iso), zone: ZONE });

/** Monday of the sample week (2026-06-15), noon UTC so it lands mid-morning in New York. */
export const VIEW_DATE: ZonedDateTime = z('2026-06-15T12:00:00Z');
export const TODAY: ZonedDateTime = z('2026-06-15T12:00:00Z');
export const NOW: ZonedDateTime = z('2026-06-15T18:00:00Z');

/** Status → colour map passed to every view via `[statusColors]`. */
export const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  active: '#16a34a',
  done: '#7c3aed',
  cancelled: '#dc2626',
};

/** A representative week of events (timed, all-day and multi-day) with statuses. */
export const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Morning standup', start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T13:30:00Z'), status: 'scheduled' },
  { id: '2', title: 'Design review', start: z('2026-06-15T18:00:00Z'), end: z('2026-06-15T19:00:00Z'), status: 'done' },
  { id: '3', title: 'Sprint planning', start: z('2026-06-15T20:00:00Z'), end: z('2026-06-15T21:00:00Z'), status: 'active' },
  { id: '4', title: 'Weekly 1:1', start: z('2026-06-17T17:00:00Z'), end: z('2026-06-17T17:30:00Z'), status: 'scheduled' },
  { id: '5', title: 'Conference', start: z('2026-06-09T00:00:00Z'), end: z('2026-06-12T00:00:00Z'), allDay: true, status: 'active' },
  { id: '6', title: 'Release', start: z('2026-06-22T14:00:00Z'), end: z('2026-06-22T15:00:00Z'), status: 'scheduled' },
  { id: '7', title: 'Holiday', start: z('2026-06-19T00:00:00Z'), end: z('2026-06-20T00:00:00Z'), allDay: true, status: 'done' },
];

/** Resources (a tree of regions → people) for the timeline / dispatch board. */
export const SAMPLE_RESOURCES: CalendarResource[] = [
  { id: 'east', name: 'East region', expanded: true },
  { id: 'alice', name: 'Alice Ng', parentId: 'east' },
  { id: 'bob', name: 'Bob Reyes', parentId: 'east' },
  { id: 'west', name: 'West region', expanded: true },
  { id: 'carol', name: 'Carol Diaz', parentId: 'west' },
];

/** Events assigned to resources, for the timeline example. */
export const SAMPLE_JOBS: CalendarEvent[] = [
  { id: 'j1', title: 'AC install — 14 Oak St', resourceIds: ['alice'], start: z('2026-06-15T13:00:00Z'), end: z('2026-06-15T15:00:00Z'), status: 'scheduled' },
  { id: 'j2', title: 'Inspection — 9 Pine Ave', resourceIds: ['alice'], start: z('2026-06-15T16:00:00Z'), end: z('2026-06-15T16:30:00Z'), status: 'active' },
  { id: 'j3', title: 'Boiler repair — 5 Elm', resourceIds: ['bob'], start: z('2026-06-15T14:00:00Z'), end: z('2026-06-15T15:30:00Z'), status: 'scheduled' },
  { id: 'j4', title: 'Survey — 100 Center', resourceIds: ['carol'], start: z('2026-06-15T15:00:00Z'), end: z('2026-06-15T17:00:00Z'), status: 'active' },
];
