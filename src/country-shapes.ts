import world from './data/country-boundaries.json' with { type: 'json' };

type Point = [number, number];
type Polygon = Point[][];
type Geometry = { type: 'Polygon'; coordinates: Polygon } | { type: 'MultiPolygon'; coordinates: Polygon[] };
type Feature = { properties?: { NAME_EN?: string; ADMIN?: string; NAME?: string }; geometry?: Geometry };

export type MapCoordinate = { latitude: number; longitude: number };
export type CountryShape = { country: string; rings: MapCoordinate[][]; labelCoordinate: MapCoordinate };

const normalise = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, ' ').trim();
const aliases: Record<string, string[]> = {
  'united states': ['united states of america', 'usa', 'us'],
  'united kingdom': ['uk', 'great britain', 'britain', 'england'],
  netherlands: ['the netherlands'],
  'united arab emirates': ['uae'],
  'south korea': ['republic of korea'],
  'ivory coast': ['cote divoire'],
};

function namesFor(country: string) {
  const key = normalise(country);
  const canonical = Object.entries(aliases).find(([name, values]) => name === key || values.map(normalise).includes(key))?.[0] ?? key;
  return new Set([canonical, ...(aliases[canonical] ?? [])].map(normalise));
}

function boundaryNames(feature: Feature) {
  return [feature.properties?.NAME_EN, feature.properties?.ADMIN, feature.properties?.NAME].filter((value): value is string => Boolean(value)).map(normalise);
}

function polygonRings(geometry?: Geometry): Polygon[] {
  if (!geometry) return [];
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function coordinateRing(points: Point[]) {
  // The Natural Earth outlines are intentionally reduced before reaching
  // MapKit. It keeps multi-continent maps responsive while preserving a clear
  // country silhouette at the travel-map zoom levels.
  const step = Math.max(1, Math.ceil(points.length / 140));
  const simplified = points.filter((_, index) => index % step === 0 || index === points.length - 1);
  return simplified.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function labelCoordinate(rings: MapCoordinate[][]) {
  const largest = [...rings].sort((a, b) => b.length - a.length)[0] ?? [];
  if (!largest.length) return { latitude: 0, longitude: 0 };
  return {
    latitude: largest.reduce((total, point) => total + point.latitude, 0) / largest.length,
    longitude: largest.reduce((total, point) => total + point.longitude, 0) / largest.length,
  };
}

export function countryShapesFor(countries: string[]): CountryShape[] {
  const features = (world as unknown as { features: Feature[] }).features;
  return countries.map((country) => {
    const names = namesFor(country);
    const feature = features.find((item) => boundaryNames(item).some((name) => names.has(name)));
    if (!feature) return null;
    const rings = polygonRings(feature.geometry).map((polygon) => coordinateRing(polygon[0] ?? [])).filter((ring) => ring.length >= 3);
    return rings.length ? { country, rings, labelCoordinate: labelCoordinate(rings) } : null;
  }).filter((shape): shape is CountryShape => Boolean(shape));
}
