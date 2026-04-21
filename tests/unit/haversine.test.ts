import { describe, it, expect } from 'vitest';
import { haversineKm } from '../../src/lib/geoUtils';

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 5);
  });

  it('is symmetric', () => {
    const d1 = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    const d2 = haversineKm(48.8566, 2.3522, 51.5074, -0.1278);
    expect(d1).toBeCloseTo(d2, 5);
  });

  // Known city pairs with well-documented distances
  it('London to Paris is ~340 km', () => {
    const d = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(350);
  });

  it('New York to Los Angeles is ~3940 km', () => {
    const d = haversineKm(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(3980);
  });

  it('London to Sydney is ~16 900 km', () => {
    const d = haversineKm(51.5074, -0.1278, -33.8688, 151.2093);
    expect(d).toBeGreaterThan(16800);
    expect(d).toBeLessThan(17100);
  });

  it('equatorial degree is ~111 km', () => {
    // One degree of longitude on the equator
    expect(haversineKm(0, 0, 0, 1)).toBeCloseTo(111.19, 0);
  });

  it('works across the antimeridian (Auckland to Los Angeles)', () => {
    const d = haversineKm(-36.8485, 174.7633, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(10000);
    expect(d).toBeLessThan(11500);
  });

  it('works between the hemispheres (north/south)', () => {
    // London to Cape Town
    const d = haversineKm(51.5074, -0.1278, -33.9249, 18.4241);
    expect(d).toBeGreaterThan(9500);
    expect(d).toBeLessThan(10000);
  });

  it('returns a positive number for any non-identical pair', () => {
    expect(haversineKm(0, 0, 1, 1)).toBeGreaterThan(0);
    expect(haversineKm(-90, 0, 90, 0)).toBeGreaterThan(0);
  });

  it('handles pole-to-pole (maximum ~20 000 km)', () => {
    const d = haversineKm(-90, 0, 90, 0);
    // Earth's polar diameter ≈ 20 004 km
    expect(d).toBeGreaterThan(19900);
    expect(d).toBeLessThan(20100);
  });
});
