import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TripDatesSheet } from '@/src/trip-dates-sheet';
import { CapybaraMoment, DestinationCover, EmptyMoment, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';
import { formatTripDates } from '@/src/dates';
import { daysTrip, tripDate, tripDayStatus } from '@/src/trip-planning';
import { activityDraftFor } from '@/src/activity-drafts';
import { useActivityDrafts } from '@/src/activity-draft-provider';

export default function CountdownScreen() {
  const { trips, selectedTrip, setSelectedTripId, ready } = useTravel();
  const { drafts } = useActivityDrafts();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const trip = daysTrip(trips, selectedTrip?.id);
  const undated = trips.find(item => !['completed', 'cancelled'].includes(item.completionState ?? '') && (!tripDate(item.startDate) || !tripDate(item.endDate)));
  const openTrip = (target: Trip, tab?: string, addActivity = false) => {
    setSelectedTripId(target.id);
    router.push({ pathname: '/trip', params: { tab: tab ?? '', activityIntent: addActivity ? String(Date.now()) : '' } } as never);
  };
  if (!ready) return <View style={s.loading}><CapybaraMoment size={66}/><Text style={s.body}>Opening your trip…</Text></View>;
  if (!trip) return <ScrollView style={s.page} contentContainerStyle={s.emptyContent}>
    <Text accessibilityRole="header" style={s.pageTitle}>Days</Text>
    <EmptyMoment title={undated ? 'When are you going?' : 'Where next?'} copy={undated ? undated.title : 'Start with a destination.'} actionTitle={undated ? 'Add travel dates' : 'Plan a trip'} icon={undated ? 'calendar-outline' : 'add'} onPress={() => undated ? setDatesOpen(true) : router.push('/new-trip' as never)}/>
    {datesOpen && undated && <TripDatesSheet key={undated.id} trip={undated} onClose={() => setDatesOpen(false)}/>}
  </ScrollView>;

  const packed = trip.packing.filter(item => item.done).length;
  const total = trip.packing.length;
  const allPacked = total > 0 && packed === total;
  const packingTitle = !total ? 'Create packing list' : allPacked ? 'All packed' : 'Continue packing';
  const addActivity = !trip.activities.length;
  const actionTitle = addActivity ? activityDraftFor(drafts, trip.id) ? 'Continue activity' : 'Add an activity' : 'View plan';
  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.pageTitle}>Days</Text>
    <View style={s.heroFrame}>
      <DestinationCover country={trip.country} uri={trip.coverImage} style={s.hero} imageStyle={s.heroImage}>
        <LinearGradient colors={['rgba(20,24,43,.02)', 'rgba(20,24,43,.40)']} style={s.heroShade}>
          <View style={s.destinationPill}><Ionicons name="location-outline" size={20} color={colors.text}/><Text style={s.destinationText}>{trip.city}, {trip.country}</Text></View>
        </LinearGradient>
      </DestinationCover>
      <View style={s.heroBody}>
        <Text accessibilityRole="header" style={s.tripName}>{trip.title}</Text>
        <Text style={s.status}>{tripDayStatus(trip)}</Text>
        <Text style={s.body}>{formatTripDates(trip.startDate, trip.endDate)}</Text>
        <View style={s.mainAction}><PrimaryButton title={actionTitle} icon={addActivity ? 'add' : 'calendar-outline'} onPress={() => openTrip(trip, 'Plan', addActivity)}/></View>
      </View>
    </View>
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.sectionTitle}>Packing</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={packingTitle} onPress={() => openTrip(trip, 'Packing')} style={({ pressed }) => [s.packingCard, pressed && s.pressed]}>
        <View style={s.packingTop}><View style={s.packingIcon}><Ionicons name={allPacked ? 'checkmark-circle-outline' : 'bag-handle-outline'} size={27} color={colors.blue}/></View><View style={s.flex}><Text style={s.actionTitle}>{packingTitle}</Text>{total > 0 && <Text style={s.body}>{allPacked ? 'View packing list' : `${packed} of ${total} packed`}</Text>}</View><Ionicons name="chevron-forward" size={22} color={colors.blue}/></View>
        {total > 0 && <View accessibilityRole="progressbar" accessibilityLabel="Packing progress" accessibilityValue={{ min: 0, max: total, now: packed, text: `${packed} of ${total} packed` }} style={s.progressTrack}><View style={[s.progressFill, { width: `${packed / total * 100}%` as `${number}%` }]}/></View>}
      </Pressable>
    </View>
    <View style={s.section}>
      <Pressable accessibilityRole="button" accessibilityLabel="Trip details" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(!detailsOpen)} style={({ pressed }) => [s.detailsToggle, pressed && s.pressed]}><Ionicons name="information-circle-outline" size={25} color={colors.blue}/><Text style={[s.actionTitle, s.flex]}>Trip details</Text><Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.blue}/></Pressable>
      {detailsOpen && <View style={s.detailsCard}>
        <View style={s.detailRow}><Text style={s.detailLabel}>Travel dates</Text><Text style={s.detailValue}>{formatTripDates(trip.startDate, trip.endDate)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Change travel dates" onPress={() => setDatesOpen(true)} style={s.textAction}><Text style={s.textActionText}>Change dates</Text></Pressable></View>
        <View style={s.detailRow}><Text style={s.detailLabel}>Travellers</Text><Text style={s.detailValue}>{trip.members.length ? ['You', ...trip.members].join(', ') : 'Just you'}</Text></View>
      </View>}
    </View>
    {selectedTrip && selectedTrip.id !== trip.id && <Pressable accessibilityRole="button" accessibilityLabel={`Open ${selectedTrip.title}`} onPress={() => openTrip(selectedTrip)} style={({ pressed }) => [s.otherTrip, pressed && s.pressed]}><Text style={[s.textActionText, s.flex]}>Open {selectedTrip.title}</Text><Ionicons name="arrow-forward" size={22} color={colors.blue}/></Pressable>}
    {datesOpen && <TripDatesSheet key={trip.id} trip={trip} onClose={() => setDatesOpen(false)}/>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 64, paddingBottom: 40 },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 64, paddingBottom: 40 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: colors.background },
  pageTitle: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 42, color: colors.text, marginBottom: 16 },
  heroFrame: { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  hero: { height: 150, backgroundColor: colors.blueSoft }, heroImage: { borderTopLeftRadius: 23, borderTopRightRadius: 23 }, heroShade: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  destinationPill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(255,255,255,.96)', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 }, destinationText: { flexShrink: 1, color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  heroBody: { padding: 18, gap: 6 }, tripName: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, lineHeight: 34 }, status: { color: colors.blue, fontFamily: fonts.heading, fontSize: 32, lineHeight: 40 }, body: { color: colors.muted, fontSize: 18, lineHeight: 26 }, mainAction: { marginTop: 10 },
  section: { marginTop: 24, gap: 12 }, sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 28, lineHeight: 36 },
  packingCard: { padding: 18, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, packingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, packingIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, flex: { flex: 1, minWidth: 0 }, actionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, lineHeight: 29 },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: '#E4E9F0', overflow: 'hidden', marginTop: 17 }, progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.blue },
  detailsToggle: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, detailsCard: { paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, detailRow: { paddingVertical: 18, gap: 5 }, detailLabel: { color: colors.muted, fontSize: 17, lineHeight: 24, fontWeight: '600' }, detailValue: { color: colors.text, fontSize: 19, lineHeight: 27, fontWeight: '600' },
  textAction: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingVertical: 8 }, textActionText: { color: colors.blue, fontSize: 18, lineHeight: 26, fontWeight: '600' }, otherTrip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 12, minHeight: 56 }, pressed: { opacity: .78 },
});
