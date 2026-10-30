import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccentText, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';
import { formatTripDates, parseTravelDate } from '@/src/dates';
import { tripPresentation } from '@/src/trip-presentation';
import { planningTrip } from '@/src/trip-planning';
import { tripNextStep } from '@/src/trip-guidance';
import { CapybaraGuide } from '@/src/capybara-guide';
import { activeHomeJourney, homeJourneyGuide } from '@/src/home-journey';
import { useActivityDrafts } from '@/src/activity-draft-provider';
import { activityDraftFor } from '@/src/activity-drafts';

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
  const { drafts } = useActivityDrafts();
  const compact = useWindowDimensions().height < 700;
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => new Date());
  const shortcutCount = useRef(0);
  useFocusEffect(useCallback(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = setInterval(refresh, 60_000);
    const visibility = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); visibility.remove(); };
  }, []));
  const active = activeHomeJourney(trips, selectedTripId, now);
  const live = active ? homeJourneyGuide(active, now) : undefined;
  const continuing = active ?? planningTrip(trips, selectedTripId, now);
  const nextStep = continuing ? tripNextStep(continuing) : undefined;
  const pendingActivity = active ? activityDraftFor(drafts, active.id) : undefined;
  const hasTrips = trips.length > 0;
  const openNewTrip = () => router.push('/new-trip' as never);
  const continueTrip = () => {
    if (!continuing || !nextStep) return;
    setSelectedTripId(continuing.id);
    router.push({ pathname: '/trip', params: { tab: nextStep.target === 'add-activity' ? 'Plan' : nextStep.target, activityIntent: nextStep.target === 'add-activity' ? `${Date.now()}-${++shortcutCount.current}` : '' } });
  };
  const openToday = () => {
    if (!active || !live) return;
    setSelectedTripId(active.id);
    const intent = `${Date.now()}-${++shortcutCount.current}`;
    router.push({ pathname: '/trip', params: live.kind === 'empty'
      ? { tab: 'Plan', activityIntent: intent, activityDate: live.day }
      : { tab: 'Plan', planDate: live.day, planIntent: intent } });
  };
  return <ScrollView style={s.page} contentContainerStyle={[s.content, live && compact && { paddingTop: Math.max(insets.top + 8, 20) }]} showsVerticalScrollIndicator={false}>
    <View style={[s.topRow, live && compact && s.compactTopRow]}><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')} hitSlop={8} style={({ pressed }) => [s.profileDot, pressed && s.pressed]}>{profilePhoto ? <Image accessibilityLabel={`${profileName || 'Your'} profile photo`} source={{ uri: profilePhoto }} style={s.profilePhoto}/> : <Text style={s.profileInitial}>{(profileName || 'T').slice(0, 1).toUpperCase()}</Text>}</Pressable><Text style={s.greeting}>Hi {profileName || 'traveller'}!</Text></View>
    {active && live ? <>
      <Text accessibilityRole="header" style={[s.todayTitle, compact && s.compactTodayTitle]}>Today in <Text style={{ color: colors.blue }}>{active.city}</Text></Text>
      <View style={[s.createCard, s.todayCard, compact && s.compactTodayCard]}>
        <CapybaraGuide variant="travel" size={compact ? 64 : 96}>{live.kind === 'empty' && pendingActivity ? "Let's finish your activity." : live.line}</CapybaraGuide>
        {live.activity && <View style={[s.todayActivity, compact && s.compactTodayActivity]}>
          <Text style={[s.todayActivityTitle, compact && s.compactActivityTitle]}>{live.activity.title}</Text>
          <View style={s.todayTime}><Ionicons name="time-outline" size={21} color={colors.blue}/><Text style={[s.todayTimeText, compact && s.compactTimeText]}>{live.time}</Text></View>
        </View>}
        <PrimaryButton title={live.kind === 'empty' ? pendingActivity ? 'Continue activity' : 'Add an activity' : "View today's plan"} icon={live.kind === 'empty' ? pendingActivity ? 'arrow-forward' : 'add' : 'arrow-forward'} onPress={openToday}/>
      </View>
    </> : <>
    <View style={s.heroCopy}><Text style={s.heading}>Your next</Text><Text style={s.gradientHeading}><Text style={{ color: colors.blue }}>adventure</Text><Text style={{ color: '#8EA9F8' }}>.</Text></Text></View>
    <View style={s.createCard}>
      <View style={s.routeLine} pointerEvents="none"><View style={s.routeDot}/><View style={s.routeDash}/><Ionicons name="airplane" size={19} color={colors.blue}/><View style={s.routeDash}/><View style={[s.routeDot, s.routeDotEnd]}/></View>
      <View style={s.createText}><Text style={s.createTitle}>{continuing ? continuing.city : 'Where next?'}</Text></View>
      <View style={s.createButton}><PrimaryButton title={nextStep ? nextStep.button : hasTrips ? 'Plan another trip' : 'Plan a trip'} icon={nextStep ? nextStep.icon : 'arrow-forward'} onPress={continuing ? continueTrip : openNewTrip}/></View>
    </View>
    </>}
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
  todayTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 36, lineHeight: 44, marginBottom: 18 },
  todayCard: { gap: 18 },
  todayActivity: { alignItems: 'center', gap: 8 },
  todayActivityTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 27, lineHeight: 35, textAlign: 'center' },
  todayTime: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayTimeText: { color: colors.blue, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  compactTopRow: { marginBottom: 8 },
  compactTodayTitle: { fontSize: 30, lineHeight: 38, marginBottom: 12 },
  compactTodayCard: { padding: 14, gap: 10 },
  compactTodayActivity: { gap: 4 },
  compactActivityTitle: { fontSize: 23, lineHeight: 30 },
  compactTimeText: { fontSize: 20, lineHeight: 26 },
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
