import type { CalendarResource } from '../model/calendar-resource';

/** A resource placed in the flattened, depth-annotated tree order. */
export interface FlatResource<TMeta = unknown> {
  readonly resource: CalendarResource<TMeta>;
  /** Nesting depth (0 = root). */
  readonly depth: number;
  /** Whether this resource has at least one child. */
  readonly hasChildren: boolean;
}

/**
 * Flatten a resource forest (linked by `parentId`) into depth-first display order,
 * honouring each parent's `expanded` flag: a collapsed parent's descendants are
 * omitted. Roots preserve input order; siblings preserve input order. Cycle-safe
 * (a resource already visited is never expanded again) and orphan-safe (a node
 * whose `parentId` matches nothing is treated as a root).
 */
export function flattenResources<TMeta = unknown>(
  resources: readonly CalendarResource<TMeta>[],
): readonly FlatResource<TMeta>[] {
  const childrenOf = new Map<string, CalendarResource<TMeta>[]>();
  const ids = new Set(resources.map((r) => r.id));
  const roots: CalendarResource<TMeta>[] = [];

  for (const r of resources) {
    const parentId = r.parentId;
    if (parentId !== undefined && ids.has(parentId) && parentId !== r.id) {
      const bucket = childrenOf.get(parentId);
      if (bucket) {
        bucket.push(r);
      } else {
        childrenOf.set(parentId, [r]);
      }
    } else {
      roots.push(r);
    }
  }

  const out: FlatResource<TMeta>[] = [];
  const visited = new Set<string>();

  const walk = (node: CalendarResource<TMeta>, depth: number): void => {
    if (visited.has(node.id)) {
      return; // cycle guard
    }
    visited.add(node.id);
    const kids = childrenOf.get(node.id) ?? [];
    out.push({ resource: node, depth, hasChildren: kids.length > 0 });
    if (node.expanded !== false) {
      for (const kid of kids) {
        walk(kid, depth + 1);
      }
    }
  };

  for (const root of roots) {
    walk(root, 0);
  }
  return out;
}
