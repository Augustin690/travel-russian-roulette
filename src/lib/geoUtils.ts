export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  const a = `(around:${radiusM},${lat},${lng})`;
  return `[out:json][timeout:90];
(
  node["name"]["tourism"~"^(attraction|viewpoint|museum|gallery|theme_park|zoo|aquarium)$"]${a};
  node["name"]["historic"~"^(castle|ruins|monument|memorial|archaeological_site|fort|tower|city_gate)$"]${a};
  node["name"]["natural"~"^(peak|beach|cave_entrance|hot_spring|waterfall|volcano)$"]${a};
  node["name"]["leisure"~"^(nature_reserve|garden)$"]${a};
  way["name"]["tourism"~"^(attraction|museum|gallery|viewpoint)$"]${a};
  way["name"]["historic"~"^(castle|ruins|monument|archaeological_site|fort)$"]${a};
  way["name"]["natural"="beach"]${a};
  way["name"]["leisure"~"^(nature_reserve|garden)$"]${a};
);
out center tags 100;`;
}
