import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CapybaraMoment } from '@/src/ui';
import { Trip, useTravel } from '@/src/store';
import { colors, fonts } from '@/src/theme';

const markerPositions: Array<{ left: `${number}%`; top: `${number}%` }> = [
  { left: '18%', top: '30%' }, { left: '38%', top: '52%' }, { left: '58%', top: '24%' },
  { left: '74%', top: '58%' }, { left: '48%', top: '72%' }, { left: '84%', top: '38%' },
];

const dateValue = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isCompleted = (trip: Trip) => {
  const end = dateValue(trip.endDate);
  return end !== null && end < new Date().setHours(0, 0, 0, 0);
};

/**
 * The native iOS screen uses Apple MapKit. Web deliberately uses a compact,
 * dependency-free travel overview instead of loading a third-party map SDK.
 */
export default function WebMapScreen() {
  const { trips, setSelectedTripId } = useTravel();
  const upcoming = trips.find((trip) => !isCompleted(trip)) ?? trips[0];
  const visitedCountries = [...new Set(trips.filter(isCompleted).map((trip) => trip.country).filter(Boolean))];

  const openTrip = () => {
    if (!upcoming) return;
    setSelectedTripId(upcoming.id);
    router.push('/trip');
  };

  return <View style={s.page}>
    <View style={s.header}><View style={s.titlePill}><Ionicons name="map-outline" size={18} color={colors.text}/><Text style={s.title}>Travel map</Text></View></View>
    <View style={s.mapArt}>
      <View style={[s.land, s.landOne]}/><View style={[s.land, s.landTwo]}/><View style={[s.land, s.landThree]}/>
      <View style={s.route}/>
      {trips.slice(0, markerPositions.length).map((trip, index) => <View key={trip.id} style={[s.marker, markerPositions[index], isCompleted(trip) ? s.completedMarker : s.futureMarker]}><Ionicons name={isCompleted(trip) ? 'bookmark' : 'airplane'} size={17} color="#FFFFFF"/></View>)}
      {!trips.length ? <View style={s.noTrips}><CapybaraMoment size={104}/></View> : null}
    </View>
    <View style={s.bottomArea}>
      {upcoming ? <Pressable accessibilityRole="button" onPress={openTrip} style={({ pressed }) => [s.tripSheet, pressed && s.pressed]}>
        <View style={s.handle}/>
        <View style={s.sheetRow}><View style={s.sheetMarker}><Ionicons name={isCompleted(upcoming) ? 'bookmark' : 'airplane'} size={19} color="#fff"/></View><View style={{ flex: 1 }}><Text style={s.eyebrow}>{isCompleted(upcoming) ? 'A PLACE YOU VISITED' : 'YOUR UPCOMING ADVENTURE'}</Text><Text style={s.destination}>{upcoming.city}</Text><Text style={s.country}>{upcoming.country} · {upcoming.title}</Text></View><Ionicons name="chevron-forward" size={22} color={colors.muted}/></View>
        {visitedCountries.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.visitedRow}><Text style={s.visitedLabel}>Visited</Text>{visitedCountries.map((country) => <View key={country} style={s.visitedChip}><Text style={s.visitedChipText}>{country}</Text></View>)}</ScrollView> : null}
      </Pressable> : <View style={s.emptySheet}><View style={s.handle}/><Text style={s.emptyTitle}>Plan your next trip</Text><Text style={s.emptyCopy}>Add a destination and it will get its own bookmark here.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/')} style={s.emptyAction}><Text style={s.emptyActionText}>Plan a trip</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF"/></Pressable></View>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#DCEFF4' },
  header: { position: 'absolute', top: 60, left: 20, right: 20, alignItems: 'center', zIndex: 2 }, titlePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.96)', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11, shadowColor: '#1A303C', shadowOpacity: .16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700' },
  mapArt: { flex: 1, overflow: 'hidden', backgroundColor: '#DCEFF4' }, land: { position: 'absolute', backgroundColor: '#C8E3D0', borderWidth: 2, borderColor: 'rgba(93,142,105,.16)', opacity: .9 }, landOne: { width: '56%', height: '37%', left: '-9%', top: '18%', borderRadius: 90, transform: [{ rotate: '-18deg' }] }, landTwo: { width: '46%', height: '47%', right: '-14%', top: '20%', borderRadius: 95, transform: [{ rotate: '25deg' }] }, landThree: { width: '53%', height: '26%', left: '24%', bottom: '13%', borderRadius: 80, transform: [{ rotate: '12deg' }] }, route: { position: 'absolute', width: '70%', height: 2, left: '14%', top: '51%', borderTopWidth: 2, borderTopColor: 'rgba(67,126,174,.46)', borderStyle: 'dashed', transform: [{ rotate: '11deg' }] },
  marker: { position: 'absolute', width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#172833', shadowOpacity: .2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, futureMarker: { backgroundColor: '#437EAE' }, completedMarker: { backgroundColor: '#D66E5A' }, noTrips: { position: 'absolute', alignItems: 'center', alignSelf: 'center', top: '31%', width: 260 }, noTripsTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 21, fontWeight: '700', marginTop: 10 }, noTripsCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  bottomArea: { position: 'absolute', left: 12, right: 12, bottom: 13 }, tripSheet: { backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 15, paddingTop: 9, shadowColor: '#172833', shadowOpacity: .18, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } }, handle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#CCD3D5', alignSelf: 'center', marginBottom: 12 }, sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sheetMarker: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#437EAE' }, eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .8 }, destination: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', letterSpacing: -.15, marginTop: 2 }, country: { color: colors.muted, fontSize: 12, marginTop: 2 },
  visitedRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border, paddingRight: 6 }, visitedLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, visitedChip: { backgroundColor: '#FFF0E8', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }, visitedChipText: { color: '#A35747', fontSize: 11, fontWeight: '600' },
  emptySheet: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,.98)', borderRadius: 28, padding: 18, shadowColor: '#172833', shadowOpacity: .17, shadowRadius: 20, shadowOffset: { width: 0, height: 7 } }, emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 7 }, emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center', maxWidth: 270 }, emptyAction: { minHeight: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 15 }, emptyActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, pressed: { opacity: .86 },
});
