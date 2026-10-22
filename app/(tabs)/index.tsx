import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccentText, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';
import { formatTripDates, parseTravelDate } from '@/src/dates';
import { tripPresentation } from '@/src/trip-presentation';
import { planningTrip } from '@/src/trip-planning';
import { tripNextStep } from '@/src/trip-guidance';

function tripCountdown(trip: Pick<Trip, 'startDate' | 'endDate'>) {
  const start = parseTravelDate(trip.startDate);
  const end = parseTravelDate(trip.endDate);
  if (!start || !end) return 'Dates to be confirmed';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (end < today) return 'A trip to remember';
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (days > 1) return `Starts in ${days} days`;
  if (days === 1) return '1 day to go';
  if (days === 0) return 'Leaving today';
  const day = Math.max(1, Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1);
  return `Day ${day}`;
}

function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const presentation = tripPresentation(trip);
  const status = parseTravelDate(trip.startDate) && parseTravelDate(trip.endDate) ? tripCountdown(trip) : undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${trip.title}`} onPress={onOpen} style={({ pressed }) => [s.tripCard, pressed && s.pressed]}>
    <View style={s.tripCardHeading}>
      <View style={[s.tripIcon, { backgroundColor: `${presentation.color}18` }]}><Ionicons name={presentation.icon} size={23} color={presentation.color}/></View>
      <Text style={s.tripTitle}>{trip.title}</Text>
      <Ionicons name="chevron-forward" size={21} color={colors.blue}/>
    </View>
    <Text style={s.tripDates}>{formatTripDates(trip.startDate, trip.endDate)}</Text>
    {status && <Text style={s.tripStatus}>{status}</Text>}
  </Pressable>;
}

export default function HomeScreen() {
  const { profileName, profilePhoto, trips, selectedTripId, setSelectedTripId } = useTravel();
  const continuing = planningTrip(trips, selectedTripId);
  const nextStep = continuing ? tripNextStep(continuing) : undefined;
  const hasTrips = trips.length > 0;
  const openNewTrip = () => router.push('/new-trip' as never);
  const continueTrip = () => {
    if (!continuing || !nextStep) return;
    setSelectedTripId(continuing.id);
    router.push({ pathname: '/trip', params: { tab: nextStep.target === 'add-activity' ? 'Plan' : nextStep.target, activityIntent: nextStep.target === 'add-activity' ? String(Date.now()) : '' } });
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.topRow}><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')} hitSlop={8} style={({ pressed }) => [s.profileDot, pressed && s.pressed]}>{profilePhoto ? <Image accessibilityLabel={`${profileName || 'Your'} profile photo`} source={{ uri: profilePhoto }} style={s.profilePhoto}/> : <Text style={s.profileInitial}>{(profileName || 'T').slice(0, 1).toUpperCase()}</Text>}</Pressable><Text style={s.greeting}>Hi {profileName || 'traveller'}!</Text></View>
    <View style={s.heroCopy}><Text style={s.heading}>Your next</Text><Text style={s.gradientHeading}><Text style={{ color: colors.blue }}>adventure</Text><Text style={{ color: '#8EA9F8' }}>.</Text></Text></View>
    <View style={s.createCard}>
      <View style={s.routeLine} pointerEvents="none"><View style={s.routeDot}/><View style={s.routeDash}/><Ionicons name="airplane" size={19} color={colors.blue}/><View style={s.routeDash}/><View style={[s.routeDot, s.routeDotEnd]}/></View>
      <View style={s.createText}><Text style={s.createTitle}>{continuing ? continuing.city : 'Where next?'}</Text></View>
      <View style={s.createButton}><PrimaryButton title={nextStep ? nextStep.button : hasTrips ? 'Plan another trip' : 'Plan a trip'} icon={nextStep ? nextStep.icon : 'arrow-forward'} onPress={continuing ? continueTrip : openNewTrip}/></View>
    </View>
    {hasTrips && <>
      <View style={s.sectionHead}><AccentText text="Your trips" style={s.sectionTitle}/><Pressable accessibilityRole="button" accessibilityLabel="Start a new trip" onPress={openNewTrip} style={({ pressed }) => [s.newTripButton, pressed && s.pressed]}><Text style={s.newTripText}>New trip</Text><Ionicons name="add" size={19} color={colors.blue}/></Pressable></View>
      <View style={s.list}>{trips.map(trip => <TripCard key={trip.id} trip={trip} onOpen={() => { setSelectedTripId(trip.id); router.push({ pathname: '/trip', params: { tab: '', activityIntent: '' } }); }}/>)}</View>
    </>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 68, paddingBottom: 44 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 56, marginBottom: 14 },
  greeting: { flex: 1, minWidth: 0, color: colors.muted, fontSize: 20, lineHeight: 28, fontWeight: '400' },
  profileDot: { width: 44, height: 44, overflow: 'hidden', borderRadius: 22, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  profilePhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  profileInitial: { color: colors.purple, fontSize: 17, fontWeight: '700' },
  heroCopy: { marginBottom: 18 },
  heading: { color: colors.text, fontFamily: fonts.heading, fontSize: 48, fontWeight: '700', lineHeight: 56 },
  gradientHeading: { fontFamily: fonts.heading, fontSize: 48, fontWeight: '700', lineHeight: 56 },
  createCard: { borderWidth: 1, borderColor: '#BEDCFF', borderRadius: 28, padding: 18, overflow: 'hidden', backgroundColor: '#EAF4FF', shadowColor: colors.blue, shadowOpacity: .12, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 3 },
  createText: { alignItems: 'center' },
  createTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 38, textAlign: 'center' },
  routeLine: { height: 18, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginBottom: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6DAAFF' },
  routeDotEnd: { backgroundColor: colors.purple },
  routeDash: { width: 30, borderTopWidth: 2, borderColor: '#8EBBFF', borderStyle: 'dashed' },
  createButton: { marginTop: 12 },
  sectionHead: { marginTop: 24, marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: -.35 },
  newTripButton: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, borderWidth: 1, borderColor: '#C8E3FF', backgroundColor: colors.surface },
  newTripText: { color: colors.blue, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  list: { gap: 12 },
  tripCard: { alignSelf: 'stretch', gap: 7, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tripCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  tripIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tripTitle: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  tripDates: { color: colors.text, fontSize: 18, lineHeight: 26 },
  tripStatus: { color: colors.muted, fontSize: 17, lineHeight: 24 },
  pressed: { opacity: .78 },
});
