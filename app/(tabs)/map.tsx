import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildGlobeHtml, GlobePlace } from '@/src/globe-html';
import { Card, PageTitle, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';

type VisitedCountry = GlobePlace & { trips: Trip[]; cities: string[] };
const normalise = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, ' ').trim();
const dateValue = (value: string) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? null : parsed; };
const hasVisited = (trip: Trip) => { const end = dateValue(trip.endDate); return end !== null && end < new Date().setHours(0, 0, 0, 0); };

export default function MapScreen() {
  const { trips } = useTravel();
  const visitedCountries = useMemo(() => {
    const grouped = new Map<string, VisitedCountry>();
    trips.filter(hasVisited).forEach((trip) => {
      const country = trip.country.trim();
      if (!country) return;
      const id = normalise(country);
      const current = grouped.get(id) ?? { id, country, cities: [], trips: [] };
      current.trips.push(trip);
      if (trip.city && !current.cities.includes(trip.city)) current.cities.push(trip.city);
      grouped.set(id, current);
    });
    return [...grouped.values()].sort((a, b) => a.country.localeCompare(b.country));
  }, [trips]);
  const [selectedId, setSelectedId] = useState<string>();
  useEffect(() => {
    setSelectedId((current) => visitedCountries.some((place) => place.id === current) ? current : visitedCountries[0]?.id);
  }, [visitedCountries]);

  const selected = visitedCountries.find((place) => place.id === selectedId);
  const mapHtml = useMemo(() => buildGlobeHtml(visitedCountries), [visitedCountries]);
  const openMemoryBook = () => {
    if (!selected) return;
    router.push({ pathname: '/memory-book/[country]', params: { country: selected.country } } as any);
  };
  const onMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'select' && typeof message.id === 'string') setSelectedId(message.id);
    } catch { /* Ignore messages outside the map bridge. */ }
  };

  return <View style={s.page}><View style={s.content}>
    <PageTitle eyebrow="Your travel history">Map</PageTitle>
    <Text style={s.intro}>A little colour for every country you’ve explored. Zoom in to find a place.</Text>
    <View style={s.mapShell}>
      <WebView source={{ html: mapHtml }} onMessage={onMapMessage} javaScriptEnabled domStorageEnabled scrollEnabled={false} bounces={false} originWhitelist={['*']} style={s.map} containerStyle={s.map}/>
    </View>
    <View style={s.hint}><Ionicons name="hand-left-outline" size={17} color={colors.blue}/><Text style={s.hintText}>Drag to explore · tap a coloured country · + / − to zoom</Text></View>
    {selected ? <Section title="Your journeys here"><Pressable onPress={openMemoryBook} style={({ pressed }) => [s.albumCard, pressed && s.pressed]}>
      <View style={s.albumIcon}><Ionicons name="images-outline" size={22} color={colors.purple}/></View>
      <View style={{ flex: 1 }}><Text style={s.albumTitle}>{selected.country}</Text><Text style={s.copy}>{selected.cities.join(' · ')}</Text><Text style={s.copy}>{selected.trips.length} {selected.trips.length === 1 ? 'trip' : 'trips'} · Open memory book</Text></View>
      <Ionicons name="chevron-forward" size={21} color={colors.muted}/>
    </Pressable></Section> : <Card style={s.empty}>
      <Ionicons name="earth-outline" size={33} color={colors.blue}/>
      <Text style={s.emptyTitle}>{visitedCountries.length ? 'Choose a coloured country' : 'Your map is ready for memories'}</Text>
      <Text style={s.copy}>{visitedCountries.length ? 'Tap a visited country to open its travel album.' : 'A country gets its own colour after a trip has ended.'}</Text>
    </Card>}
  </View></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 72, paddingBottom: 28 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: -8 },
  mapShell: { height: 365, marginTop: 18, overflow: 'hidden', borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOpacity: .035, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  map: { flex: 1, backgroundColor: '#FFFFFF' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12 },
  hintText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  albumCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  albumIcon: { backgroundColor: colors.purpleSoft, height: 44, width: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  albumTitle: { color: colors.text, fontWeight: '700', fontSize: 16, letterSpacing: -.3 },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  pressed: { opacity: .78 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 25, marginTop: 24, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
