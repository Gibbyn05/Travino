import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildGlobeHtml, GlobePlace } from '@/src/globe-html';
import { Card, PageTitle, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';

type MappedTrip = GlobePlace & { trip: Trip };
const fallbackCoordinates: Record<string, { lat: number; lon: number }> = {
  'alicante,spain': { lat: 38.35, lon: -0.48 }, 'oslo,norway': { lat: 59.91, lon: 10.75 }, 'molde,norway': { lat: 62.74, lon: 7.16 },
  'phuket,thailand': { lat: 7.88, lon: 98.39 }, 'bangkok,thailand': { lat: 13.76, lon: 100.5 }, 'barcelona,spain': { lat: 41.39, lon: 2.17 },
};
const normalise = (value: string) => value.trim().toLocaleLowerCase('nb-NO');
const placeKey = (trip: Trip) => `${normalise(trip.city)},${normalise(trip.country)}`;
const dateValue = (value: string) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; };
const hasVisited = (trip: Trip) => { const end = dateValue(trip.endDate); return end !== null && end < new Date().setHours(0, 0, 0, 0); };

async function locateTrip(trip: Trip): Promise<MappedTrip | null> {
  const fallback = fallbackCoordinates[placeKey(trip)];
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trip.city)}&count=12&language=no&format=json`);
    const data = response.ok ? await response.json() : null;
    const results = data?.results ?? [];
    const result = results.find((item: { country?: string }) => normalise(item.country ?? '') === normalise(trip.country)) ?? results[0];
    if (result) return { id: trip.id, city: trip.city, country: trip.country, lat: result.latitude, lon: result.longitude, trip };
  } catch { /* The stored fallback still makes common locations available offline. */ }
  return fallback ? { id: trip.id, city: trip.city, country: trip.country, ...fallback, trip } : null;
}

export default function MapScreen() {
  const { trips, setSelectedTripId } = useTravel();
  const visitedTrips = useMemo(() => trips.filter(hasVisited), [trips]);
  const [places, setPlaces] = useState<MappedTrip[]>([]);
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all(visitedTrips.map(locateTrip)).then((resolved) => {
      if (!active) return;
      const mapped = resolved.filter((item): item is MappedTrip => item !== null);
      setPlaces(mapped);
      setSelectedId((current) => mapped.some((item) => item.id === current) ? current : mapped[0]?.id);
    });
    return () => { active = false; };
  }, [visitedTrips]);

  const selected = places.find((item) => item.id === selectedId)?.trip;
  const globeHtml = useMemo(() => buildGlobeHtml(places, selectedId), [places, selectedId]);
  const openAlbum = () => { if (!selected) return; setSelectedTripId(selected.id); router.push('/trip?tab=Minner'); };
  const selectFromGlobe = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'select' && typeof message.id === 'string') setSelectedId(message.id);
    } catch { /* Ignore messages outside the globe bridge. */ }
  };

  return <View style={s.page}><View style={s.content}>
    <PageTitle eyebrow="Reisehistorien din">Kart</PageTitle>
    <Text style={s.intro}>Snurr kloden og se stedene dere faktisk har vært.</Text>
    <View style={s.globeShell}>
      <WebView source={{ html: globeHtml }} onMessage={selectFromGlobe} javaScriptEnabled domStorageEnabled scrollEnabled={false} bounces={false} originWhitelist={['*']} style={s.globe} containerStyle={s.globe} />
    </View>
    <View style={s.hint}><Ionicons name="hand-left-outline" size={18} color={colors.teal}/><Text style={s.hintText}>Dra for å snurre · trykk på en markør</Text></View>
    {selected ? <Section title="Et reiseøyeblikk"><Pressable onPress={openAlbum} style={s.albumCard}><View style={s.albumIcon}><Ionicons name="images-outline" size={22} color={colors.teal}/></View><View style={{ flex: 1 }}><Text style={s.albumTitle}>{selected.city}, {selected.country}</Text><Text style={s.copy}>{selected.startDate} – {selected.endDate}</Text></View><Ionicons name="chevron-forward" size={21} color={colors.muted}/></Pressable></Section> : <Card style={s.empty}><Ionicons name="earth-outline" size={34} color={colors.teal}/><Text style={s.emptyTitle}>Kloden fylles etter turen</Text><Text style={s.copy}>Et sted dukker opp her når turens sluttdato har passert.</Text></Card>}
  </View></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { flex: 1, padding: 24, paddingTop: 68, paddingBottom: 32 }, intro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: -10 }, globeShell: { height: 360, marginTop: 14, overflow: 'hidden', borderRadius: 30, backgroundColor: '#163F4C', borderWidth: 1, borderColor: 'rgba(255,255,255,.65)', shadowColor: colors.navy, shadowOpacity: .13, shadowRadius: 23, shadowOffset: { width: 0, height: 12 }, elevation: 5 }, globe: { flex: 1, backgroundColor: 'transparent' }, hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15 }, hintText: { color: colors.teal, fontSize: 13, fontWeight: '800' }, albumCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 22, padding: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.navy, shadowOpacity: .04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, albumIcon: { backgroundColor: colors.mist, height: 46, width: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, albumTitle: { color: colors.navy, fontWeight: '800', fontSize: 17 }, copy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 }, empty: { alignItems: 'center', gap: 9, paddingVertical: 32, marginTop: 32, backgroundColor: colors.mist, borderColor: 'transparent' }, emptyTitle: { color: colors.navy, fontSize: 17, fontWeight: '800' },
});
