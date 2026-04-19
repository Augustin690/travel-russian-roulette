export type ActivityTag =
  | 'historic'
  | 'nature'
  | 'museum'
  | 'beach'
  | 'mountain'
  | 'cultural'
  | 'viewpoint';

export interface City {
  id: string;           // "node/123456" or "way/789"
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;   // haversine from origin, calculated on fetch
  tags: ActivityTag[];
  osmTags: Record<string, string>;
  image?: string;       // Wikipedia thumbnail, enriched async after selection
  description?: string; // Wikipedia extract, enriched async after selection
}

export function inferTags(osmTags: Record<string, string>): ActivityTag[] {
  const result: ActivityTag[] = [];

  if (osmTags.historic) result.push('historic');

  if (osmTags.natural === 'peak' || osmTags.natural === 'volcano') result.push('mountain');

  if (osmTags.natural === 'beach') result.push('beach');

  if (osmTags.tourism === 'viewpoint') result.push('viewpoint');

  if (osmTags.tourism === 'museum' || osmTags.tourism === 'gallery') result.push('museum');

  if (
    osmTags.leisure === 'nature_reserve' ||
    osmTags.leisure === 'garden' ||
    osmTags.leisure === 'park' ||
    osmTags.natural === 'waterfall' ||
    osmTags.natural === 'cave_entrance' ||
    osmTags.natural === 'hot_spring'
  ) result.push('nature');

  if (
    (osmTags.tourism === 'attraction' ||
      osmTags.tourism === 'artwork' ||
      osmTags.tourism === 'theme_park' ||
      osmTags.tourism === 'zoo' ||
      osmTags.tourism === 'aquarium' ||
      osmTags.amenity === 'arts_centre' ||
      osmTags.amenity === 'theatre') &&
    !result.includes('museum')
  ) result.push('cultural');

  if (result.length === 0) result.push('cultural');
  return result;
}
