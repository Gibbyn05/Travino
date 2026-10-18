import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CapybaraMoment, Card, DestinationCover, EmptyMoment, PageTitle } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';
import { formatLongDate, isGroupTrip, tripCompanionCopy } from '@/src/dates';

function parseDate(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3])
    : dotted ? new Date(+dotted[3], +dotted[2] - 1, +dotted[1])
      : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayCountTo(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((date.getTime() - today.getTime()) / 86_400_000));
}

function prettyDate(value: string) {
  return formatLongDate(value);
}

export default function CountdownScreen() {
  const { trips, selectedTrip, setSelectedTripId, ready } = useTravel();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextTrip = trips
    .map((trip) => ({ trip, start: parseDate(trip.startDate) }))
    .filter((entry): entry is { trip: Trip; start: Date } => Boolean(entry.start && entry.start >= today))
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.trip;
  const activeTrip = trips.find((trip) => {
    const start = parseDate(trip.startDate);
    const end = parseDate(trip.endDate);
    return Boolean(start && end && start <= today && end >= today);
  });

  const openTrip = (trip: Trip, tab?: string) => {
    setSelectedTripId(trip.id);
    if (tab) router.push({ pathname: '/trip', params: { tab } } as never);
    else router.push('/trip');
  };

  if (!ready) return <View style={s.loading}><CapybaraMoment size={66}/><Text style={s.loadingCopy}>Finding the next little adventure …</Text></View>;
  if (!nextTrip) return <Empty activeTrip={activeTrip} openTrip={openTrip}/>;

  const days = dayCountTo(parseDate(nextTrip.startDate)!);
  const completedPacking = nextTrip.packing.filter((item) => item.done).length;
  const packingPercent = nextTrip.packing.length ? Math.round(completedPacking / nextTrip.packing.length * 100) : 0;

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow="A LITTLE SOMETHING TO LOOK FORWARD TO" accent="is getting closer">Your next trip</PageTitle>
    <Pressable accessibilityRole="button" onPress={() => openTrip(nextTrip)} style={({ pressed }) => [s.heroFrame, pressed && s.pressed]}>
      <DestinationCover country={nextTrip.country} uri={nextTrip.coverImage} style={s.hero} imageStyle={s.heroImage}>
        <LinearGradient colors={['rgba(20,24,43,.02)', 'rgba(20,24,43,.24)', 'rgba(20,24,43,.78)']} locations={[0, .42, 1]} style={s.heroShade}>
          <View style={s.destinationPill}><Ionicons name="location-outline" size={14} color={colors.text}/><Text style={s.destinationPillText}>{nextTrip.city}, {nextTrip.country}</Text></View>
          <View style={s.heroText}>
            <Text style={s.tripName}>{nextTrip.title}</Text>
            <View style={s.numberRow}><Text style={s.number}>{days}</Text><View style={s.numberLabel}><Text style={s.numberLabelText}>{days === 0 ? 'LEAVING' : days === 1 ? 'DAY' : 'DAYS'}</Text><Text style={s.numberLabelText}>{days === 0 ? 'TODAY' : 'TO GO'}</Text></View></View>
            <Text style={s.departure}>{days === 0 ? 'Your journey begins today.' : `Leaving ${prettyDate(nextTrip.startDate)}`}</Text>
          </View>
          <View style={s.heroArrow}><Ionicons name="arrow-forward" size={20} color={colors.text}/></View>
        </LinearGradient>
      </DestinationCover>
    </Pressable>

    <View style={s.preparationHeading}><Text style={s.sectionTitle}>The little details</Text><Text style={s.sectionCopy}>A few things that make the days away feel close.</Text></View>
    <Pressable onPress={() => openTrip(nextTrip, 'Packing')} style={({ pressed }) => pressed && s.pressed}>
      <Card style={s.packingCard}>
        <View style={s.packingTop}><View style={s.packingIcon}><Ionicons name="bag-handle-outline" size={20} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.packingTitle}>{isGroupTrip(nextTrip.members) ? 'Packing for the trip' : 'Packing for your trip'}</Text><Text style={s.sectionCopy}>{nextTrip.packing.length ? `${completedPacking} of ${nextTrip.packing.length} things ready` : 'Your packing list is ready when you are'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></View>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: `${packingPercent}%` as `${number}%` }]}/></View>
      </Card>
    </Pressable>

    <View style={s.detailsRow}>
      <Card style={s.detailCard}><View style={s.detailIcon}><Ionicons name="calendar-clear-outline" size={19} color={colors.purple}/></View><Text style={s.detailLabel}>BACK HOME</Text><Text style={s.detailValue}>{prettyDate(nextTrip.endDate)}</Text></Card>
      <Card style={s.detailCard}><View style={[s.detailIcon, { backgroundColor: '#FFF0F6' }]}><Ionicons name={isGroupTrip(nextTrip.members) ? 'people-outline' : 'person-outline'} size={19} color={colors.pink}/></View><Text style={s.detailLabel}>{isGroupTrip(nextTrip.members) ? 'TRAVELLING WITH' : 'YOUR TRIP'}</Text><Text style={s.detailValue} numberOfLines={2}>{tripCompanionCopy(nextTrip.members)}</Text></Card>
    </View>

    {selectedTrip && selectedTrip.id !== nextTrip.id && <Pressable onPress={() => openTrip(selectedTrip)} style={({ pressed }) => [s.otherTrip, pressed && s.pressed]}><Text style={s.sectionCopy}>Open {selectedTrip.title}</Text><Ionicons name="arrow-forward" size={17} color={colors.blue}/></Pressable>}
  </ScrollView>;
}

function Empty({ activeTrip, openTrip }: { activeTrip?: Trip; openTrip: (trip: Trip) => void }) {
  return <ScrollView style={s.page} contentContainerStyle={s.emptyContent}>
    <PageTitle eyebrow="A LITTLE SOMETHING TO LOOK FORWARD TO" accent="starts here">Your next trip</PageTitle>
    <EmptyMoment style={s.emptyCard} title={activeTrip ? 'You’re away right now' : 'Somewhere lovely is waiting.'} copy={activeTrip ? `Enjoy every moment in ${activeTrip.city}. Add the next trip when you feel like looking ahead.` : 'Your next adventure will have its own little place here.'} actionTitle={activeTrip ? `Open ${activeTrip.title}` : 'Plan a trip'} icon={activeTrip ? 'arrow-forward' : 'add'} onPress={() => activeTrip ? openTrip(activeTrip) : router.push('/' as never)}/>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 44 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: colors.background }, loadingCopy: { color: colors.muted, fontSize: 14 },
  heroFrame: { borderRadius: 27, padding: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOpacity: .07, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  hero: { height: 390, borderRadius: 21, overflow: 'hidden', backgroundColor: colors.blueSoft }, heroImage: { borderRadius: 21 }, heroShade: { flex: 1, padding: 19, justifyContent: 'space-between' },
  destinationPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.9)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 30 }, destinationPillText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  heroText: { marginBottom: 1 }, tripName: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 25, fontWeight: '700', letterSpacing: -.3, marginBottom: 6 }, numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, number: { color: '#FFFFFF', fontSize: 88, lineHeight: 94, fontWeight: '700', letterSpacing: -6 }, numberLabel: { paddingTop: 9 }, numberLabelText: { color: 'rgba(255,255,255,.94)', fontSize: 15, fontWeight: '700', letterSpacing: 1.2, lineHeight: 20 }, departure: { color: 'rgba(255,255,255,.91)', fontSize: 14, fontWeight: '500', marginTop: 1 }, heroArrow: { position: 'absolute', right: 19, bottom: 19, width: 40, height: 40, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.9)', alignItems: 'center', justifyContent: 'center' },
  preparationHeading: { marginTop: 29, marginBottom: 15 }, sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 21, fontWeight: '700', letterSpacing: -.3 }, sectionCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  packingCard: { padding: 16 }, packingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, packingIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, packingTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700' }, progressTrack: { height: 6, borderRadius: 10, backgroundColor: '#EEF0F5', overflow: 'hidden', marginTop: 15 }, progressFill: { height: 6, borderRadius: 10, backgroundColor: colors.blue },
  detailsRow: { flexDirection: 'row', gap: 12, marginTop: 13 }, detailCard: { flex: 1, padding: 14, minHeight: 139 }, detailIcon: { width: 37, height: 37, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, detailLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: .75 }, detailValue: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 5 },
  otherTrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginTop: 11 }, emptyContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 65, paddingBottom: 40 }, emptyCard: { minHeight: 280, borderTopWidth: 4, borderTopColor: colors.blue }, pressed: { opacity: .75 },
});
