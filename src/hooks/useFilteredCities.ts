import { useMemo } from 'react';
import { CITIES, type ActivityTag, type City } from '../data/cities';

export type TransportMode = 'train' | 'drive' | 'both';

export interface Filters {
  radiusKm: number;
  transport: TransportMode;
  activities: ActivityTag[]; // empty array == "any"
}

export function useFilteredCities(filters: Filters): City[] {
  return useMemo(() => {
    return CITIES.filter((city) => {
      // Radius (crow-flies)
      if (city.distanceKm > filters.radiusKm) return false;

      // Transport feasibility — if the selected transport has a 0 value
      // (e.g. no direct HSR to that water town), exclude it when user
      // specifically picked Train. "Both" keeps everything reachable.
      if (filters.transport === 'train' && city.trainMinutes <= 0) return false;
      if (filters.transport === 'drive' && city.driveMinutes <= 0) return false;

      // Activity tags — "any" (empty) keeps all
      if (filters.activities.length > 0) {
        const hasMatch = city.tags.some((t) => filters.activities.includes(t));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [filters.radiusKm, filters.transport, filters.activities]);
}
