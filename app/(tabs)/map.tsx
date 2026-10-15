import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Trip, useTravel } from '@/src/store';
import { buildTravelMapHtml } from '@/src/travel-map-html';
import { resolveTripCoordinates, TripLocation } from '@/src/trip-locations';
import { colors } from '@/src/theme';

const dateValue = (value: string) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; };
const isCompleted = (trip: Trip) => { const end = dateValue(trip.endDate); return end !== null && end < new Date().setHours(0, 0, 0, 0); };
const destinationsKey = (trips: Trip[]) => trips.map((trip) => `${trip.id}:${trip.city}:${trip.country}:${trip.title}:${trip.endDate}`).join('|');

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
    });
    return () => { active = false; };
  }, [key]);

  return { places, loading };
}

export default function MapScreen() {
  const { trips, setSelectedTripId } = useTravel();
  const { places, loading } = useMapPlaces(trips);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = places.find((place) => place.id === selectedId) ?? places[0];
  const mapHtml = useMemo(() => buildTravelMapHtml(places), [places]);

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const openTrip = () => {
    if (!selected) return;
    setSelectedTripId(selected.id);
    router.push('/trip');
  };
  const onMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'select' && typeof message.id === 'string') setSelectedId(message.id);
    } catch { /* Ignore map messages outside the app bridge. */ }
  };

  return <View style={s.page}>
    <WebView source={{ html: mapHtml }} onMessage={onMapMessage} javaScriptEnabled domStorageEnabled scrollEnabled={false} bounces={false} originWhitelist={['*']} style={s.map} containerStyle={s.map}/>
    <View pointerEvents="none" style={s.header}><View style={s.titlePill}><Ionicons name="map-outline" size={18} color={colors.text}/><Text style={s.title}>Travel map</Text></View></View>
    {loading && <View style={s.loading}><ActivityIndicator color={colors.blue}/><Text style={s.loadingText}>Finding your destinations …</Text></View>}
    <View style={s.bottomArea}>
      {selected ? <Pressable onPress={openTrip} style={({ pressed }) => [s.tripSheet, pressed && s.pressed]}>
        <View style={s.handle}/>
        <View style={s.sheetRow}><View style={[s.markerIcon, selected.completed ? s.completedMarker : s.futureMarker]}><Ionicons name={selected.completed ? 'bookmark' : 'airplane'} size={19} color="#fff"/></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>{selected.completed ? 'A PLACE YOU VISITED' : 'YOUR UPCOMING ADVENTURE'}</Text><Text style={s.destination}>{selected.city}</Text><Text style={s.country}>{selected.country} · {selected.title}</Text></View><Ionicons name="chevron-forward" size={22} color={colors.muted}/></View>
      </Pressable> : !loading ? <View style={s.emptySheet}><View style={s.handle}/><Ionicons name="airplane-outline" size={26} color={colors.blue}/><Text style={s.emptyTitle}>Plan your next trip</Text><Text style={s.emptyCopy}>When you add a destination, it gets its own bookmark on the map.</Text></View> : null}
    </View>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#DCEFF4' },
  map: { flex: 1, backgroundColor: '#DCEFF4' },
  header: { position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center' },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.96)', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11, shadowColor: '#1A303C', shadowOpacity: .16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  loading: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,.95)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#1A303C', shadowOpacity: .12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  loadingText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  bottomArea: { position: 'absolute', left: 12, right: 12, bottom: 13 },
  tripSheet: { backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 15, paddingTop: 9, shadowColor: '#172833', shadowOpacity: .18, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  handle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#CCD3D5', alignSelf: 'center', marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markerIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  futureMarker: { backgroundColor: '#437EAE' },
  completedMarker: { backgroundColor: '#D66E5A' },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .8 },
  destination: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -.35, marginTop: 2 },
  country: { color: colors.muted, fontSize: 12, marginTop: 2 },
  emptySheet: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 18, shadowColor: '#172833', shadowOpacity: .17, shadowRadius: 20, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
  emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 7 },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center', maxWidth: 270 },
  pressed: { opacity: .86 },
});
