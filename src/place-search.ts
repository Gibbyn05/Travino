import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type PlaceSearchResult = {
  id: string;
  label: string;
  city?: string;
  region?: string;
  country?: string;
};

type RemotePlace = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

/** Lets an unaccented query such as "alesund" find "Ålesund". */
export const normalisePlaceQuery = (value: string) => value
  .trim()
  .toLocaleLowerCase('en-US')
  .replace(/æ/g, 'ae')
  .replace(/ø/g, 'o')
  .replace(/å/g, 'a')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const placeLabel = ({ city, region, country }: Pick<PlaceSearchResult, 'city' | 'region' | 'country'>) => {
  const parts = [city, region, country].filter((part): part is string => Boolean(part?.trim()));
  return parts.filter((part, index) => normalisePlaceQuery(part) !== normalisePlaceQuery(parts[index - 1] ?? '')).join(', ');
};

const uniquePlaces = (places: PlaceSearchResult[]) => {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = normalisePlaceQuery(place.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
};

async function coreLocationPlaces(query: string): Promise<PlaceSearchResult[]> {
  if (Platform.OS === 'web') return [];
  const coordinates = await Location.geocodeAsync(query);
  const addresses = await Promise.all(coordinates.slice(0, 6).map(async (coordinate) => {
    const [address] = await Location.reverseGeocodeAsync(coordinate);
    if (!address) return undefined;
    const city = address.city || address.district || address.subregion || address.name || undefined;
    const region = address.region || (address.subregion !== city ? address.subregion : undefined) || undefined;
    const country = address.country || undefined;
    const label = placeLabel({ city, region, country });
    return label ? {
      id: `core-location-${coordinate.latitude}-${coordinate.longitude}`,
      label,
      ...(city ? { city } : {}),
      ...(region ? { region } : {}),
      ...(country ? { country } : {}),
    } satisfies PlaceSearchResult : undefined;
  }));
  return addresses.filter(Boolean) as PlaceSearchResult[];
}

async function remotePlaces(query: string): Promise<PlaceSearchResult[]> {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
  if (!response.ok) return [];
  const payload = await response.json() as { results?: RemotePlace[] };
  return (payload.results ?? []).map((place) => {
    const city = place.name;
    const region = place.admin1;
    const country = place.country;
    return { id: `open-meteo-${place.id}`, label: placeLabel({ city, region, country }), city, region, country };
  }).filter((place) => Boolean(place.label));
}

/**
 * Native iOS searches use Core Location's CLGeocoder through Expo Location.
 * The open geocoder supplements it when Core Location is unavailable or its
 * result set is sparse, including for unaccented place names.
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const normalised = normalisePlaceQuery(trimmed);
  const searchTerms = [...new Set([trimmed, normalised].filter(Boolean))];
  const [native, ...remote] = await Promise.all([
    coreLocationPlaces(trimmed).catch(() => []),
    ...searchTerms.map((term) => remotePlaces(term).catch(() => [])),
  ]);
  return uniquePlaces([...(native as PlaceSearchResult[]), ...remote.flat()]);
}
