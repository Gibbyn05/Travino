export type TripLocation = {
  id: string;
  title: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  completed: boolean;
};

type Coordinates = Pick<TripLocation, 'latitude' | 'longitude'>;

const normalise = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, ' ').trim();

// The most common destinations are instant. Other destinations are resolved once
// with Open-Meteo's public geocoder and kept in memory for the current session.
const knownCities: Record<string, Coordinates> = {
  'alicante spain': { latitude: 38.3452, longitude: -0.481 },
  'amalfi italy': { latitude: 40.634, longitude: 14.6027 },
  'amsterdam netherlands': { latitude: 52.3676, longitude: 4.9041 },
  'bali indonesia': { latitude: -8.4095, longitude: 115.1889 },
  'bangkok thailand': { latitude: 13.7563, longitude: 100.5018 },
  'barcelona spain': { latitude: 41.3874, longitude: 2.1686 },
  'berlin germany': { latitude: 52.52, longitude: 13.405 },
  'cape town south africa': { latitude: -33.9249, longitude: 18.4241 },
  'copenhagen denmark': { latitude: 55.6761, longitude: 12.5683 },
  'crete greece': { latitude: 35.2401, longitude: 24.8093 },
  'dubai united arab emirates': { latitude: 25.2048, longitude: 55.2708 },
  'london united kingdom': { latitude: 51.5072, longitude: -0.1276 },
  'lisbon portugal': { latitude: 38.7223, longitude: -9.1393 },
  'madeira portugal': { latitude: 32.7607, longitude: -16.9595 },
  'madrid spain': { latitude: 40.4168, longitude: -3.7038 },
  'malaga spain': { latitude: 36.7213, longitude: -4.4214 },
  'mallorca spain': { latitude: 39.6953, longitude: 3.0176 },
  'marrakech morocco': { latitude: 31.6295, longitude: -7.9811 },
  'miami usa': { latitude: 25.7617, longitude: -80.1918 },
  'miami united states': { latitude: 25.7617, longitude: -80.1918 },
  'milan italy': { latitude: 45.4642, longitude: 9.19 },
  'new york usa': { latitude: 40.7128, longitude: -74.006 },
  'new york united states': { latitude: 40.7128, longitude: -74.006 },
  'nice france': { latitude: 43.7102, longitude: 7.262 },
  'paris france': { latitude: 48.8566, longitude: 2.3522 },
  'phuket thailand': { latitude: 7.8804, longitude: 98.3923 },
  'reykjavik iceland': { latitude: 64.1466, longitude: -21.9426 },
  'rome italy': { latitude: 41.9028, longitude: 12.4964 },
  'santorini greece': { latitude: 36.3932, longitude: 25.4615 },
  'split croatia': { latitude: 43.5081, longitude: 16.4402 },
  'stockholm sweden': { latitude: 59.3293, longitude: 18.0686 },
  'sydney australia': { latitude: -33.8688, longitude: 151.2093 },
  'tokyo japan': { latitude: 35.6762, longitude: 139.6503 },
  'koh samui thailand': { latitude: 9.512, longitude: 100.0136 },
};

const cache = new Map<string, Coordinates | null>();
const keyFor = (city: string, country: string) => `${normalise(city)} ${normalise(country)}`;

function sameCountry(expected: string, candidate: string) {
  const wanted = normalise(expected);
  const actual = normalise(candidate);
  if (wanted === actual) return true;
  return (wanted === 'usa' && actual === 'united states') || (wanted === 'united states' && actual === 'usa') || (wanted === 'uk' && actual === 'united kingdom') || (wanted === 'united kingdom' && actual === 'uk');
}

export async function resolveTripCoordinates(city: string, country: string): Promise<Coordinates | null> {
  const key = keyFor(city, country);
  if (knownCities[key]) return knownCities[key];
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`);
    if (!response.ok) throw new Error('Could not find destination');
    const payload = await response.json() as { results?: { latitude: number; longitude: number; country?: string }[] };
    const match = payload.results?.find((result) => result.country && sameCountry(country, result.country)) ?? payload.results?.[0];
    const coordinates = match ? { latitude: match.latitude, longitude: match.longitude } : null;
    cache.set(key, coordinates);
    return coordinates;
  } catch {
    cache.set(key, null);
    return null;
  }
}
