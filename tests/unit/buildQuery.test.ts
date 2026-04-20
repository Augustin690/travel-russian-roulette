import { describe, it, expect } from 'vitest';
import { buildOverpassQuery } from '../../src/lib/geoUtils';

describe('buildOverpassQuery', () => {
  it('produces valid Overpass QL output format', () => {
    const q = buildOverpassQuery(51.5, -0.1, 50_000);
    expect(q).toContain('[out:json]');
    expect(q).toContain('[timeout:30]');
    expect(q).toContain('out center tags 100');
  });

  it('embeds lat/lng in the correct order', () => {
    const q = buildOverpassQuery(51.5, -0.1, 10_000);
    // Overpass: around:radius,lat,lng
    expect(q).toContain('around:10000,51.5,-0.1');
  });

  it('uses the provided radius in metres', () => {
    expect(buildOverpassQuery(0, 0, 50_000)).toContain('around:50000,0,0');
    expect(buildOverpassQuery(0, 0, 1_000)).toContain('around:1000,0,0');
    expect(buildOverpassQuery(0, 0, 300_000)).toContain('around:300000,0,0');
  });

  // Category coverage
  it('covers tourism categories', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    for (const v of ['museum', 'attraction', 'viewpoint', 'gallery', 'theme_park', 'zoo', 'aquarium']) {
      expect(q, `missing tourism=${v}`).toContain(v);
    }
  });

  it('covers historic categories', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    for (const v of ['castle', 'ruins', 'monument', 'memorial', 'archaeological_site', 'fort']) {
      expect(q, `missing historic=${v}`).toContain(v);
    }
  });

  it('covers natural categories', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    for (const v of ['peak', 'beach', 'cave_entrance', 'hot_spring', 'waterfall', 'volcano']) {
      expect(q, `missing natural=${v}`).toContain(v);
    }
  });

  it('covers leisure categories', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    for (const v of ['nature_reserve', 'garden']) {
      expect(q, `missing leisure=${v}`).toContain(v);
    }
  });

  // Structural requirements
  it('requires [name] filter to exclude unnamed POIs', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    expect(q).toContain('"name"');
  });

  it('includes both node and way queries', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    expect(q).toMatch(/\bnode\[/);
    expect(q).toMatch(/\bway\[/);
  });

  it('limits to 100 results', () => {
    expect(buildOverpassQuery(0, 0, 1000)).toContain('tags 100');
  });

  it('wraps queries in a union block', () => {
    const q = buildOverpassQuery(0, 0, 1000);
    expect(q).toContain('(\n');
    expect(q).toContain('\n);');
  });

  // Edge cases
  it('handles negative coordinates (southern/western hemisphere)', () => {
    const q = buildOverpassQuery(-33.87, -70.65, 20_000);
    expect(q).toContain('around:20000,-33.87,-70.65');
  });

  it('handles zero coordinates', () => {
    const q = buildOverpassQuery(0, 0, 5_000);
    expect(q).toContain('around:5000,0,0');
  });
});
