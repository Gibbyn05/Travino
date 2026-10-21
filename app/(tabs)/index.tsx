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

function Ticket({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const presentation = tripPresentation(trip);
  const packed = trip.packing.filter((item) => item.done).length;
  const total = trip.packing.length;
  const progress = total ? Math.round(packed / total * 100) : 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${trip.title}`} onPress={onOpen} style={({ pressed }) => [s.ticket, pressed && s.pressed]}>
    <View style={[s.ticketTop, { backgroundColor: `${presentation.color}18` }]}>
      <View style={[s.ticketIcon, { backgroundColor: presentation.color }]}><Ionicons name={presentation.icon} size={21} color="#FFFFFF"/></View>
      <View style={{ flex: 1 }}><Text style={s.ticketDestination} numberOfLines={1}>{trip.city || trip.country}</Text><Text style={s.ticketCountry} numberOfLines={1}>{trip.country || 'Destination to be confirmed'}</Text></View>
      <Ionicons name="arrow-forward" size={18} color={presentation.color}/>
    </View>
    <View style={s.ticketBody}>
      <Text style={s.ticketTitle} numberOfLines={1}>{trip.title}</Text>
      <Text style={[s.ticketCountdown, { color: presentation.color }]}>{tripCountdown(trip)}</Text>
      <Text style={s.ticketDates}>{formatTripDates(trip.startDate, trip.endDate)}</Text>
      <View style={s.ticketRule}/>
      <View style={s.packHead}><Text style={s.packLabel}>PACKED</Text><Text style={s.packValue}>{total ? `${packed} of ${total}` : 'Not started'}</Text></View>
      <View style={s.packTrack}><View style={[s.packFill, { width: `${progress}%` as `${number}%`, backgroundColor: presentation.color }]}/></View>
    </View>
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
      <View style={s.sectionHead}><AccentText text="Your trips" style={s.sectionTitle}/><Pressable accessibilityRole="button" accessibilityLabel="Start a new trip" onPress={openNewTrip} style={s.newTripButton}><Ionicons name="add" size={22} color="#FFFFFF"/></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{trips.map(trip => <Ticket key={trip.id} trip={trip} onOpen={() => { setSelectedTripId(trip.id); router.push({ pathname: '/trip', params: { tab: '', activityIntent: '' } }); }}/>)}</ScrollView>
    </>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 68, paddingBottom: 44 }, topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 56, marginBottom: 25 }, greeting: { flex: 1, minWidth: 0, color: colors.muted, fontSize: 18, lineHeight: 25, fontWeight: '400' }, profileDot: { width: 44, height: 44, overflow: 'hidden', borderRadius: 22, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, profilePhoto: { width: '100%', height: '100%', resizeMode: 'cover' }, profileInitial: { color: colors.purple, fontSize: 17, fontWeight: '700' }, heroCopy: { marginBottom: 28 }, heroEyebrow: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.25, marginBottom: 8 }, heading: { color: colors.text, fontFamily: fonts.heading, fontSize: 48, fontWeight: '700', letterSpacing: 0, lineHeight: 56 }, gradientHeading: { fontFamily: fonts.heading, fontSize: 48, fontWeight: '700', letterSpacing: 0, lineHeight: 56 }, heroDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 315 },
  createCard: { borderWidth: 1, borderColor: '#BEDCFF', borderRadius: 28, minHeight: 206, padding: 22, overflow: 'hidden', backgroundColor: '#EAF4FF', shadowColor: colors.blue, shadowOpacity: .12, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 3 }, createText: { alignItems: 'center' }, microCopy: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.05, marginBottom: 7 }, createTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 38, textAlign: 'center' }, createCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 6 }, routeLine: { height: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginBottom: 14 }, routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6DAAFF' }, routeDotEnd: { backgroundColor: colors.purple }, routeDash: { width: 45, borderTopWidth: 2, borderColor: '#8EBBFF', borderStyle: 'dashed' }, createButton: { marginTop: 20 },
  sectionHead: { marginTop: 34, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionHeadWithTrips: { marginTop: 6 }, sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 28, fontWeight: '700', letterSpacing: -.35 }, newTripButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOpacity: .2, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } }, empty: { minHeight: 210 },
  list: { gap: 13, paddingRight: 24, paddingBottom: 8 }, ticket: { width: 262, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, overflow: 'hidden', shadowColor: colors.text, shadowOpacity: .06, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 2 }, ticketTop: { minHeight: 81, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11 }, ticketIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, ticketDestination: { color: colors.text, fontSize: 20, fontWeight: '700' }, ticketCountry: { color: colors.muted, fontSize: 16, marginTop: 2 }, ticketBody: { padding: 15, paddingTop: 14 }, ticketTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700' }, ticketCountdown: { fontSize: 17, fontWeight: '700', marginTop: 8 }, ticketDates: { color: colors.muted, fontSize: 16, marginTop: 4 }, ticketRule: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.border, marginVertical: 13 }, packHead: { flexDirection: 'row', justifyContent: 'space-between' }, packLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: .9 }, packValue: { color: colors.text, fontSize: 15, fontWeight: '700' }, packTrack: { height: 6, borderRadius: 5, overflow: 'hidden', backgroundColor: '#EEF0F4', marginTop: 7 }, packFill: { height: '100%', borderRadius: 5 },
  preview: { minHeight: 116, borderWidth: 1, borderRadius: 22, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 22 }, previewIcon: { width: 56, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, previewEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 }, previewTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 4 }, previewDestination: { color: colors.muted, fontSize: 13, marginTop: 3 }, fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '700', marginLeft: 2, marginBottom: 8 }, colorRow: { flexDirection: 'row', gap: 12, marginBottom: 20, paddingHorizontal: 2 }, colorDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, colorDotSelected: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: colors.text, shadowOpacity: .22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, iconRow: { gap: 10, paddingBottom: 20, paddingRight: 10 }, iconChoice: { width: 47, height: 47, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, inspiration: { minHeight: 72, borderRadius: 18, paddingHorizontal: 14, backgroundColor: colors.purpleSoft, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 22 }, inspirationIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, inspirationLabel: { color: colors.purple, fontSize: 10, fontWeight: '700', letterSpacing: .85 }, inspirationTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 3 },
  destinationField: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 15, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 11 }, destinationFieldIcon: { width: 31, height: 31, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, destinationValue: { color: colors.text, fontSize: 16, fontWeight: '500' }, destinationPlaceholder: { color: colors.muted, fontWeight: '400' }, datePair: { flexDirection: 'row', gap: 10 }, dateHalf: { flex: 1 }, lengthHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 18, marginLeft: 2 }, destinationSheetCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 16 }, destinationConfirm: { minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue }, destinationConfirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }, pressed: { opacity: .78 },
});
