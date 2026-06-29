import type { WorkingHours } from './working-hours';

/**
 * A schedulable entity (technician, room, vehicle, …) shown as a lane in the
 * timeline/resource views. Resources may form a tree via {@link parentId}.
 *
 * @typeParam TMeta arbitrary consumer payload, carried through untouched.
 */
export interface CalendarResource<TMeta = unknown> {
  /** Stable identity; referenced by `CalendarEvent.resourceIds`. */
  readonly id: string;
  /** Display name (plain text). */
  readonly name: string;
  /** Parent resource id for tree grouping (region → team → tech). */
  readonly parentId?: string;
  /** Whether the resource's children are expanded in the tree. */
  readonly expanded?: boolean;
  /** Optional per-resource accent colour (hex). */
  readonly color?: string;
  /** Per-resource working-hours windows (shift shading). */
  readonly workHours?: readonly WorkingHours[];
  /** Extra CSS class applied to the resource row/header. */
  readonly cssClass?: string;
  /** Arbitrary consumer payload. */
  readonly meta?: TMeta;
}
