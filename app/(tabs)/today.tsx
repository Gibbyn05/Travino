import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { Trip, Activity, useTravel } from '@/src/store';
import { fetchWeather, Weather } from '@/src/weather';

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseTripDate(value: string): Date | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const written = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : written
      ? new Date(Number(written[3]), Number(written[2]) - 1, Number(written[1]))
      : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayDifference(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function dateLabel(date: Date, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en', options).format(date);
}

function destinationDate(value: string) {
  const parsed = parseTripDate(value);
  return parsed ? dateLabel(parsed, { month: 'short', day: 'numeric' }) : value;
}

function sortedByDate(trip: Trip) {
  return trip.activities
    .map((activity) => ({ activity, date: parseTripDate(activity.date) }))
    .filter((item): item is { activity: Activity; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.activity.startTime.localeCompare(b.activity.startTime));
}

function useDestinationWeather(city: string, country: string) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchWeather(city, country, controller.signal)
      .then((result) => setWeather(result))
      .catch((error) => { if (error.name !== 'AbortError') setWeather(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [city, country]);
  return { weather, loading };
}

export default function TodayScreen() {
  const { selectedTrip, ready, setSelectedTripId } = useTravel();
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  if (!ready) return <View style={s.loading}><Ionicons name="airplane-outline" size={26} color={colors.blue}/></View>;
  if (!selectedTrip) return <NoTrip/>;
  const openTripTab = (tab: string) => {
    setSelectedTripId(selectedTrip.id);
    router.push({ pathname: '/trip', params: { tab } } as never);
  };

  const start = parseTripDate(selectedTrip.startDate);
  const end = parseTripDate(selectedTrip.endDate);
  const dayCount = start ? dayDifference(today, start) : null;
  const isUpcoming = dayCount !== null && dayCount > 0;
  const isOnTrip = !!start && !!end && today >= start && today <= end;
  const activities = sortedByDate(selectedTrip);
  const todayPlan = activities.filter((item) => dayKey(item.date) === dayKey(today));
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nextTodayIndex = todayPlan.findIndex((item) => /^\d{2}:\d{2}$/.test(item.activity.startTime) && item.activity.startTime >= currentTime);
  const nextUpcoming = activities.find((item) => item.date >= today);
  const nextFutureDay = activities.find((item) => item.date > today);
  const doneCount = selectedTrip.packing.filter((item) => item.done).length;
  const openItems = selectedTrip.packing.filter((item) => !item.done);
  const packingProgress = selectedTrip.packing.length ? Math.round(doneCount / selectedTrip.packing.length * 100) : 0;

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow={isOnTrip ? `${selectedTrip.city} · ${selectedTrip.country}` : 'YOUR TRAVEL COMPANION'} accent={isOnTrip ? undefined : 'Today'}>
      {isOnTrip ? 'A day away' : 'What’s next'}
    </PageTitle>

    {isOnTrip ? <>
      <View style={s.dateHeading}>
        <Text style={s.dateText}>{dateLabel(today)}</Text>
        <Text style={s.dateSubtext}>A little look at what’s ahead.</Text>
      </View>
      <WeatherCard city={selectedTrip.city} country={selectedTrip.country}/>
      <Section title="Today's plan">
        {todayPlan.length ? <>
          {nextTodayIndex < 0 && <Text style={s.dayDone}>Today’s plans are all behind you. Take the rest of the day at your own pace.</Text>}
          {todayPlan.map((item, index) => <ActivityCard key={item.activity.id} activity={item.activity} featured={index === nextTodayIndex}/>)}</>
        : (
          <Card style={s.emptyPlan}>
            <View style={s.softIcon}><Ionicons name="leaf-outline" size={21} color={colors.purple}/></View>
            <Text style={s.emptyTitle}>A day with room to wander</Text>
            <Text style={s.body}>Nothing is planned for today. Keep it slow, or add a little something to your plan.</Text>
            <TextButton icon="add-circle-outline" label="Add an activity" onPress={() => openTripTab('Plan')}/>
          </Card>
        )}
      </Section>
      {nextFutureDay && <Pressable onPress={() => openTripTab('Plan')} style={({ pressed }) => [s.nextDay, pressed && s.pressed]}>
        <View style={s.nextDayIcon}><Ionicons name="arrow-forward" size={17} color={colors.blue}/></View>
        <View style={{ flex: 1 }}><Text style={s.overline}>UP NEXT</Text><Text style={s.nextDayTitle}>{nextFutureDay.activity.title}</Text><Text style={s.body}>{dateLabel(nextFutureDay.date, { weekday: 'short', month: 'short', day: 'numeric' })} · {nextFutureDay.activity.startTime}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted}/>
      </Pressable>}
      <Section title="A few little things">
        <PackingCard trip={selectedTrip} openItems={openItems} progress={packingProgress} onPress={() => openTripTab('Packing')}/>
      </Section>
    </> : isUpcoming ? <>
      <LinearGradient colors={['#E8F3FF', '#F2EEFF', '#FFF1F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.countdownCard}>
        <View style={s.countdownArt}><Ionicons name="airplane" size={27} color={colors.blue}/></View>
        <Text style={s.overline}>{selectedTrip.city.toUpperCase()} · {selectedTrip.country.toUpperCase()}</Text>
        <Text style={s.countdownNumber}>{dayCount}</Text>
        <Text style={s.countdownLabel}>{dayCount === 1 ? 'day until you leave' : 'days until you leave'}</Text>
        <Text style={s.body}>Your days away begin {destinationDate(selectedTrip.startDate)}.</Text>
      </LinearGradient>
      <Section title="Your next little adventure">
        {nextUpcoming ? <ActivityCard activity={nextUpcoming.activity} featured date={dateLabel(nextUpcoming.date, { weekday: 'long', month: 'long', day: 'numeric' })}/> : <Card style={s.inlineEmpty}><Text style={s.body}>Your plan is still open. Add something you’re looking forward to.</Text><TextButton icon="add-circle-outline" label="Plan an activity" onPress={() => openTripTab('Plan')}/></Card>}
      </Section>
      <Section title="Getting ready">
        <PackingCard trip={selectedTrip} openItems={openItems} progress={packingProgress} onPress={() => openTripTab('Packing')}/>
      </Section>
    </> : <>
      <LinearGradient colors={['#EFF8FF', '#F6F1FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.completedCard}>
        <View style={[s.countdownArt, { backgroundColor: '#FFFFFFCC' }]}><Ionicons name="heart" size={24} color={colors.pink}/></View>
        <Text style={s.overline}>A TRIP TO REMEMBER</Text>
        <Text style={s.completedTitle}>{selectedTrip.city}</Text>
        <Text style={s.body}>{selectedTrip.memories.length ? `${selectedTrip.memories.length} ${selectedTrip.memories.length === 1 ? 'photo' : 'photos'} saved from your time away.` : 'Your trip is complete. Keep the moments close in your memory book.'}</Text>
        <TextButton icon="images-outline" label="Open memory book" onPress={() => router.push({ pathname: '/memory-book/[country]', params: { country: selectedTrip.country } } as never)}/>
      </LinearGradient>
      <Section title="Looking ahead">
        <Card style={s.inlineEmpty}><Text style={s.emptyTitle}>Ready for the next one?</Text><Text style={s.body}>Start gathering ideas for somewhere new.</Text><TextButton icon="airplane-outline" label="See your trips" onPress={() => router.push('/trip' as never)}/></Card>
      </Section>
    </>}
  </ScrollView>;
}

function WeatherCard({ city, country }: { city: string; country: string }) {
  const { weather, loading } = useDestinationWeather(city, country);
  const icon = weather?.icon === 'fog-outline' ? 'cloudy-outline' : weather?.icon ?? 'partly-sunny-outline';
  return <Card style={s.weatherCard}>
    <View style={s.weatherIcon}><Ionicons name={icon} size={25} color={colors.blue}/></View>
    <View style={{ flex: 1 }}><Text style={s.weatherPlace}>A little weather check</Text><Text style={s.weatherCondition}>{loading ? 'Checking the sky…' : weather ? `${weather.condition} in ${city}` : 'Weather is taking a moment'}</Text></View>
    {weather && <View style={s.temperature}><Text style={s.temperatureValue}>{weather.temperature}°</Text><Text style={s.temperatureRange}>{weather.low}°–{weather.high}°</Text></View>}
  </Card>;
}

function ActivityCard({ activity, featured, date }: { activity: Activity; featured?: boolean; date?: string }) {
  return <Card style={[s.activityCard, featured && s.featuredActivity]}>
    <View style={[s.timeRail, featured && s.timeRailActive]}><Text style={[s.activityTime, featured && s.activityTimeActive]}>{activity.startTime}</Text><View style={[s.railLine, featured && s.railLineActive]}/></View>
    <View style={{ flex: 1 }}>
      {featured && <Text style={s.upNextLabel}>UP NEXT</Text>}
      {date && <Text style={s.activityDate}>{date}</Text>}
      <Text style={s.activityTitle}>{activity.title}</Text>
      <Text style={s.activityMeta}>{activity.endTime ? `${activity.startTime}–${activity.endTime}` : activity.startTime}{activity.location ? `  ·  ${activity.location}` : ''}</Text>
      {activity.note && <View style={s.activityNote}><Ionicons name="sparkles-outline" size={15} color={colors.purple}/><Text style={s.activityNoteText}>{activity.note}</Text></View>}
    </View>
  </Card>;
}

function PackingCard({ trip, openItems, progress, onPress }: { trip: Trip; openItems: Trip['packing']; progress: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && s.pressed}>
    <Card style={s.packingCard}>
      <View style={s.packingHeader}><View style={s.bagIcon}><Ionicons name="bag-handle-outline" size={21} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.packingTitle}>{trip.packing.length ? `${progress}% ready to go` : 'Start your packing list'}</Text><Text style={s.body}>{trip.packing.length ? `${trip.packing.length - openItems.length} of ${trip.packing.length} packed` : 'A few small preparations make travel easier.'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></View>
      <View style={s.progressTrack}><View style={[s.progressFill, { width: `${progress}%` as `${number}%` }]}/></View>
      {openItems.length > 0 && <Text style={s.openPacking}>{openItems.slice(0, 2).map((item) => item.title).join('  ·  ')}{openItems.length > 2 ? `  +${openItems.length - 2}` : ''}</Text>}
    </Card>
  </Pressable>;
}

function TextButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.textButton, pressed && { opacity: .65 }]}><Ionicons name={icon} size={18} color={colors.blue}/><Text style={s.textButtonLabel}>{label}</Text><Ionicons name="arrow-forward" size={15} color={colors.blue}/></Pressable>;
}

function NoTrip() {
  return <ScrollView style={s.page} contentContainerStyle={s.noTripContent}>
    <PageTitle eyebrow="YOUR TRAVEL COMPANION" accent="Today">Make it yours</PageTitle>
    <LinearGradient colors={['#E8F3FF', '#F3EEFF', '#FFF1F7']} style={s.noTripCard}>
      <View style={s.noTripIcon}><Ionicons name="sunny-outline" size={30} color={colors.blue}/></View>
      <Text style={s.completedTitle}>A little more room for adventure.</Text>
      <Text style={[s.body, { textAlign: 'center' }]}>Create a trip and we’ll keep your plans, weather and little travel details together here.</Text>
      <PrimaryButton title="Plan a trip" icon="airplane-outline" onPress={() => router.push('/' as never)}/>
    </LinearGradient>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingTop: 72, paddingBottom: 44 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  dateHeading: { marginTop: -8, marginBottom: 20 }, dateText: { color: colors.text, fontSize: 18, fontWeight: '600', letterSpacing: -.3, textTransform: 'capitalize' }, dateSubtext: { color: colors.muted, fontSize: 14, marginTop: 5 },
  weatherCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 22, backgroundColor: '#F2F7FF', borderColor: '#E5EEFC', shadowOpacity: 0 }, weatherIcon: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, weatherPlace: { color: colors.text, fontSize: 14, fontWeight: '600' }, weatherCondition: { color: colors.muted, fontSize: 12, marginTop: 3 }, temperature: { alignItems: 'flex-end' }, temperatureValue: { color: colors.blue, fontSize: 25, fontWeight: '700', letterSpacing: -1 }, temperatureRange: { color: colors.muted, fontSize: 10, marginTop: 1 },
  activityCard: { flexDirection: 'row', gap: 15, padding: 18, marginBottom: 10 }, featuredActivity: { backgroundColor: '#F4F0FF', borderColor: '#EAE3FF' }, timeRail: { width: 49, alignItems: 'center' }, timeRailActive: { }, activityTime: { color: colors.muted, fontSize: 12, fontWeight: '600' }, activityTimeActive: { color: colors.purple }, railLine: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 10, minHeight: 28 }, railLineActive: { backgroundColor: '#D6C8FA' }, activityDate: { color: colors.purple, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'capitalize' }, activityTitle: { color: colors.text, fontSize: 17, fontWeight: '600', letterSpacing: -.3 }, activityMeta: { color: colors.muted, fontSize: 12, marginTop: 5, lineHeight: 18 }, activityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#FFFFFFAA', borderRadius: 13, padding: 10, marginTop: 12 }, activityNoteText: { color: colors.text, fontSize: 12, lineHeight: 17, flex: 1 }, upNextLabel: { color: colors.purple, fontSize: 10, fontWeight: '700', letterSpacing: .8, marginBottom: 5 }, dayDone: { color: colors.muted, fontSize: 13, lineHeight: 20, paddingHorizontal: 2, marginBottom: 11 },
  emptyPlan: { backgroundColor: '#FBF9FF', borderColor: '#F0EAFB', alignItems: 'flex-start', padding: 19 }, softIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purpleSoft, marginBottom: 13 }, emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 2 }, body: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 }, textButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingVertical: 5 }, textButtonLabel: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  nextDay: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 20, backgroundColor: '#F3F8FF', padding: 16, marginTop: 9 }, nextDayIcon: { height: 38, width: 38, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, overline: { color: colors.blue, fontSize: 10, fontWeight: '700', letterSpacing: 1 }, nextDayTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
  countdownCard: { minHeight: 242, borderRadius: 28, padding: 22, justifyContent: 'flex-end', overflow: 'hidden' }, countdownArt: { position: 'absolute', top: 20, right: 20, width: 54, height: 54, borderRadius: 20, backgroundColor: '#FFFFFFCC', alignItems: 'center', justifyContent: 'center' }, countdownNumber: { color: colors.blue, fontSize: 70, lineHeight: 78, fontWeight: '700', letterSpacing: -4, marginTop: 9 }, countdownLabel: { color: colors.text, fontSize: 18, fontWeight: '600', letterSpacing: -.3 },
  inlineEmpty: { padding: 18 }, packingCard: { padding: 17 }, packingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, bagIcon: { height: 43, width: 43, borderRadius: 16, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center' }, packingTitle: { color: colors.text, fontSize: 15, fontWeight: '600' }, progressTrack: { height: 6, backgroundColor: '#EEF0F5', borderRadius: 9, marginTop: 17, overflow: 'hidden' }, progressFill: { height: 6, backgroundColor: colors.blue, borderRadius: 9 }, openPacking: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 10 },
  completedCard: { borderRadius: 27, padding: 22, minHeight: 240, justifyContent: 'flex-end', overflow: 'hidden' }, completedTitle: { color: colors.text, fontSize: 25, lineHeight: 30, fontWeight: '700', letterSpacing: -.8, marginTop: 8, marginBottom: 2 }, noTripContent: { padding: 20, paddingTop: 72, flexGrow: 1, justifyContent: 'center' }, noTripCard: { minHeight: 310, borderRadius: 28, padding: 25, alignItems: 'center', justifyContent: 'center', gap: 13 }, noTripIcon: { width: 62, height: 62, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFCC', marginBottom: 4 },
  pressed: { opacity: .74 },
});
