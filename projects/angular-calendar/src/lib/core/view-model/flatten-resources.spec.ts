import { describe, it, expect } from 'vitest';
import type { CalendarResource } from '@ascentsparksoftware/angular-calendar';
import { flattenResources } from './flatten-resources';

const r = (id: string, extra: Partial<CalendarResource> = {}): CalendarResource => ({
  id,
  name: id,
  ...extra,
});

describe('flattenResources', () => {
  it('returns roots in order with depth 0', () => {
    const out = flattenResources([r('a'), r('b')]);
    expect(out.map((f) => [f.resource.id, f.depth, f.hasChildren])).toEqual([
      ['a', 0, false],
      ['b', 0, false],
    ]);
  });

  it('nests children depth-first under expanded parents', () => {
    const out = flattenResources([
      r('region', { expanded: true }),
      r('team', { parentId: 'region', expanded: true }),
      r('tech', { parentId: 'team' }),
    ]);
    expect(out.map((f) => [f.resource.id, f.depth])).toEqual([
      ['region', 0],
      ['team', 1],
      ['tech', 2],
    ]);
    expect(out[0]!.hasChildren).toBe(true);
    expect(out[2]!.hasChildren).toBe(false);
  });

  it('omits descendants of a collapsed parent (expanded: false)', () => {
    const out = flattenResources([
      r('region', { expanded: false }),
      r('team', { parentId: 'region' }),
    ]);
    expect(out.map((f) => f.resource.id)).toEqual(['region']);
    expect(out[0]!.hasChildren).toBe(true); // still reports it has children
  });

  it('treats expanded:undefined as expanded (default open)', () => {
    const out = flattenResources([r('p'), r('c', { parentId: 'p' })]);
    expect(out.map((f) => f.resource.id)).toEqual(['p', 'c']);
  });

  it('treats an orphan parentId as a root', () => {
    const out = flattenResources([r('x', { parentId: 'ghost' })]);
    expect(out.map((f) => [f.resource.id, f.depth])).toEqual([['x', 0]]);
  });

  it('is cycle-safe (a→b→a does not loop)', () => {
    const out = flattenResources([
      r('a', { parentId: 'b' }),
      r('b', { parentId: 'a' }),
    ]);
    // both reference each other → neither is a root; nothing is emitted from roots,
    // but the function must terminate and never duplicate a node.
    const ids = out.map((f) => f.resource.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(2);
  });

  it('preserves sibling input order', () => {
    const out = flattenResources([
      r('p', { expanded: true }),
      r('c2', { parentId: 'p' }),
      r('c1', { parentId: 'p' }),
    ]);
    expect(out.map((f) => f.resource.id)).toEqual(['p', 'c2', 'c1']);
  });
});
