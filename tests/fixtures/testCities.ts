import type { ActivityTag } from '../../src/data/cities';

export interface TestCity {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  region: 'Europe' | 'Asia' | 'Americas' | 'Africa' | 'Middle East' | 'Oceania';
  expectedTags: ActivityTag[];
  notes?: string;
}

// Diverse global cities that exercise different tag categories and OSM data densities.
// Coordinates are city-centre points used as the Overpass search origin.
export const TEST_CITIES: TestCity[] = [
  // ── Europe ────────────────────────────────────────────────────────────────
  {
    name: 'London, UK',
    shortName: 'London',
    lat: 51.5074,
    lng: -0.1278,
    region: 'Europe',
    expectedTags: ['historic', 'museum', 'cultural'],
  },
  {
    name: 'Rome, Italy',
    shortName: 'Rome',
    lat: 41.9028,
    lng: 12.4964,
    region: 'Europe',
    expectedTags: ['historic', 'cultural', 'museum'],
  },
  {
    name: 'Prague, Czechia',
    shortName: 'Prague',
    lat: 50.0755,
    lng: 14.4378,
    region: 'Europe',
    expectedTags: ['historic', 'cultural'],
  },
  {
    name: 'Athens, Greece',
    shortName: 'Athens',
    lat: 37.9838,
    lng: 23.7275,
    region: 'Europe',
    expectedTags: ['historic', 'museum'],
  },
  {
    name: 'Innsbruck, Austria',
    shortName: 'Innsbruck',
    lat: 47.2692,
    lng: 11.4041,
    region: 'Europe',
    expectedTags: ['mountain', 'nature'],
    notes: 'Alpine city surrounded by peaks',
  },
  {
    name: 'Barcelona, Spain',
    shortName: 'Barcelona',
    lat: 41.3851,
    lng: 2.1734,
    region: 'Europe',
    expectedTags: ['cultural', 'museum', 'beach'],
  },

  // ── Asia ──────────────────────────────────────────────────────────────────
  {
    name: 'Tokyo, Japan',
    shortName: 'Tokyo',
    lat: 35.6762,
    lng: 139.6503,
    region: 'Asia',
    expectedTags: ['cultural', 'museum', 'historic'],
  },
  {
    name: 'Kyoto, Japan',
    shortName: 'Kyoto',
    lat: 35.0116,
    lng: 135.7681,
    region: 'Asia',
    expectedTags: ['historic', 'cultural'],
    notes: 'Temple-dense Japanese city',
  },
  {
    name: 'Bangkok, Thailand',
    shortName: 'Bangkok',
    lat: 13.7563,
    lng: 100.5018,
    region: 'Asia',
    expectedTags: ['historic', 'cultural'],
  },
  {
    name: 'Bali, Indonesia',
    shortName: 'Bali',
    lat: -8.4095,
    lng: 115.1889,
    region: 'Asia',
    expectedTags: ['beach', 'cultural', 'nature'],
    notes: 'Island with beaches and volcanic peaks',
  },

  // ── Americas ──────────────────────────────────────────────────────────────
  {
    name: 'New York, USA',
    shortName: 'New York',
    lat: 40.7128,
    lng: -74.006,
    region: 'Americas',
    expectedTags: ['museum', 'cultural'],
  },
  {
    name: 'Mexico City, Mexico',
    shortName: 'Mexico City',
    lat: 19.4326,
    lng: -99.1332,
    region: 'Americas',
    expectedTags: ['historic', 'museum', 'cultural'],
  },
  {
    name: 'Buenos Aires, Argentina',
    shortName: 'Buenos Aires',
    lat: -34.6037,
    lng: -58.3816,
    region: 'Americas',
    expectedTags: ['cultural', 'historic'],
  },
  {
    name: 'Cusco, Peru',
    shortName: 'Cusco',
    lat: -13.5319,
    lng: -71.9675,
    region: 'Americas',
    expectedTags: ['historic', 'cultural'],
    notes: 'Former Inca capital at 3,400 m',
  },

  // ── Africa ────────────────────────────────────────────────────────────────
  {
    name: 'Cairo, Egypt',
    shortName: 'Cairo',
    lat: 30.0444,
    lng: 31.2357,
    region: 'Africa',
    expectedTags: ['historic', 'museum'],
  },
  {
    name: 'Marrakech, Morocco',
    shortName: 'Marrakech',
    lat: 31.6295,
    lng: -7.9811,
    region: 'Africa',
    expectedTags: ['historic', 'cultural'],
  },
  {
    name: 'Cape Town, South Africa',
    shortName: 'Cape Town',
    lat: -33.9249,
    lng: 18.4241,
    region: 'Africa',
    expectedTags: ['nature', 'beach', 'cultural'],
    notes: 'Coastal city with Table Mountain',
  },

  // ── Oceania ───────────────────────────────────────────────────────────────
  {
    name: 'Sydney, Australia',
    shortName: 'Sydney',
    lat: -33.8688,
    lng: 151.2093,
    region: 'Oceania',
    expectedTags: ['beach', 'cultural', 'museum'],
  },
  {
    name: 'Queenstown, New Zealand',
    shortName: 'Queenstown',
    lat: -45.0312,
    lng: 168.6626,
    region: 'Oceania',
    expectedTags: ['mountain', 'nature'],
    notes: 'Adventure tourism hub in Southern Alps',
  },
];

// A smaller representative subset used for integration smoke tests.
// Covers all regions with varied expected tag types.
export const SMOKE_CITIES: TestCity[] = [
  TEST_CITIES.find((c) => c.shortName === 'London')!,
  TEST_CITIES.find((c) => c.shortName === 'Kyoto')!,
  TEST_CITIES.find((c) => c.shortName === 'Cairo')!,
  TEST_CITIES.find((c) => c.shortName === 'New York')!,
  TEST_CITIES.find((c) => c.shortName === 'Queenstown')!,
];
