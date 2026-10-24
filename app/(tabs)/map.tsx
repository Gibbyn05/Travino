import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CapybaraMoment } from '@/src/ui';
import { Trip, useTravel } from '@/src/store';
import { CountryShape, countryShapesFor } from '@/src/country-shapes';
import { formatTripDates } from '@/src/dates';
import { TripLocation, resolveTripCoordinates } from '@/src/trip-locations';
import { tripPresentation } from '@/src/trip-presentation';
import { colors, fonts } from '@/src/theme';

const WORLD_REGION: Region = { latitude: 24, longitude: 8, latitudeDelta: 118, longitudeDelta: 176 };
type MapPlace = TripLocation & { trip: Trip };
type MapSelection = { kind: 'trip'; id: string } | { kind: 'country'; country: string };

const dateValue = (value: string) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; };
const today = () => new Date().setHours(0, 0, 0, 0);
const isCompleted = (trip: Trip) => { const end = dateValue(trip.endDate); return end !== null && end < today(); };
const tripStatus = (trip: Trip) => {
  if (isCompleted(trip)) return 'Past';
  const start = dateValue(trip.startDate);
  return start !== null && start <= today() ? 'Active' : 'Upcoming';
};
const destinationsKey = (trips: Trip[]) => trips.map((trip) => `${trip.id}:${trip.city}:${trip.country}:${trip.title}:${trip.startDate}:${trip.endDate}`).join('|');

function regionFor(places: MapPlace[]): Region {
  if (!places.length) return WORLD_REGION;
  if (places.length === 1) return { latitude: places[0].latitude, longitude: places[0].longitude, latitudeDelta: 6, longitudeDelta: 6 };
  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitudeDelta: Math.min(118, Math.max(7, (Math.max(...latitudes) - Math.min(...latitudes)) * 1.55)),
    longitudeDelta: Math.min(176, Math.max(7, (Math.max(...longitudes) - Math.min(...longitudes)) * 1.55)),
  };
}

function useMapPlaces(trips: Trip[]) {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const key = destinationsKey(trips);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(trips.filter((trip) => trip.city.trim() && trip.country.trim()).map(async (trip) => {
      const coordinates = await resolveTripCoordinates(trip.city, trip.country);
      return coordinates ? { id: trip.id, title: trip.title, city: trip.city, country: trip.country, completed: isCompleted(trip), trip, ...coordinates } : null;
    })).then((resolved) => {
      if (!active) return;
      setPlaces(resolved.filter((place): place is MapPlace => Boolean(place)));
      setLoading(false);
    }).catch(() => { if (active) { setPlaces([]); setLoading(false); } });
    return () => { active = false; };
  }, [key]);
  return { places, loading };
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { trips, setSelectedTripId } = useTravel();
  const { places, loading: placesLoading } = useMapPlaces(trips);
  const map = useRef<MapView>(null);
  const [selection, setSelection] = useState<MapSelection>();
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [regionDelta, setRegionDelta] = useState(WORLD_REGION.latitudeDelta);
  const region = useMemo(() => regionFor(places), [places]);
  const visitedCountries = useMemo(() => [...new Set(trips.filter(isCompleted).map((trip) => trip.country).filter(Boolean))], [trips]);
  const countryShapes = useMemo(() => countryShapesFor(visitedCountries), [visitedCountries.join('|')]);
  const upcoming = places.find((place) => !place.completed) ?? places[0];
  const selectedTrip = selection?.kind === 'trip' ? places.find((place) => place.id === selection.id) : undefined;
  const countryTrips = selection?.kind === 'country' ? places.filter((place) => place.country === selection.country) : [];
  const cardTrips = selectedTrip ? [selectedTrip] : countryTrips.length ? countryTrips : upcoming ? [upcoming] : [];

  useEffect(() => { setMapReady(false); setMapFailed(false); }, [retry]);
  useEffect(() => {
    if (placesLoading || mapReady || mapFailed) return;
    const timeout = setTimeout(() => setMapFailed(true), 8000);
    return () => clearTimeout(timeout);
  }, [placesLoading, mapReady, mapFailed, retry]);
  useEffect(() => { if (mapReady) map.current?.animateToRegion(region, 450); }, [mapReady, region]);
  useEffect(() => { if (!selection && upcoming) setSelection({ kind: 'trip', id: upcoming.id }); }, [selection, upcoming]);

  const openTrip = (trip: Trip) => { setSelectedTripId(trip.id); router.push('/trip'); };
  const openMemories = (trip: Trip) => router.push({ pathname: '/memory-book/[country]', params: { country: trip.country || trip.city, tripId: trip.id } } as never);
  const tryAgain = () => setRetry((value) => value + 1);

  return <View style={s.page}>
    {mapFailed ? <MapFailure onRetry={tryAgain}/> : <MapView
      key={retry}
      ref={map}
      initialRegion={region}
      onMapReady={() => setMapReady(true)}
      onMapLoaded={() => setMapReady(true)}
      onRegionChangeComplete={(next) => setRegionDelta(next.latitudeDelta)}
      mapType="standard"
      showsPointsOfInterests={false}
      showsTraffic={false}
      showsBuildings={false}
      showsCompass={false}
      showsScale={false}
      rotateEnabled={false}
      style={s.map}
      accessibilityLabel="Your personal travel map"
    >
      {countryShapes.map((shape) => <VisitedCountry key={shape.country} shape={shape} onPress={() => setSelection({ kind: 'country', country: shape.country })}/>) }
      {regionDelta < 30 ? countryShapes.map((shape) => <Marker key={`${shape.country}-label`} coordinate={shape.labelCoordinate} onPress={() => setSelection({ kind: 'country', country: shape.country })} tracksViewChanges={false}><View style={s.countryLabel}><Text style={s.countryLabelText}>{shape.country}</Text></View></Marker>) : null}
      {places.map((place) => <TripMarker key={place.id} place={place} selected={selectedTrip?.id === place.id} onPress={() => setSelection({ kind: 'trip', id: place.id })}/>) }
    </MapView>}
    {!mapFailed && <View pointerEvents="none" style={[s.header, { top: insets.top + 12 }]}><View style={s.titlePill}><Ionicons name="map-outline" size={18} color={colors.text}/><Text style={s.title}>Travel map</Text>{visitedCountries.length ? <Text style={s.visitedCount}>{visitedCountries.length} visited</Text> : null}</View></View>}
    {!mapFailed && placesLoading ? <View style={s.loading}><Text style={s.loadingText}>Placing your travels …</Text></View> : null}
    {!mapFailed && !placesLoading && !mapReady ? <View style={s.loading}><Text style={s.loadingText}>Opening your map …</Text></View> : null}
    {!mapFailed && <View style={s.bottomArea}>{cardTrips.length ? <TripCard trips={cardTrips} country={selection?.kind === 'country' ? selection.country : undefined} onOpenTrip={openTrip} onOpenMemories={openMemories}/> : !placesLoading ? <EmptyCard/> : null}</View>}
  </View>;
}

function VisitedCountry({ shape, onPress }: { shape: CountryShape; onPress: () => void }) {
  return <>{shape.rings.map((coordinates, index) => <Polygon key={`${shape.country}-${index}`} coordinates={coordinates} tappable onPress={onPress} fillColor="rgba(22,112,239,0.20)" strokeColor="rgba(22,112,239,0.56)" strokeWidth={1.25}/>)}</>;
}

function TripMarker({ place, selected, onPress }: { place: MapPlace; selected: boolean; onPress: () => void }) {
  const presentation = tripPresentation(place.trip);
  return <Marker coordinate={{ latitude: place.latitude, longitude: place.longitude }} onPress={onPress} accessibilityLabel={`${place.city}, ${place.country}`} tracksViewChanges={false}><View style={[s.marker, place.completed ? s.pastMarker : { backgroundColor: presentation.color }, selected && s.selectedMarker]}><Ionicons name={presentation.icon as keyof typeof Ionicons.glyphMap} size={17} color={place.completed ? presentation.color : '#FFFFFF'}/></View></Marker>;
}

function TripCard({ trips, country, onOpenTrip, onOpenMemories }: { trips: MapPlace[]; country?: string; onOpenTrip: (trip: Trip) => void; onOpenMemories: (trip: Trip) => void }) {
  const first = trips[0]; const presentation = tripPresentation(first.trip);
  return <View style={s.tripSheet}><View style={s.handle}/><View style={s.sheetHeading}><View style={[s.sheetMarker, first.completed ? s.pastMarker : { backgroundColor: presentation.color }]}><Ionicons name={presentation.icon as keyof typeof Ionicons.glyphMap} size={18} color={first.completed ? presentation.color : '#FFFFFF'}/></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>{country ? `TRIPS IN ${country.toLocaleUpperCase('en-US')}` : first.completed ? 'A PLACE YOU VISITED' : 'YOUR UPCOMING ADVENTURE'}</Text><Text style={s.destination}>{country ?? first.city}</Text></View></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.tripList}>{trips.map((place) => <View key={place.id} style={s.tripRow}><View style={{ flex: 1 }}><Text style={s.tripName} numberOfLines={1}>{place.title}</Text><Text style={s.tripMeta}>{formatTripDates(place.trip.startDate, place.trip.endDate)} · {tripStatus(place.trip)}</Text></View><Pressable accessibilityRole="button" onPress={() => onOpenTrip(place.trip)} style={s.tripAction}><Text style={s.tripActionText}>Open</Text></Pressable>{place.trip.memories.length ? <Pressable accessibilityRole="button" onPress={() => onOpenMemories(place.trip)} style={s.memoryAction}><Ionicons name="book-outline" size={16} color={colors.blue}/></Pressable> : null}</View>)}</ScrollView></View>;
}

function EmptyCard() { return <View style={s.emptySheet}><View style={s.handle}/><CapybaraMoment size={96}/><Text style={s.emptyTitle}>Your map is waiting.</Text><Text style={s.emptyCopy}>Plan a trip and its destination will appear here.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/')} style={s.emptyAction}><Text style={s.emptyActionText}>Plan a trip</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF"/></Pressable></View>; }
function MapFailure({ onRetry }: { onRetry: () => void }) { return <View style={s.failure}><CapybaraMoment size={120} variant="packing"/><Text style={s.failureTitle}>The map took a wrong turn.</Text><Text style={s.failureCopy}>Your trips are still safe. Try opening the map again.</Text><Pressable accessibilityRole="button" onPress={onRetry} style={s.retry}><Ionicons name="refresh" size={18} color="#FFFFFF"/><Text style={s.retryText}>Try again</Text></Pressable></View>; }

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#E9F0EE' }, map: { flex: 1, backgroundColor: '#E9F0EE' },
  header: { position: 'absolute', left: 20, right: 20, alignItems: 'center' }, titlePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.95)', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11, shadowColor: '#53635B', shadowOpacity: .16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700' }, visitedCount: { color: colors.blue, fontSize: 11, fontWeight: '700', borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 8 },
  loading: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,.95)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, shadowColor: '#53635B', shadowOpacity: .12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, loadingText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  marker: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#172833', shadowOpacity: .2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, pastMarker: { backgroundColor: '#FFFFFF', borderColor: '#D7E4E1' }, selectedMarker: { transform: [{ scale: 1.13 }], borderColor: colors.sun }, countryLabel: { backgroundColor: 'rgba(255,255,255,.88)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(22,112,239,.18)' }, countryLabelText: { color: '#396A79', fontSize: 11, fontWeight: '800' },
  bottomArea: { position: 'absolute', left: 12, right: 12, bottom: 13 }, tripSheet: { backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 15, paddingTop: 9, shadowColor: '#405B55', shadowOpacity: .18, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 7, maxHeight: 276 }, handle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#CCD3D5', alignSelf: 'center', marginBottom: 12 }, sheetHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sheetMarker: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .8 }, destination: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', letterSpacing: -.15, marginTop: 2 }, tripList: { gap: 8, marginTop: 13 }, tripRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#EEF1EF' }, tripName: { color: colors.text, fontSize: 14, fontWeight: '700' }, tripMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, tripAction: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EAF2FF' }, tripActionText: { color: colors.blue, fontSize: 12, fontWeight: '800' }, memoryAction: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F6' },
  emptySheet: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 18, shadowColor: '#405B55', shadowOpacity: .17, shadowRadius: 20, shadowOffset: { width: 0, height: 7 }, elevation: 6 }, emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 7 }, emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center', maxWidth: 270 }, emptyAction: { minHeight: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15 }, emptyActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  failure: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, backgroundColor: colors.background }, failureTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700', marginTop: 15 }, failureCopy: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 7 }, retry: { minHeight: 50, paddingHorizontal: 19, borderRadius: 25, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
