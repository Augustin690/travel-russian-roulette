import { describe, it, expect } from 'vitest';
import { inferTags } from '../../src/data/cities';

describe('inferTags', () => {
  // ── Museums ───────────────────────────────────────────────────────────────
  it('identifies museum', () => {
    expect(inferTags({ tourism: 'museum' })).toContain('museum');
  });

  it('identifies gallery as museum', () => {
    expect(inferTags({ tourism: 'gallery' })).toContain('museum');
  });

  it('does not add cultural when museum is present', () => {
    expect(inferTags({ tourism: 'museum' })).not.toContain('cultural');
  });

  // ── Historic ──────────────────────────────────────────────────────────────
  it('identifies any historic value', () => {
    for (const v of ['castle', 'ruins', 'monument', 'memorial', 'archaeological_site', 'fort']) {
      expect(inferTags({ historic: v }), `historic=${v}`).toContain('historic');
    }
  });

  // ── Viewpoint ─────────────────────────────────────────────────────────────
  it('identifies viewpoint', () => {
    expect(inferTags({ tourism: 'viewpoint' })).toContain('viewpoint');
  });

  // ── Beach ─────────────────────────────────────────────────────────────────
  it('identifies beach from natural=beach', () => {
    expect(inferTags({ natural: 'beach' })).toContain('beach');
  });

  it('does not tag non-beach naturals as beach', () => {
    expect(inferTags({ natural: 'peak' })).not.toContain('beach');
  });

  // ── Mountain ──────────────────────────────────────────────────────────────
  it('identifies peak as mountain', () => {
    expect(inferTags({ natural: 'peak' })).toContain('mountain');
  });

  it('identifies volcano as mountain', () => {
    expect(inferTags({ natural: 'volcano' })).toContain('mountain');
  });

  // ── Nature ────────────────────────────────────────────────────────────────
  it('identifies nature_reserve as nature', () => {
    expect(inferTags({ leisure: 'nature_reserve' })).toContain('nature');
  });

  it('identifies garden as nature', () => {
    expect(inferTags({ leisure: 'garden' })).toContain('nature');
  });

  it('identifies waterfall as nature', () => {
    expect(inferTags({ natural: 'waterfall' })).toContain('nature');
  });

  it('identifies cave_entrance as nature', () => {
    expect(inferTags({ natural: 'cave_entrance' })).toContain('nature');
  });

  it('identifies hot_spring as nature', () => {
    expect(inferTags({ natural: 'hot_spring' })).toContain('nature');
  });

  // ── Cultural ──────────────────────────────────────────────────────────────
  it('identifies attraction as cultural', () => {
    expect(inferTags({ tourism: 'attraction' })).toContain('cultural');
  });

  it('identifies theme_park as cultural', () => {
    expect(inferTags({ tourism: 'theme_park' })).toContain('cultural');
  });

  it('identifies zoo as cultural', () => {
    expect(inferTags({ tourism: 'zoo' })).toContain('cultural');
  });

  it('identifies aquarium as cultural', () => {
    expect(inferTags({ tourism: 'aquarium' })).toContain('cultural');
  });

  it('identifies arts_centre as cultural', () => {
    expect(inferTags({ amenity: 'arts_centre' })).toContain('cultural');
  });

  it('identifies theatre as cultural', () => {
    expect(inferTags({ amenity: 'theatre' })).toContain('cultural');
  });

  // ── Default ───────────────────────────────────────────────────────────────
  it('defaults to cultural for empty tags', () => {
    expect(inferTags({})).toEqual(['cultural']);
  });

  it('defaults to cultural for unrecognised tags', () => {
    expect(inferTags({ foo: 'bar', baz: 'qux' })).toEqual(['cultural']);
  });

  // ── Multiple tags ─────────────────────────────────────────────────────────
  it('combines museum and historic correctly', () => {
    const tags = inferTags({ tourism: 'museum', historic: 'castle' });
    expect(tags).toContain('museum');
    expect(tags).toContain('historic');
    expect(tags).not.toContain('cultural');
  });

  it('combines mountain and nature for a natural hot spring on a peak', () => {
    const tags = inferTags({ natural: 'peak', leisure: 'nature_reserve' });
    expect(tags).toContain('mountain');
    expect(tags).toContain('nature');
  });

  it('combines viewpoint and historic', () => {
    const tags = inferTags({ tourism: 'viewpoint', historic: 'fort' });
    expect(tags).toContain('viewpoint');
    expect(tags).toContain('historic');
  });

  // ── No duplicate tags ─────────────────────────────────────────────────────
  it('never returns duplicate tags', () => {
    const tags = inferTags({ tourism: 'museum', historic: 'monument', natural: 'peak' });
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('always returns at least one tag', () => {
    expect(inferTags({})).toHaveLength(1);
    expect(inferTags({ tourism: 'museum' }).length).toBeGreaterThan(0);
  });
});
