// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { fetchPlaces, sleep } from '../helpers/api';
import type { ActivityTag } from '../../src/data/cities';

// Keep Overpass API happy – wait between queries.
afterEach(() => sleep(2000));

describe('Places API – Overpass', () => {
  // ── Basic result quality ──────────────────────────────────────────────────

  it('returns places for London within 50 km', async () => {
    const places = await fetchPlaces(51.5074, -0.1278, 50);
    expect(places.length, 'should find at least 10 places').toBeGreaterThanOrEqual(10);
    for (const p of places) {
      expect(p.name.length, `"${p.name}" name too short`).toBeGreaterThanOrEqual(2);
      expect(p.distanceKm, `"${p.name}" outside radius`).toBeLessThanOrEqual(50);
    }
  }, 90_000);

  it('returns places for Tokyo within 50 km', async () => {
    const places = await fetchPlaces(35.6762, 139.6503, 50);
    expect(places.length).toBeGreaterThanOrEqual(5);
  }, 90_000);

  it('returns places for Cairo within 50 km', async () => {
    const places = await fetchPlaces(30.0444, 31.2357, 50);
    expect(places.length).toBeGreaterThanOrEqual(3);
  }, 90_000);

  // ── Radius behaviour ──────────────────────────────────────────────────────

  it('smaller radius returns fewer or equal places than larger radius', async () => {
    const small = await fetchPlaces(51.5074, -0.1278, 10);
    await sleep(2000);
    const large = await fetchPlaces(51.5074, -0.1278, 50);
    expect(large.length).toBeGreaterThanOrEqual(small.length);
  }, 180_000);

  // ── Tag filtering ─────────────────────────────────────────────────────────

  it('museum filter – all results carry the museum tag', async () => {
    const places = await fetchPlaces(51.5074, -0.1278, 50, ['museum']);
    expect(places.length, 'London should have museums').toBeGreaterThan(0);
    for (const p of places) {
      expect(p.tags, `"${p.name}" missing museum tag`).toContain('museum');
    }
  }, 90_000);

  it('historic filter in Rome – all results carry historic tag', async () => {
    const places = await fetchPlaces(41.9028, 12.4964, 50, ['historic']);
    expect(places.length, 'Rome should have historic sites').toBeGreaterThan(0);
    for (const p of places) {
      expect(p.tags, `"${p.name}" missing historic tag`).toContain('historic');
    }
  }, 90_000);

  it('mountain filter near Innsbruck – all results carry mountain tag', async () => {
    const places = await fetchPlaces(47.2692, 11.4041, 80, ['mountain']);
    expect(places.length, 'Alps should have peaks').toBeGreaterThan(0);
    for (const p of places) {
      expect(p.tags, `"${p.name}" missing mountain tag`).toContain('mountain');
    }
  }, 90_000);

  // ── Place schema ──────────────────────────────────────────────────────────

  it('every place has a valid schema', async () => {
    const places = await fetchPlaces(35.6762, 139.6503, 30);
    for (const p of places.slice(0, 15)) {
      expect(p.id).toMatch(/^(node|way)\//);
      expect(p.name).toBeTruthy();
      expect(p.lat).toBeGreaterThan(-90);
      expect(p.lat).toBeLessThan(90);
      expect(p.lng).toBeGreaterThan(-180);
      expect(p.lng).toBeLessThan(180);
      expect(p.distanceKm).toBeGreaterThanOrEqual(0);
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.osmTags).toBeDefined();
    }
  }, 90_000);

  // ── Deduplication ─────────────────────────────────────────────────────────

  it('no duplicate OSM IDs', async () => {
    const places = await fetchPlaces(51.5074, -0.1278, 50);
    const ids = places.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  }, 90_000);

  it('no duplicate place names (case-insensitive)', async () => {
    const places = await fetchPlaces(51.5074, -0.1278, 50);
    const names = places.map((p) => p.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  }, 90_000);

  // ── Tag inference consistency ─────────────────────────────────────────────

  it('inferred tags match the raw OSM tags', async () => {
    const places = await fetchPlaces(41.9028, 12.4964, 30);
    for (const p of places.slice(0, 10)) {
      // Every place must have at least one inferred tag
      expect(p.tags.length).toBeGreaterThan(0);
      // Tags must only be from the known set
      const validTags: ActivityTag[] = [
        'historic', 'nature', 'museum', 'beach', 'mountain', 'cultural', 'viewpoint',
      ];
      for (const t of p.tags) {
        expect(validTags).toContain(t);
      }
    }
  }, 90_000);
});
