import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CapybaraMoment } from '@/src/ui';
import { Trip, useTravel } from '@/src/store';
import { resolveTripCoordinates, TripLocation } from '@/src/trip-locations';
import { colors, fonts } from '@/src/theme';

const WORLD_REGION: Region = { latitude: 24, longitude: 8, latitudeDelta: 118, longitudeDelta: 176 };
const dateValue = (value: string) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; };
const isCompleted = (trip: Trip) => { const end = dateValue(trip.endDate); return end !== null && end < new Date().setHours(0, 0, 0, 0); };
const destinationsKey = (trips: Trip[]) => trips.map((trip) => `${trip.id}:${trip.city}:${trip.country}:${trip.title}:${trip.endDate}`).join('|');

function regionFor(places: TripLocation[]): Region {
  if (!places.length) return WORLD_REGION;
  if (places.length === 1) return { latitude: places[0].latitude, longitude: places[0].longitude, latitudeDelta: 6, longitudeDelta: 6 };
  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  const minLat = Math.min(...latitudes); const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes); const maxLng = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.min(118, Math.max(7, (maxLat - minLat) * 1.55)),
    longitudeDelta: Math.min(176, Math.max(7, (maxLng - minLng) * 1.55)),
  };
}

function useMapPlaces(trips: Trip[]) {
  const [places, setPlaces] = useState<TripLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const key = destinationsKey(trips);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(trips.filter((trip) => trip.city.trim() && trip.country.trim()).map(async (trip) => {
      const coordinates = await resolveTripCoordinates(trip.city, trip.country);
      return coordinates ? { id: trip.id, title: trip.title, city: trip.city, country: trip.country, completed: isCompleted(trip), ...coordinates } : null;
    })).then((resolved) => {
      if (!active) return;
      setPlaces(resolved.filter((place): place is TripLocation => Boolean(place)));
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
  const [selectedId, setSelectedId] = useState<string>();
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const selected = places.find((place) => place.id === selectedId) ?? places[0];
  const region = useMemo(() => regionFor(places), [places]);
  const visitedCountries = [...new Set(trips.filter(isCompleted).map((trip) => trip.country).filter(Boolean))];

  useEffect(() => {
    setMapReady(false); setMapFailed(false);
  }, [retry]);
  useEffect(() => {
    if (placesLoading || mapReady || mapFailed) return;
    const timeout = setTimeout(() => setMapFailed(true), 8000);
    return () => clearTimeout(timeout);
  }, [placesLoading, mapReady, mapFailed, retry]);
  useEffect(() => {
    if (mapReady) map.current?.animateToRegion(region, 450);
  }, [mapReady, region]);
  useEffect(() => { if (selected && selected.id !== selectedId) setSelectedId(selected.id); }, [selected, selectedId]);

  const openTrip = () => {
    if (!selected) return;
    setSelectedTripId(selected.id);
    router.push('/trip');
  };
  const tryAgain = () => setRetry((value) => value + 1);

  return <View style={s.page}>
    {mapFailed ? <MapFailure onRetry={tryAgain}/> : <MapView
      key={retry}
      ref={map}
      initialRegion={region}
      onMapReady={() => setMapReady(true)}
      onMapLoaded={() => setMapReady(true)}
      style={s.map}
      accessibilityLabel="Travel map"
      showsCompass={false}
      showsScale={false}
      rotateEnabled={false}
    >
      {places.map((place) => <Marker key={place.id} coordinate={{ latitude: place.latitude, longitude: place.longitude }} onPress={() => setSelectedId(place.id)} accessibilityLabel={`${place.city}, ${place.country}`}>
        <View style={[s.marker, place.completed ? s.completedMarker : s.futureMarker, selected?.id === place.id && s.selectedMarker]}><Ionicons name={place.completed ? 'bookmark' : 'airplane'} size={18} color="#FFFFFF"/></View>
      </Marker>)}
    </MapView>}
    {!mapFailed && <View pointerEvents="none" style={[s.header, { top: insets.top + 12 }]}><View style={s.titlePill}><Ionicons name="map-outline" size={18} color={colors.text}/><Text style={s.title}>Travel map</Text>{visitedCountries.length ? <Text style={s.visitedCount}>{visitedCountries.length} visited</Text> : null}</View></View>}
    {!mapFailed && placesLoading && <View style={s.loading}><Text style={s.loadingText}>Finding your destinations …</Text></View>}
    {!mapFailed && !placesLoading && !mapReady ? <View style={s.loading}><Text style={s.loadingText}>Opening Apple Maps …</Text></View> : null}
    {!mapFailed && <View style={s.bottomArea}>
      {selected ? <Pressable onPress={openTrip} style={({ pressed }) => [s.tripSheet, pressed && s.pressed]}>
        <View style={s.handle}/>
        <View style={s.sheetRow}><View style={[s.sheetMarker, selected.completed ? s.completedMarker : s.futureMarker]}><Ionicons name={selected.completed ? 'bookmark' : 'airplane'} size={19} color="#fff"/></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>{selected.completed ? 'A PLACE YOU VISITED' : 'YOUR UPCOMING ADVENTURE'}</Text><Text style={s.destination}>{selected.city}</Text><Text style={s.country}>{selected.country} · {selected.title}</Text></View><Ionicons name="chevron-forward" size={22} color={colors.muted}/></View>
        {visitedCountries.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.visitedRow}><Text style={s.visitedLabel}>Visited</Text>{visitedCountries.map((country) => <View key={country} style={s.visitedChip}><Text style={s.visitedChipText}>{country}</Text></View>)}</ScrollView> : null}
      </Pressable> : !placesLoading ? <View style={s.emptySheet}><View style={s.handle}/><CapybaraMoment size={56}/><Text style={s.emptyTitle}>Plan your next trip</Text><Text style={s.emptyCopy}>Add a destination and it will get its own bookmark here.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/')} style={s.emptyAction}><Text style={s.emptyActionText}>Plan a trip</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF"/></Pressable></View> : null}
    </View>}
  </View>;
}

function MapFailure({ onRetry }: { onRetry: () => void }) {
  return <View style={s.failure}><CapybaraMoment size={84}/><Text style={s.failureTitle}>The map took a wrong turn.</Text><Text style={s.failureCopy}>Your trips are still safe. Try opening the map again.</Text><Pressable accessibilityRole="button" onPress={onRetry} style={s.retry}><Ionicons name="refresh" size={18} color="#FFFFFF"/><Text style={s.retryText}>Try again</Text></Pressable></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#DCEFF4' }, map: { flex: 1, backgroundColor: '#DCEFF4' },
  header: { position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center' }, titlePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.96)', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11, shadowColor: '#1A303C', shadowOpacity: .16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700' }, visitedCount: { color: colors.blue, fontSize: 11, fontWeight: '700', borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 8 },
  loading: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,.95)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, shadowColor: '#1A303C', shadowOpacity: .12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, loadingText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  marker: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#172833', shadowOpacity: .2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, futureMarker: { backgroundColor: '#437EAE' }, completedMarker: { backgroundColor: '#D66E5A' }, selectedMarker: { transform: [{ scale: 1.12 }], borderColor: colors.sun },
  bottomArea: { position: 'absolute', left: 12, right: 12, bottom: 13 }, tripSheet: { backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 15, paddingTop: 9, shadowColor: '#172833', shadowOpacity: .18, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 7 }, handle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#CCD3D5', alignSelf: 'center', marginBottom: 12 }, sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sheetMarker: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .8 }, destination: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', letterSpacing: -.15, marginTop: 2 }, country: { color: colors.muted, fontSize: 12, marginTop: 2 },
  visitedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border, paddingRight: 6 }, visitedLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, visitedChip: { backgroundColor: '#FFF0E8', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }, visitedChipText: { color: '#A35747', fontSize: 11, fontWeight: '600' },
  emptySheet: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 18, shadowColor: '#172833', shadowOpacity: .17, shadowRadius: 20, shadowOffset: { width: 0, height: 7 }, elevation: 6 }, emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 7 }, emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center', maxWidth: 270 }, emptyAction: { minHeight: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15 }, emptyActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  failure: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, backgroundColor: colors.background }, failureTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700', marginTop: 15 }, failureCopy: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 7 }, retry: { minHeight: 50, paddingHorizontal: 19, borderRadius: 25, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, pressed: { opacity: .86 },
});
