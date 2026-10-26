// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field, Sheet } from '@/src/forms';
import { Avatar, CapybaraMoment, Card, DestinationCover, EmptyMoment, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { TripDatesSheet } from '@/src/trip-dates-sheet';
import { TripDetailsSheet } from '@/src/trip-details-sheet';
import { useTravel, WishReaction } from '@/src/store';
import { fetchWeather, Weather } from '@/src/weather';
import { destinationToday, tripForecastDayLabel, tripWeatherPlan } from '@/src/trip-weather';
import { activitySuggestionsForDestination, packingCategorySuggestions, packingSuggestions, suggestedPackingCategory, wishSuggestions } from '@/src/suggestions';
import { inviteUrl } from '@/src/invites';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { remindersForTrip, scheduleTripReminders, sendTripNotification } from '@/src/notifications';
import { formatDate, formatJournalDate, formatTripDates, isGroupTrip } from '@/src/dates';
import { countryForTimeZone, countryInfoFor, plugCompatibility, plugDescriptions, timeDifferenceForTrip, voltageLabel, PlugType } from '@/src/travel-info';
import { plugIconSource } from '@/src/plug-icons';
import { tripNextStep } from '@/src/trip-guidance';
import { isoTripDate, tripDate } from '@/src/trip-planning';
import { UndoNotice, useTripUndo } from '@/src/trip-undo';
import { extraTripTabs, primaryTripTabs, primaryTripTab, tripSection, type TripSection } from '@/src/trip-navigation';
import { useTripSections } from '@/src/use-trip-sections';
import { activityDraftFor, emptyActivityDraft, type ActivityDraft } from '@/src/activity-drafts';
import { useActivityDrafts } from '@/src/activity-draft-provider';
export default function TripScreen() {
  const router = useRouter();
  const { selectedTrip } = useTravel();
  const { notice, undo, removeActivity, removePacking } = useTripUndo();
  const { tab: requestedTab, activityIntent } = useLocalSearchParams<{ tab?: string; activityIntent?: string }>();
  const [tab, setTab] = useState<TripSection>('Overview');
  const { ready: sectionsReady, sectionFor, rememberSection } = useTripSections();
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [startActivity, setStartActivity] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const revealNextStep = useCallback(() => scroll.current?.scrollTo({ y: 0, animated: true }), []);
  const handledActivityIntent = useRef<string | undefined>(undefined);
  const previousTrip = useRef<string | undefined>(undefined);
  const selectedId = selectedTrip?.id;
  useFocusEffect(useCallback(() => {
    if (!sectionsReady || !selectedId) return;
    const nextTab = tripSection(requestedTab || sectionFor(selectedId));
    setTab(nextTab);
    rememberSection(selectedId, nextTab);
    const addActivity = requestedTab === 'Plan' && Boolean(activityIntent) && handledActivityIntent.current !== activityIntent;
    if (addActivity) handledActivityIntent.current = activityIntent;
    if (requestedTab || previousTrip.current !== selectedId) setStartActivity(addActivity);
    previousTrip.current = selectedId;
    setDatesOpen(false); setDetailsOpen(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
    // Consume shortcuts once, so returning via the bottom menu resumes the trip.
    if (requestedTab !== undefined || activityIntent !== undefined) router.setParams({ tab: undefined, activityIntent: undefined });
  }, [selectedId, requestedTab, activityIntent, sectionsReady, sectionFor, rememberSection, router]));
  if (!selectedTrip) return <Empty/>;
  if (!sectionsReady) return <View style={[s.page, { justifyContent: 'center' }]}><ActivityIndicator accessibilityLabel="Opening trip" color={colors.blue}/></View>;
  const invite = () => {
    const base = process.env.EXPO_PUBLIC_APP_URL || 'https://travino-git-main-gibbyn05s-projects.vercel.app';
    const link = inviteUrl(selectedTrip, base);
    return Share.share({ message: `Join ${selectedTrip.title} in Travino:\n${link}` });
  };
  const isOverview = tab === 'Overview';
  const openTab = (nextTab: TripSection, addActivity = false) => {
    setStartActivity(addActivity); setTab(nextTab);
    rememberSection(selectedTrip.id, nextTab);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  return <View style={s.page}><ScrollView ref={scroll} style={s.page} contentContainerStyle={s.content}>
    {isOverview ? <PageTitle eyebrow={`${selectedTrip.city}, ${selectedTrip.country}`}>{selectedTrip.title}</PageTitle>
      : <View style={s.compactTripHeader}><Pressable accessibilityRole="button" accessibilityLabel="Open trip overview" onPress={() => openTab('Overview')} style={({ pressed }) => [s.compactOverviewLink, pressed && s.pressed]}>
        <DestinationCover country={selectedTrip.country} uri={selectedTrip.coverImage} style={s.compactTripImage} imageStyle={s.compactTripImage}/>
        <View style={s.compactTripContent}>
          <Text style={s.compactTripEyebrow}>{selectedTrip.city}, {selectedTrip.country}</Text>
          <Text style={s.compactTripTitle}>{selectedTrip.title}</Text>

        </View>
      </Pressable><InviteButton onPress={invite}/></View>}
    {isOverview && <><TripStatus/><TripCompanions onInvite={invite}/></>}
    <View accessibilityRole="tablist" accessibilityLabel="Trip sections" style={s.tripTabs}>{primaryTripTabs.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{ selected: primaryTripTab(tab) === item }} aria-selected={primaryTripTab(tab) === item} onPress={() => openTab(item)} style={({ pressed }) => [s.tripTab, { flex: item === 'Overview' ? 1.3 : item === 'Packing' ? 1.15 : .9 }, primaryTripTab(tab) === item && s.tripTabActive, pressed && s.pressed]}><Text style={[s.tripTabText, primaryTripTab(tab) === item && s.tripTabTextActive]}>{item}</Text></Pressable>)}</View>
    {extraTripTabs.includes(tab) && <Pressable accessibilityRole="button" accessibilityLabel="Back to More" onPress={() => openTab('More')} style={s.moreBack}><Ionicons name="chevron-back" size={20} color={colors.blue}/><Text style={s.overviewLinkText}>Back to More</Text></Pressable>}
    {!extraTripTabs.includes(tab) && !(tab === 'Packing' && !selectedTrip.packing.length) && <Text accessibilityRole="header" style={s.tripSectionTitle}>{tab}</Text>}
    {tab === 'More' && <More onOpen={openTab}/>}
    {tab === 'Overview' && <Overview key={`overview-${selectedTrip.id}`} onNext={(target) => openTab(target === 'add-activity' ? 'Plan' : target, target === 'add-activity')} onOpenPlan={() => openTab('Plan')} onEditDates={() => setDatesOpen(true)} onEditDetails={() => setDetailsOpen(true)} onInvite={invite} onOpenAddFriend={() => setAddFriendOpen(true)}/>}{tab === 'Plan' && <Plan key={`plan-${selectedTrip.id}`} onRemove={removeActivity} onOpenPacking={() => openTab('Packing')} onFirstSaved={revealNextStep} initiallyOpen={startActivity} onOpened={() => setStartActivity(false)}/>}{tab === 'Activities' && <ThingsToDo onOpen={(activity) => { router.push({ pathname: '/activity-browser', params: { activity, city: selectedTrip.city, country: selectedTrip.country } }); }} />}{tab === 'Packing' && <Packing onRemove={removePacking} onOpenPlan={() => openTab('Plan')} onComplete={revealNextStep}/>}{tab === 'Wishlist' && <Wishes/>}{tab === 'Memories' && <Memories/>}
    {detailsOpen && <TripDetailsSheet key={`details-${selectedTrip.id}`} trip={selectedTrip} onClose={() => setDetailsOpen(false)}/>}
    {datesOpen && <TripDatesSheet key={`dates-${selectedTrip.id}`} trip={selectedTrip} onClose={() => setDatesOpen(false)}/>}
    <AddTripFriendSheet visible={addFriendOpen} onClose={() => setAddFriendOpen(false)} tripId={selectedTrip.id} tripTitle={selectedTrip.title} existingNames={selectedTrip.members}/>
  </ScrollView><UndoNotice notice={notice} onUndo={undo}/></View>;
}

type TripFriend = { profile_id: string; display_name: string; status: string };
function InviteButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Invite to trip" onPress={onPress} style={({ pressed }) => [s.inviteShortcut, pressed && s.pressed]}><Ionicons name="person-add-outline" size={17} color={colors.blue}/><Text style={s.inviteShortcutText}>Invite</Text></Pressable>;
}

function TripCompanions({ onInvite }: { onInvite: () => void }) {
  const { selectedTrip, profileName, profilePhoto } = useTravel();
  if (!selectedTrip) return null;
  const people = [profileName || 'You', ...selectedTrip.members];
  return <View style={s.tripCompanions}>
    <View style={s.companionSummary}>
      <View style={s.companionAvatars}>{people.slice(0, 2).map((name, index) => <View key={`${name}-${index}`} style={s.companionAvatar}>{index === 0 && profilePhoto ? <Image accessibilityLabel={`${name} profile photo`} source={{ uri: profilePhoto }} style={s.companionAvatarPhoto}/> : <Text style={s.companionInitial}>{name.slice(0, 1).toUpperCase()}</Text>}</View>)}</View>
      <Text style={s.companionLabel}>{selectedTrip.members.length ? 'Travellers' : 'Just you'}</Text>
    </View>
    <InviteButton onPress={onInvite}/>
  </View>;
}

function More({ onOpen }: { onOpen: (section: string) => void }) {
  const choices = [
    { section: 'Activities', label: 'Things to do', icon: 'compass-outline', color: colors.blue, background: colors.blueSoft },
    { section: 'Wishlist', label: 'Wishlist', icon: 'heart-outline', color: colors.purple, background: colors.purpleSoft },
    { section: 'Memories', label: 'Memories', icon: 'images-outline', color: colors.coral, background: '#FFF0E8' },
  ];
  return <View style={s.moreChoices}>{choices.map(choice => <Pressable key={choice.section} accessibilityRole="button" accessibilityLabel={`Open ${choice.label.toLowerCase()}`} onPress={() => onOpen(choice.section)} style={({ pressed }) => [s.moreChoice, pressed && s.pressed]}>
    <View style={[s.moreIcon, { backgroundColor: choice.background }]}><Ionicons name={choice.icon as any} size={25} color={choice.color}/></View>
    <Text style={s.moreChoiceTitle}>{choice.label}</Text><Ionicons name="chevron-forward" size={21} color={colors.muted}/>
  </Pressable>)}</View>;
}

function AddTripFriendSheet({ visible, onClose, tripId, tripTitle, existingNames }: { visible: boolean; onClose: () => void; tripId: string; tripTitle: string; existingNames: string[] }) {
  const { addMember } = useTravel();
  const [friends, setFriends] = useState<TripFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState('');
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    (async () => {
      if (!supabase) throw new Error('Friends are unavailable.');
      const user = await ensureGuestIdentity();
      if (!user) throw new Error('Friends are unavailable.');
      const { data, error } = await supabase.rpc('my_friendships');
      if (error) throw error;
      const accepted = ((data || []) as any[]).filter((friend) => friend.status === 'accepted').map((friend) => ({ profile_id: friend.profile_id, display_name: friend.display_name, status: friend.status }));
      if (alive) setFriends(accepted);
    })().catch(() => {
      if (alive) Alert.alert('Friends could not be loaded', 'Try again when you are online.');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visible]);

  const add = async (friend: TripFriend) => {
    setAddingId(friend.profile_id);
    try {
      const result = await sendTripNotification({ event: 'member_added', tripId, tripTitle, recipientId: friend.profile_id });
      addMember(tripId, friend.display_name, friend.profile_id);
      onClose();
      Alert.alert(
        'Added to the trip',
        result.pushSent ? `${friend.display_name} has been added and notified.` : `${friend.display_name} has been added. They may need to enable push notifications on their phone.`,
      );
    } catch {
      Alert.alert('Could not add this friend', 'Try again when you are online.');
    } finally { setAddingId(''); }
  };

  const available = friends.filter((friend) => !existingNames.includes(friend.display_name));
  return <Sheet visible={visible} title="Invite someone" onClose={onClose}>
    <Text style={s.copy}>Choose someone you have connected with using a friend code. They will get a notification about this trip.</Text>
    {loading ? <ActivityIndicator color={colors.blue} style={{ padding: 24 }}/> : available.length ? available.map((friend) => <Pressable key={friend.profile_id} disabled={!!addingId} onPress={() => add(friend)} style={s.friendOption}>
      <Avatar name={friend.display_name}/><Text style={[s.itemTitle, { flex: 1 }]}>{friend.display_name}</Text>{addingId === friend.profile_id ? <ActivityIndicator color={colors.blue}/> : <Ionicons name="add-circle-outline" size={24} color={colors.blue}/>}
    </Pressable>) : <Text style={s.copy}>No new friends to add yet. Connect first from Profile → Friends.</Text>}
  </Sheet>;
}
function Empty() { const router = useRouter(); return <ScrollView style={s.page} contentContainerStyle={s.empty}><EmptyMoment title="Your next trip starts here" copy="Pick a place and Travino will keep the plans, lists and memories close." actionTitle="Plan a trip" icon="add" onPress={() => router.push('/new-trip' as never)}/></ScrollView>; }
function useWeather(city: string, country: string) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Refresh while the app is open, including once the trip moves into the
    // provider's ten-day forecast window.
    const refreshIn = 6 * 60 * 60 * 1000;
    const timer = setTimeout(() => setRefreshKey((value) => value + 1), refreshIn);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetchWeather(city, country, controller.signal)
      .then((value) => { setWeather(value); setLoading(false); })
      .catch((reason) => { if (reason.name !== 'AbortError') { setError(true); setLoading(false); } });
    return () => controller.abort();
  }, [city, country, refreshKey]);

  return { weather, error, loading };
}
function useCurrencyRate(currency?: string) { const [rate, setRate] = useState<number | null>(null); useEffect(() => { if (!currency || currency === 'NOK') { setRate(currency === 'NOK' ? 1 : null); return; } let active = true; fetch('https://open.er-api.com/v6/latest/NOK').then((response) => response.ok ? response.json() : null).then((payload) => { const value = Number(payload?.rates?.[currency]); if (active) setRate(Number.isFinite(value) ? value : null); }).catch(() => { if (active) setRate(null); }); return () => { active = false; }; }, [currency]); return rate; }
function readableCountdown(value: string) { const parts = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); const start = parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])) : new Date(value); if (Number.isNaN(start.getTime())) return null; const today = new Date(); today.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0); const days = Math.round((start.getTime() - today.getTime()) / 86400000); return days < 0 ? 'Trip completed' : days === 0 ? 'Leaving today' : `${days} ${days === 1 ? 'day' : 'days'} to go`; }
function WeatherCard({ city, startDate, endDate, weather, error, loading }: { city: string; startDate: string; endDate: string; weather: Weather | null; error: boolean; loading: boolean }) {
  const plan = tripWeatherPlan(weather, startDate, endDate);
  const today = destinationToday(weather?.timezone);
  const active = plan.kind === 'active';
  const subtitle = loading
    ? 'Checking the forecast for your travel dates…'
    : error
      ? 'The forecast will be back soon.'
      : active && weather
        ? `${weather.condition} · Feels like ${weather.apparentTemperature}°`
        : plan.kind === 'upcoming'
          ? 'Forecast for your travel dates'
          : plan.message;

  return <Card style={s.weatherCard}>
    <View style={s.weatherHeader}>
      <View style={s.weatherCurrent}>
        <View style={s.weatherIcon}><Ionicons name={active && weather ? weather.icon : 'calendar-outline'} size={25} color={colors.blue}/></View>
        <View style={{ flex: 1 }}>
          <Text style={s.weatherTitle}>{active ? `Today in ${city}` : `Weather for ${city}`}</Text>
          <Text style={s.copy}>{subtitle}</Text>
        </View>
      </View>
      {!loading && !error && active && weather ? <Text style={s.temperatureValue}>{weather.temperature}°</Text> : null}
    </View>
    {!loading && !error && plan.days.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.forecastStrip}>
      {plan.days.map((day) => <View key={day.date} style={s.forecastDay}>
        <Text style={s.forecastLabel}>{tripForecastDayLabel(day.date, today)}</Text>
        <Ionicons name={day.icon} size={18} color={day.date === today ? colors.blue : colors.muted}/>
        <Text style={s.forecastTemp}>{day.high}°</Text>
        <Text style={s.forecastLow}>{day.low}°</Text>
      </View>)}
    </ScrollView> : null}
    {!loading && !error && plan.message && plan.days.length ? <Text style={s.weatherNote}>{plan.message}</Text> : null}
    {!loading && !error && plan.packingTip ? <Text style={s.weatherTip}>{plan.packingTip}</Text> : null}
  </Card>;
}
function activityMoment(dateValue: string, timeValue: string) {
  const iso = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dotted = dateValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = iso
    ? new Date(+iso[1], +iso[2] - 1, +iso[3])
    : dotted
      ? new Date(+dotted[3], +dotted[2] - 1, +dotted[1])
      : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const time = timeValue.trim().match(/^(\d{1,2})(?::|\.)(\d{2})$/);
  if (!time || +time[1] > 23 || +time[2] > 59) return null;
  date.setHours(+time[1], +time[2], 0, 0);
  return date;
}

function activityStatus(activity: { date: string; startTime: string; endTime?: string }, now: Date) {
  const start = activityMoment(activity.date, activity.startTime);
  if (!start) return null;
  const end = activity.endTime ? activityMoment(activity.date, activity.endTime) : start;
  if (!end || end.getTime() < now.getTime()) return null;
  return { start, happeningNow: start.getTime() <= now.getTime() };
}

function Overview({ onNext, onOpenPlan, onEditDates, onEditDetails, onInvite, onOpenAddFriend }: { onNext: (target: string) => void; onOpenPlan: () => void; onEditDates: () => void; onEditDetails: () => void; onInvite: () => void; onOpenAddFriend: () => void }) {
  const { selectedTrip } = useTravel();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  if (!selectedTrip) return null;
  const step = tripNextStep(selectedTrip, tripState(selectedTrip).label === 'Completed');
  const guide = step.target === 'Memories'
    ? { line: "Let's keep the memories.", variant: 'memories' }
    : step.target === 'add-activity'
      ? { line: "Let's plan your first day.", variant: 'travel' }
      : step.target === 'Packing'
        ? { line: selectedTrip.packing.length ? "Let's finish packing." : "Let's pack for your trip.", variant: 'packing' }
        : { line: "You're ready to go!", variant: 'celebrate' };
  const nextEntry = selectedTrip.activities
    .map((activity) => ({ activity, status: activityStatus(activity, now) }))
    .filter((entry) => entry.status !== null)
    .sort((a, b) => a.status!.start.getTime() - b.status!.start.getTime())[0];
  const next = nextEntry?.activity;
  const happeningNow = nextEntry?.status?.happeningNow;
  const hasUnscheduled = selectedTrip.activities.some(activity => !activityMoment(activity.date, activity.startTime));
  return <>
    <Card style={s.guidanceCard}>
      <View style={s.guidanceIntro}>
        <CapybaraMoment key={guide.variant} size={128} variant={guide.variant}/>
        <Text accessibilityRole="header" style={s.guidanceTitle}>{guide.line}</Text>
      </View>
      <PrimaryButton title={step.button} icon={step.icon} onPress={() => onNext(step.target)}/>
    </Card>
    {selectedTrip.activities.length > 0 && <Section title="Next activity">
      {next ? <Pressable accessibilityRole="button" accessibilityLabel={`View ${next.title} in trip plan`} onPress={onOpenPlan} style={({ pressed }) => [s.overviewActivity, pressed && s.pressed]}>
        {happeningNow && <Text style={s.overviewActivityLabel}>Happening now</Text>}
        <Text style={s.overviewActivityTitle}>{next.title}</Text>
        <View style={s.nextActivityDetail}><Ionicons name="time-outline" size={18} color={colors.muted}/><Text style={s.overviewActivityMeta}>{formatDate(next.date)} · {next.startTime}{next.endTime ? `–${next.endTime}` : ''}</Text></View>
        {Boolean(next.location) && <View style={s.nextActivityDetail}><Ionicons name="location-outline" size={18} color={colors.muted}/><Text style={s.overviewActivityMeta}>{next.location}</Text></View>}
        <View style={s.overviewLink}><Text style={s.overviewLinkText}>View plan</Text><Ionicons name="arrow-forward" size={19} color={colors.blue}/></View>
      </Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="View trip plan" onPress={onOpenPlan} style={({ pressed }) => [s.overviewActivity, pressed && s.pressed]}>
        <Text style={s.overviewActivityTitle}>{hasUnscheduled ? 'Ideas for your trip' : 'All caught up'}</Text>
        <View style={s.overviewLink}><Text style={s.overviewLinkText}>View plan</Text><Ionicons name="arrow-forward" size={19} color={colors.blue}/></View>
      </Pressable>}
    </Section>}
    <View style={s.overviewDetailsBlock}>
      <Pressable accessibilityRole="button" accessibilityLabel="Trip details" accessibilityState={{ expanded: detailsExpanded }} aria-expanded={detailsExpanded} onPress={() => setDetailsExpanded(value => !value)} style={({ pressed }) => [s.overviewDetailsButton, pressed && s.pressed]}>
        <View style={s.overviewDetailsIcon}><Ionicons name="options-outline" size={23} color={colors.blue}/></View><Text style={s.overviewDetailsTitle}>Trip details</Text><Ionicons name={detailsExpanded ? 'chevron-up' : 'chevron-down'} size={21} color={colors.muted}/>
      </Pressable>
      {detailsExpanded && <OverviewDetails onEditDates={onEditDates} onEditDetails={onEditDetails} onInvite={onInvite} onOpenAddFriend={onOpenAddFriend}/>}
    </View>
  </>;
}

function OverviewDetails({ onEditDates, onEditDetails, onInvite, onOpenAddFriend }: { onEditDates: () => void; onEditDetails: () => void; onInvite: () => void; onOpenAddFriend: () => void }) {
  const { selectedTrip, updateTrip } = useTravel();
  const weatherState = useWeather(selectedTrip?.city || '', selectedTrip?.country || '');
  if (!selectedTrip) return null;
  const remindersEnabled = Boolean(selectedTrip.reminderNotificationIds?.length);
  const gentleReminders = remindersForTrip(selectedTrip).slice(0, 2);
  const enableReminders = async () => {
    try {
      const result = await scheduleTripReminders(selectedTrip);
      if (result.status === 'denied') {
        Alert.alert('Reminders are off', 'You can turn them on later in iPhone Settings.');
        return;
      }
      updateTrip(selectedTrip.id, { reminderNotificationIds: result.ids });
      Alert.alert(result.reminders.length ? 'Reminders are on' : 'No upcoming reminders', result.reminders.length ? 'Your trip reminders are ready.' : 'Add travel dates or scheduled activities first.');
    } catch {
      Alert.alert('Reminders could not be set', 'Try again in a moment.');
    }
  };
  return <View style={s.overviewDetailsContent}>
    <Card style={s.overviewSettings}>
      <Text style={s.overviewActivityMeta}>{formatTripDates(selectedTrip.startDate, selectedTrip.endDate)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={selectedTrip.startDate ? 'Change dates' : 'Add travel dates'} onPress={onEditDates} style={s.overviewSettingRow}><Ionicons name="calendar-outline" size={21} color={colors.blue}/><Text style={s.overviewSettingText}>{selectedTrip.startDate ? 'Change dates' : 'Add travel dates'}</Text><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Name & style" onPress={onEditDetails} style={s.overviewSettingRow}><Ionicons name="create-outline" size={21} color={colors.blue}/><Text style={s.overviewSettingText}>Name & style</Text><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
    </Card>
    <WeatherCard city={selectedTrip.city} startDate={selectedTrip.startDate} endDate={selectedTrip.endDate} {...weatherState}/>
    <TravelInfo country={selectedTrip.country} city={selectedTrip.city} tripStartDate={selectedTrip.startDate} destinationTimeZone={selectedTrip.destinationTimeZone}/>
    <Section title="Travellers">
      <Card style={s.overviewSettings}>
        {isGroupTrip(selectedTrip.members) && <View style={s.overviewMembers}>{selectedTrip.members.map(member => <View key={member} style={s.overviewMember}><Avatar name={member}/><Text style={s.overviewSettingText}>{member}</Text></View>)}</View>}
        <Pressable accessibilityRole="button" accessibilityLabel="Invite travellers" onPress={onInvite} style={s.overviewSettingRow}><Ionicons name="person-add-outline" size={21} color={colors.blue}/><Text style={s.overviewSettingText}>Invite travellers</Text><Ionicons name="arrow-forward" size={18} color={colors.muted}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a friend" onPress={onOpenAddFriend} style={s.overviewSettingRow}><Ionicons name="people-outline" size={21} color={colors.blue}/><Text style={s.overviewSettingText}>Add a friend</Text><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
      </Card>
    </Section>
    <Section title="Reminders">
      <Card style={s.overviewSettings}>
        <Text style={s.overviewActivityMeta}>{remindersEnabled ? 'Reminders are on' : 'Reminders are off'}</Text>
        {gentleReminders.length > 0 && <View style={s.reminderList}>{gentleReminders.map(reminder => <View style={s.reminderRow} key={`${reminder.title}-${reminder.when.toISOString()}`}><Ionicons name="time-outline" size={17} color={colors.muted}/><Text style={s.overviewActivityMeta}>{reminder.title}</Text></View>)}</View>}
        {!remindersEnabled && <Pressable accessibilityRole="button" accessibilityLabel="Turn on reminders" onPress={enableReminders} style={s.overviewSettingRow}><Ionicons name="notifications-outline" size={21} color={colors.blue}/><Text style={s.overviewSettingText}>Turn on reminders</Text><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>}
      </Card>
    </Section>
  </View>;
}
function PlugIcon({ type, size = 48 }: { type: PlugType; size?: number }) {
  return <Image source={plugIconSource[type]} resizeMode="contain" style={{ width: size, height: size }}/>;
}

function TravelInfo({ country, city, tripStartDate, destinationTimeZone }: { country: string; city: string; tripStartDate: string; destinationTimeZone?: string }) {
  const { homeTimeZone, homeCountry } = useTravel();
  const [plugsOpen, setPlugsOpen] = useState(false);
  const info = countryInfoFor(country);
  const homeInfo = countryInfoFor(homeCountry ?? countryForTimeZone(homeTimeZone) ?? '');
  const rate = useCurrencyRate(info?.currency);
  const timeDifference = timeDifferenceForTrip(destinationTimeZone, homeTimeZone, tripStartDate);
  const compatibility = plugCompatibility(info, homeInfo);
  const thaiGroundingNote = country.trim().toLocaleLowerCase('en-US') === 'thailand' && compatibility?.matching.includes('F');
  const exchange = rate && info ? `100 kr ≈ ${new Intl.NumberFormat('en', { maximumFractionDigits: info.currency === 'JPY' ? 0 : 1 }).format(rate * 100)} ${info.currency}` : info ? `${info.currency} · ${info.currencyName}` : 'Currency details soon';
  return <Section title="Good to know"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.infoRow}>
    {timeDifference ? <View style={s.infoCard}><View style={s.infoIcon}><Ionicons name="time-outline" size={18} color={colors.blue}/></View><Text style={s.infoLabel}>TIME</Text><Text style={s.infoValue}>{timeDifference.title}</Text><Text style={s.infoCopy}>It is {timeDifference.localTime} in {city}</Text></View> : null}
    <View style={s.infoCard}><View style={[s.infoIcon, s.currencyIcon]}><Ionicons name="cash-outline" size={18} color={colors.purple}/></View><Text style={s.infoLabel}>CURRENCY</Text><Text style={s.infoValue}>{exchange}</Text><Text style={s.infoCopy}>{info ? info.currencyName : 'No currency details yet'}</Text></View>
    {info ? <Pressable accessibilityRole="button" accessibilityLabel={`Open plug details for ${country}`} onPress={() => setPlugsOpen(true)} style={[s.infoCard, s.plugCard]}>
      <View style={s.plugPreview}>{info.plugs.slice(0, 3).map((type) => <View key={type} style={s.plugPreviewIcon}><PlugIcon type={type} size={34}/><Text style={s.plugTypeMini}>Type {type}</Text></View>)}{info.plugs.length > 3 ? <View style={s.morePlugTypes}><Text style={s.morePlugTypesText}>+{info.plugs.length - 3}</Text></View> : null}</View>
      <Text style={s.infoLabel}>PLUGS</Text><Text style={s.infoValue}>{voltageLabel(info)}</Text>
      {compatibility ? <View style={[s.plugStatus, compatibility.needsAdapter ? s.adapterStatus : s.worksStatus]}><Ionicons name={compatibility.needsAdapter ? 'alert-circle-outline' : 'checkmark-circle'} size={14} color={compatibility.needsAdapter ? '#B86521' : '#25885C'}/><Text style={[s.plugStatusText, compatibility.needsAdapter ? s.adapterStatusText : s.worksStatusText]}>{compatibility.needsAdapter ? 'You need an adapter' : 'Your plugs work here'}</Text></View> : <Text style={s.infoCopy}>Tap for plug details</Text>}
    </Pressable> : null}
  </ScrollView>{info ? <Sheet visible={plugsOpen} title={`Plugs in ${country}`} onClose={() => setPlugsOpen(false)}>
    <Text style={s.plugSheetIntro}>{voltageLabel(info)}</Text>
    <View style={s.plugDetailList}>{info.plugs.map((type) => <View key={type} style={s.plugDetailRow}><View style={s.plugDetailIcon}><PlugIcon type={type}/></View><View style={{ flex: 1 }}><Text style={s.plugDetailTitle}>Type {type}</Text><Text style={s.plugDetailCopy}>{plugDescriptions[type]}</Text></View></View>)}</View>
    {compatibility ? <View style={[s.plugSheetTip, compatibility.needsAdapter ? s.adapterStatus : s.worksStatus]}><Ionicons name={compatibility.needsAdapter ? 'alert-circle-outline' : 'checkmark-circle'} size={18} color={compatibility.needsAdapter ? '#B86521' : '#25885C'}/><View style={{ flex: 1 }}><Text style={[s.plugSheetTipTitle, compatibility.needsAdapter ? s.adapterStatusText : s.worksStatusText]}>{compatibility.needsAdapter ? 'You need an adapter' : 'Your plugs work here'}</Text><Text style={s.plugSheetTipCopy}>{compatibility.needsAdapter ? compatibility.adapterTip : `Type ${compatibility.matching.join(' and Type ')} is used at home too.`}</Text></View></View> : null}
    {thaiGroundingNote ? <View style={s.groundingNote}><Ionicons name="information-circle-outline" size={17} color="#8C4D19"/><Text style={s.groundingNoteText}>Type C works directly. Type F can fit hybrid outlets, but its earth contact may not connect.</Text></View> : null}
    {compatibility?.voltageWarning ? <View style={s.voltageWarning}><Ionicons name="flash-outline" size={17} color="#B86521"/><Text style={s.voltageWarningText}>Check that your charger supports 100 to 240 V.</Text></View> : null}
    <Text style={s.plugSource}>Reference: World Standards country plug and voltage guide.</Text>
  </Sheet> : null}</Section>;
}
function tripState(trip: { startDate: string; endDate: string }) {
  const start = tripDate(trip.startDate);
  const end = tripDate(trip.endDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!start || !end || end < start) return { label: 'Upcoming', countdown: 'Dates later' };
  const days = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (days > 0) return { label: 'Upcoming', countdown: days === 1 ? '1 day to go' : `Starts in ${days} days` };
  if (end >= today) {
    const number = Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1);
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return { label: 'Active', countdown: `Day ${number} of ${total}` };
  }
  return { label: 'Completed', countdown: 'A trip to remember' };
}
function TripStatus() {
  const { selectedTrip } = useTravel();
  if (!selectedTrip) return null;
  const state = tripState(selectedTrip);
  return <View style={s.overviewStatus}><Ionicons name={state.label === 'Completed' ? 'checkmark-circle-outline' : 'calendar-outline'} size={19} color={colors.blue}/><Text style={s.overviewStatusText}>{state.countdown}</Text></View>;
}
function Plan({ initiallyOpen = false, onOpened, onRemove, onOpenPacking, onFirstSaved }: { initiallyOpen?: boolean; onOpened?: () => void; onRemove: (id: string) => void; onOpenPacking: () => void; onFirstSaved: () => void }) {
  const { selectedTrip, addActivity, updateActivity } = useTravel();
  const { drafts, saveDraft, discardDraft } = useActivityDrafts();
  const tripId = selectedTrip?.id ?? '';
  const [open, setOpen] = useState(initiallyOpen);
  const [form, setForm] = useState<ActivityDraft>(() => activityDraftFor(drafts, tripId) ?? emptyActivityDraft());
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState('');
  const [firstSaved, setFirstSaved] = useState(false);
  const { title, date, startTime: start, endTime: end, location, note, details } = form;
  const pendingNew = activityDraftFor(drafts, tripId);
  const pendingCurrent = activityDraftFor(drafts, tripId, editingId);
  const newActivityLabel = pendingNew ? 'Continue activity' : selectedTrip?.activities.length ? 'Add another activity' : 'Add first activity';
  const openNew = useCallback((day?: string) => {
    const next = { ...(activityDraftFor(drafts, tripId) ?? emptyActivityDraft()), ...(day ? { date: day } : {}) };
    setForm(next); setEditingId(undefined); setError(''); setOpen(true);
    if (day) saveDraft(tripId, next);
  }, [drafts, tripId, saveDraft]);
  useEffect(() => { if (initiallyOpen) { openNew(); onOpened?.(); } }, [initiallyOpen, openNew, onOpened]);
  const changeForm = (patch: Partial<ActivityDraft>) => {
    const next = { ...form, ...patch };
    setForm(next); saveDraft(tripId, next, editingId);
  };
  const close = () => { setOpen(false); setError(''); };
  if (!selectedTrip) return null;
  const needsPacking = selectedTrip.activities.length > 0 && !selectedTrip.packing.length && tripState(selectedTrip).label !== 'Completed' && selectedTrip.completionState !== 'completed';
  const ideas = activitySuggestionsForDestination(selectedTrip.city, selectedTrip.country);
  const orderedActivities = selectedTrip.activities.slice().sort((left, right) => {
    const leftTime = activityMoment(left.date, left.startTime || '00:00')?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = activityMoment(right.date, right.startTime || '00:00')?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || left.title.localeCompare(right.title);
  });
  const dayGroups = orderedActivities.reduce<{ key: string; heading: string; date: string; activityDate: string; items: typeof orderedActivities }[]>((groups, activity) => {
    const parsed = activityMoment(activity.date, '00:00');
    const key = parsed ? `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}` : 'unscheduled';
    let group = groups.find((item) => item.key === key);
    if (!group) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isToday = parsed?.getTime() === today.getTime();
      const isTomorrow = parsed?.getTime() === tomorrow.getTime();
      group = {
        key,
        heading: !parsed ? 'IDEAS FOR YOUR TRIP' : isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : new Intl.DateTimeFormat('en', { weekday: 'long' }).format(parsed).toUpperCase(),
        date: parsed ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(parsed) : 'Set dates later',
        activityDate: parsed ? isoTripDate(activity.date) : '',
        items: [],
      };
      groups.push(group);
    }
    group.items.push(activity);
    return groups;
  }, []);
  const clear = () => { setForm(emptyActivityDraft()); setEditingId(undefined); setError(''); };
  const fromActivity = (item: typeof selectedTrip.activities[number]): ActivityDraft => ({ title: item.title, date: item.date, startTime: item.startTime, endTime: item.endTime || '', location: item.location || '', note: item.note || '', details: true });
  const edit = (item: typeof selectedTrip.activities[number]) => {
    setEditingId(item.id); setForm(activityDraftFor(drafts, tripId, item.id) ?? fromActivity(item)); setError(''); setOpen(true);
  };
  const discard = () => {
    discardDraft(tripId, editingId);
    const original = selectedTrip.activities.find(item => item.id === editingId);
    setForm(original ? fromActivity(original) : emptyActivityDraft()); setError('');
  };
  const save = () => {
    if (!title.trim()) return;
    if ((start && !activityMoment(date, start)) || (end && (!start || !activityMoment(date, end) || activityMoment(date, end)! < activityMoment(date, start)!))) {
      setError('Choose a date and use times like 10:00. End time must be after start time.');
      return;
    }
    const item = { title: title.trim(), date, startTime: start, endTime: end, location, note };
    const firstActivity = !editingId && selectedTrip.activities.length === 0;
    if (editingId) updateActivity(selectedTrip.id, editingId, item);
    else addActivity(selectedTrip.id, item);
    discardDraft(tripId, editingId);
    setFirstSaved(firstActivity);
    setOpen(false); clear();
    if (firstActivity && !selectedTrip.packing.length) onFirstSaved();
  };
  return <View style={s.tripSectionContent}>
    {needsPacking && <Card style={s.handoffCard}>
      <View style={s.handoffHeading}>
        {firstSaved && <CapybaraMoment size={64} variant="celebrate"/>}
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.handoffTitle}>{firstSaved ? 'Activity added!' : 'Ready to pack?'}</Text>
      </View>
      <View><PrimaryButton title="Create packing list" icon="bag-handle-outline" onPress={onOpenPacking}/><Pressable accessibilityRole="button" accessibilityLabel={newActivityLabel} onPress={() => openNew()} style={({ pressed }) => [s.handoffSecondary, pressed && s.pressed]}><Ionicons name={pendingNew ? 'arrow-forward' : 'add'} size={19} color={colors.blue}/><Text style={s.overviewLinkText}>{newActivityLabel}</Text></Pressable></View>
    </Card>}
    {dayGroups.length ? <View style={s.planTimeline}>{dayGroups.map((group) => <View key={group.key} style={s.planDay}>
      <View style={s.planDayHeader}>
        <View style={s.planDayMarker}><View style={s.planDayDot}/></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={s.planDayHeading}>{group.heading}</Text><Text style={s.planDayDate}>{group.date}</Text></View>
        <View style={s.planDayCount}><Text style={s.planDayCountText}>{group.items.length}</Text></View>
      </View>
      {Boolean(group.activityDate) && <Pressable accessibilityRole="button" accessibilityLabel={`Add activity on ${group.date}`} onPress={() => openNew(group.activityDate)} style={({ pressed }) => [s.planDayAdd, pressed && s.pressed]}><Ionicons name="add" size={18} color={colors.blue}/><Text style={s.planDayAddText}>Add activity</Text></Pressable>}
      <View style={s.planDayActivities}>{group.items.map((item) => <Card key={item.id} style={s.planActivityCard}>
        <View style={s.planCardTop}><View style={s.planTimeBlock}><Text style={s.planStartTime}>{item.startTime || '—'}</Text>{Boolean(item.endTime) && <Text style={s.planEndTime}>– {item.endTime}</Text>}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`} hitSlop={10} onPress={() => onRemove(item.id)} style={({ pressed }) => [s.planRemove, pressed && s.pressed]}><Ionicons name="trash-outline" size={17} color={colors.muted}/></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={() => edit(item)} style={s.planActivityContent}>
          <Text style={s.itemTitle}>{item.title}</Text>
          {Boolean(item.location) && <View style={s.planMetaRow}><Ionicons name="location-outline" size={14} color={colors.muted}/><Text style={s.planMetaText}>{item.location}</Text></View>}
          {Boolean(item.note) && <Text style={s.planNote} numberOfLines={2}>{item.note}</Text>}
          <Text style={s.editDatesText}>{!item.date ? 'Add details' : 'Edit'}</Text>
        </Pressable>

      </Card>)}</View>
    </View>)}</View> : null}
    {!needsPacking && <View style={s.planAddButton}><PrimaryButton title={newActivityLabel} onPress={() => openNew()}/></View>}
    <Sheet visible={open} title={editingId ? 'Edit activity' : selectedTrip.activities.length ? 'New activity' : 'First activity'} onClose={close}>
      {Boolean(date) && !details && <Pressable accessibilityRole="button" accessibilityLabel={`Change activity date, ${formatDate(date)}`} onPress={() => changeForm({ details: true })} style={s.activityDateContext}><Ionicons name="calendar-outline" size={19} color={colors.blue}/><Text style={s.activityDateText}>{formatDate(date)}</Text><Text style={s.activityDateChange}>Change</Text></Pressable>}
      <AutocompleteField value={title} onChangeText={(title) => changeForm({ title })} placeholder="Activity" suggestions={ideas} hideLabel showSuggestionsOnFocus/>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => changeForm({ details: !details })} style={s.editDates}><Ionicons name={details ? 'chevron-up' : 'add'} color={colors.blue} size={18}/><Text style={s.editDatesText}>{details ? 'Hide details' : 'Add details'}</Text></Pressable>
      {details && <>
        <DateField value={date} onChangeText={(date) => changeForm({ date })} placeholder="Date (optional)"/>
        <Field value={start} onChangeText={(startTime) => changeForm({ startTime })} placeholder="Start time (optional)"/>
        <Field value={end} onChangeText={(endTime) => changeForm({ endTime })} placeholder="End time (optional)"/>
        <Field value={location} onChangeText={(location) => changeForm({ location })} placeholder="Location (optional)"/>
        <Field value={note} onChangeText={(note) => changeForm({ note })} placeholder="Note (optional)" multiline/>
      </>}
      {error ? <Text accessibilityRole="alert" style={{ color: '#B42318', marginVertical: 12 }}>{error}</Text> : null}
      {pendingCurrent && <Pressable accessibilityRole="button" accessibilityLabel="Discard draft" onPress={discard} style={({ pressed }) => [s.discardDraft, pressed && s.pressed]}><Text style={s.discardDraftText}>Discard draft</Text></Pressable>}
      <PrimaryButton title={editingId ? 'Save changes' : 'Add activity'} icon="checkmark" disabled={!title.trim()} onPress={save}/>
    </Sheet>
  </View>;
}
function ThingsToDo({ onOpen }: { onOpen: (activity: string) => void }) {
  const { selectedTrip } = useTravel();
  if (!selectedTrip) return null;
  const ideas = activitySuggestionsForDestination(selectedTrip.city, selectedTrip.country);
  return <Section title={`Things to do near ${selectedTrip.city}`}>
    <Text style={s.copy}>Explore local ideas on GetYourGuide. Choose one to see available experiences.</Text>
    <View style={s.stack}>
      {ideas.map((idea, index) => <Pressable key={idea.value} accessibilityRole="button" onPress={() => onOpen(idea.value)} style={s.activityIdea}>
        <View style={[s.activityIcon, index % 3 === 1 && s.activityIconWarm, index % 3 === 2 && s.activityIconPurple]}>
          <Ionicons name={index % 3 === 0 ? 'compass-outline' : index % 3 === 1 ? 'sparkles-outline' : 'camera-outline'} size={21} color={index % 3 === 1 ? colors.coral : colors.blue}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.itemTitle}>{idea.value}</Text>
          <Text style={s.copy}>{idea.detail || selectedTrip.city} · GetYourGuide</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.blue}/>
      </Pressable>)}
    </View>
  </Section>;
}
const packingTemplates = [
  { name: 'Beach', icon: 'sunny-outline', tint: '#FFF4DE', color: '#A66B13', items: [['Passport', 'Documents'], ['Charger', 'Electronics'], ['Toiletry bag', 'Toiletries'], ['Underwear', 'Clothing'], ['Swimwear', 'Clothing'], ['Sunscreen', 'Toiletries'], ['Sunglasses', 'Beach & sun'], ['Sandals', 'Shoes']] },
  { name: 'City', icon: 'business-outline', tint: colors.blueSoft, color: colors.blue, items: [['Passport', 'Documents'], ['Charger', 'Electronics'], ['Toiletry bag', 'Toiletries'], ['Underwear', 'Clothing'], ['Sneakers', 'Shoes'], ['Jacket', 'Clothing'], ['Power bank', 'Electronics'], ['Bank card', 'Documents']] },
  { name: 'Adventure', icon: 'trail-sign-outline', tint: '#E9F4EC', color: '#38704C', items: [['Passport', 'Documents'], ['Charger', 'Electronics'], ['Toiletry bag', 'Toiletries'], ['Underwear', 'Clothing'], ['Hiking boots', 'Shoes'], ['Rain jacket', 'Clothing'], ['Water bottle', 'Other'], ['First aid kit', 'Health']] },
];
const packingCategories = [
  { name: 'Clothing', icon: 'shirt-outline' }, { name: 'Shoes', icon: 'walk-outline' }, { name: 'Toiletries', icon: 'water-outline' }, { name: 'Beach & sun', icon: 'sunny-outline' },
  { name: 'Electronics', icon: 'flash-outline' }, { name: 'Documents', icon: 'document-text-outline' }, { name: 'Health', icon: 'medkit-outline' }, { name: 'Other', icon: 'ellipsis-horizontal' },
];
function weatherPackingSuggestions(weather: Weather | null) {
  if (!weather) return [];
  const forecast = weather.forecast || [];
  const highest = Math.max(weather.high ?? weather.temperature, ...forecast.map((day) => day.high));
  const lowest = Math.min(weather.low ?? weather.temperature, ...forecast.map((day) => day.low));
  const icons = [weather.icon, ...forecast.map((day) => day.icon)];
  const suggested: [string, string][] = [['Passport', 'Documents'], ['Charger', 'Electronics']];
  if (highest >= 23) suggested.push(['Swimwear', 'Beach & sun'], ['Sunscreen', 'Toiletries'], ['Sunglasses', 'Beach & sun']);
  if (icons.some((icon) => icon === 'rainy-outline' || icon === 'thunderstorm-outline')) suggested.push(['Rain layer', 'Clothing'], ['Compact umbrella', 'Other']);
  if (lowest <= 12 || icons.includes('snow-outline')) suggested.push(['Warm layer', 'Clothing']);
  return suggested;
}
function Packing({ onRemove, onOpenPlan, onComplete }: { onRemove: (id: string) => void; onOpenPlan: () => void; onComplete: () => void }) {
  const { selectedTrip, addPacking, togglePacking, updateTrip } = useTravel();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [person, setPerson] = useState('');
  const [details, setDetails] = useState(false);
  const [showWeatherSuggestions, setShowWeatherSuggestions] = useState(false);
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(selectedTrip?.city || '', selectedTrip?.country || '');
  const allPacked = Boolean(selectedTrip?.packing.length && selectedTrip.packing.every(item => item.done));
  const wasPacked = useRef(allPacked);
  useEffect(() => { if (allPacked && !wasPacked.current) onComplete(); wasPacked.current = allPacked; }, [allPacked, onComplete]);
  if (!selectedTrip) return null;
  const total = selectedTrip.packing.length;
  const packed = selectedTrip.packing.filter((item) => item.done).length;
  const progress = total ? Math.round(packed / total * 100) : 0;
  const resolvedCategory = category || suggestedPackingCategory(title) || 'Other';
  const openItem = () => { setTitle(''); setCategory(''); setPerson(''); setDetails(false); setOpen(true); };
  const memberSuggestions = selectedTrip.members.map((name) => ({ label: name, value: name }));
  const weatherSuggestions = weatherPackingSuggestions(weather).filter(([item]) => !selectedTrip.packing.some((packed) => packed.title.toLowerCase() === item.toLowerCase()));
  const groups = selectedTrip.packing.reduce<Record<string, typeof selectedTrip.packing>>((all, item) => {
    const key = item.category || 'Other';
    all[key] = [...(all[key] ?? []), item];
    return all;
  }, {});
  const orderedGroups = Object.entries(groups).sort(([left], [right]) => {
    const leftIndex = packingCategorySuggestions.findIndex((item) => item.value === left);
    const rightIndex = packingCategorySuggestions.findIndex((item) => item.value === right);
    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex) || left.localeCompare(right, 'en');
  });
  const save = () => {
    if (!title.trim()) return;
    const cleanTitle = title.trim();
    const recipientId = selectedTrip.memberAccountIds?.[person.trim()];
    addPacking(selectedTrip.id, { title: cleanTitle, category: resolvedCategory, person: person.trim() });
    setOpen(false);
    setTitle(''); setCategory(''); setPerson(''); setDetails(false);
    if (recipientId) sendTripNotification({ event: 'packing_assigned', tripId: selectedTrip.id, tripTitle: selectedTrip.title, recipientId, itemTitle: cleanTitle }).then((result) => {
      if (!result.pushSent) Alert.alert('Packing item saved', 'The item was assigned, but your travel companion may need to enable push notifications.');
    }).catch((error: any) => Alert.alert('Packing item saved', `The assignment was saved, but the notification could not be sent. ${error?.message || ''}`));
  };
  const addItems = (items: [string, string][]) => {
    const existing = new Set(selectedTrip.packing.map((item) => item.title.trim().toLowerCase()));
    const fresh = items.filter(([item]) => !existing.has(item.toLowerCase()));
    if (!fresh.length) return;
    updateTrip(selectedTrip.id, { packing: [...selectedTrip.packing, ...fresh.map(([item, itemCategory], index) => ({ id: `packing-${Date.now()}-${index}`, title: item, category: itemCategory, done: false }))] });
  };
  return <View style={s.tripSectionContent}>
    {!total ? <View style={s.packingStart}>
      <View style={s.packingMascot}>
        <CapybaraMoment size={144} variant="packing"/>
        <View style={s.packingSpeechBubble}>
          <View pointerEvents="none" accessible={false} aria-hidden style={s.packingSpeechTail}/>
          <Text accessibilityRole="header" style={s.packingQuestion}>What kind of trip?</Text>
        </View>
      </View>
      <View style={s.templateGrid}>{packingTemplates.map((template) => <Pressable key={template.name} accessibilityRole="button" accessibilityLabel={`Create ${template.name.toLowerCase()} packing list`} onPress={() => addItems(template.items as [string, string][])} style={({ pressed }) => [s.templateCard, pressed && s.pressed]}>
        <View style={[s.templateIcon, { backgroundColor: template.tint }]}><Ionicons name={template.icon as any} size={27} color={template.color}/></View>
        <Text style={s.templateTitle}>{template.name}</Text>
        <Ionicons name="arrow-forward" size={22} color={colors.blue}/>
      </Pressable>)}</View>
      <Pressable accessibilityRole="button" onPress={openItem} style={({ pressed }) => [s.packingStartEmpty, pressed && s.pressed]}><Text style={s.packingLinkText}>Start my own list</Text></Pressable>
    </View> : <>
    <View style={[s.packingProgress, packed === total && s.packingComplete]}>
      <View style={s.packingProgressHeading}>{allPacked && <CapybaraMoment size={72} variant="celebrate"/>}<Text accessibilityLiveRegion="polite" style={s.packingProgressText}>{allPacked ? 'All packed!' : `${packed} of ${total} packed`}</Text><Ionicons name={packed === total ? 'checkmark-circle' : 'bag-handle-outline'} size={26} color={colors.teal}/></View>
      <View accessibilityRole="progressbar" accessibilityLabel="Packing progress" accessibilityValue={{ min: 0, max: total, now: packed, text: `${packed} of ${total} packed` }} aria-valuemin={0} aria-valuemax={total} aria-valuenow={packed} aria-valuetext={`${packed} of ${total} packed`} style={s.packingProgressTrack}><View style={[s.packingProgressFill, { width: `${progress}%` }]}/></View>
      {allPacked && <PrimaryButton title="View plan" icon="arrow-forward" onPress={onOpenPlan}/>}
    </View>
    <View style={s.stack}>{orderedGroups.map(([group, items]) => <View key={group} style={s.packGroup}>
      <Text style={s.packGroupTitle}>{group}</Text>
      {items.map((item) => <View key={item.id} style={s.packingRow}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={item.title} accessibilityState={{ checked: item.done }} aria-checked={item.done} onPress={() => togglePacking(selectedTrip.id, item.id)} style={({ pressed }) => [s.packingCheck, pressed && s.pressed]}>
          <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={item.done ? colors.teal : colors.muted}/>
          <View style={s.packingItemCopy}><Text style={[s.packingItemTitle, item.done && s.done]}>{item.title}</Text>{Boolean(item.person) && <Text style={s.packingPerson}>{item.person}</Text>}</View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`} onPress={() => onRemove(item.id)} style={({ pressed }) => [s.packingRemove, pressed && s.pressed]}><Ionicons name="close" size={20} color={colors.muted}/></Pressable>
      </View>)}
    </View>)}</View>
    {allPacked ? <Pressable accessibilityRole="button" accessibilityLabel="Add item" onPress={openItem} style={({ pressed }) => [s.handoffSecondary, pressed && s.pressed]}><Ionicons name="add" size={19} color={colors.blue}/><Text style={s.overviewLinkText}>Add item</Text></Pressable> : <PrimaryButton title="Add item" icon="add" onPress={openItem}/>}
    {!weatherError && (weatherLoading || weatherSuggestions.length > 0) && <Pressable accessibilityRole="button" accessibilityState={{ expanded: showWeatherSuggestions }} disabled={weatherLoading} onPress={() => setShowWeatherSuggestions((visible) => !visible)} style={({ pressed }) => [s.weatherSuggestButton, (pressed || weatherLoading) && s.pressed, weatherLoading && s.weatherSuggestDisabled]}>
      <View style={s.weatherSuggestIcon}><Ionicons name={weatherLoading ? 'sync-outline' : 'partly-sunny-outline'} size={20} color={colors.blue}/></View><Text style={[s.weatherSuggestTitle, { flex: 1 }]}>{weatherLoading ? 'Checking weather…' : 'Weather suggestions'}</Text><Ionicons name={showWeatherSuggestions ? 'chevron-up' : 'chevron-down'} size={20} color={colors.blue}/>
    </Pressable>}
    {showWeatherSuggestions && !weatherLoading && !weatherError && <View style={s.weatherSuggestionPanel}>{weatherSuggestions.length ? <><Text style={s.weatherSuggestionIntro}>Based on the next seven days</Text><View style={s.weatherChips}>{weatherSuggestions.map(([item, itemCategory]) => <View style={s.weatherChip} key={item}><Text style={s.weatherChipText}>{item}</Text><Text style={s.weatherChipCategory}>{itemCategory}</Text></View>)}</View><Pressable accessibilityRole="button" onPress={() => { addItems(weatherSuggestions); setShowWeatherSuggestions(false); }} style={s.weatherAddButton}><Ionicons name="add-circle-outline" size={18} color={colors.blue}/><Text style={s.weatherAddText}>Add {weatherSuggestions.length} suggestions</Text></Pressable></> : <Text style={s.weatherSuggestionIntro}>Those useful weather-based items are already on your list.</Text>}</View>}
    </>}
    <Sheet visible={open} title="Add item" onClose={() => setOpen(false)}>
      <AutocompleteField value={title} onChangeText={(value) => { setTitle(value); setCategory(''); }} placeholder="Item name" suggestions={packingSuggestions} hideLabel/>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={s.packingDetailsToggle}><Text style={s.packingLinkText}>Details</Text><Ionicons name={details ? 'chevron-up' : 'chevron-down'} color={colors.blue} size={20}/></Pressable>
      {details && <View style={s.packingDetails}>
        <View style={s.categoryPicker}><Text style={s.categoryPickerLabel}>Category</Text><View style={s.categoryOptions}>{packingCategories.map((item) => <Pressable key={item.name} accessibilityRole="button" accessibilityState={{ selected: resolvedCategory === item.name }} onPress={() => setCategory(item.name)} style={[s.categoryOption, resolvedCategory === item.name && s.categoryOptionSelected]}><Ionicons name={item.icon as any} size={18} color={resolvedCategory === item.name ? colors.blue : colors.muted}/><Text style={[s.categoryOptionText, resolvedCategory === item.name && s.categoryOptionTextSelected]}>{item.name}</Text></Pressable>)}</View></View>
        {isGroupTrip(selectedTrip.members) && <AutocompleteField value={person} onChangeText={setPerson} placeholder="Assigned to (optional)" suggestions={memberSuggestions} showSuggestionsOnFocus/>}
      </View>}
      <PrimaryButton title="Add item" icon="checkmark" onPress={save} disabled={!title.trim()}/>
    </Sheet>
  </View>;
}
const reactionChoices: { value: WishReaction; label: string; icon: string; color: string; tint: string }[] = [
  { value: 'like', label: 'Like', icon: 'thumbs-up-outline', color: '#25885C', tint: '#EAF7F0' },
  { value: 'meh', label: 'Meh', icon: 'remove-circle-outline', color: '#B17B18', tint: '#FFF6E3' },
  { value: 'dislike', label: 'Dislike', icon: 'thumbs-down-outline', color: '#D76570', tint: '#FFF0F1' },
];
type ReactionVote = { displayName: string; reaction: WishReaction };
function Wishes() {
  const { selectedTrip, profileName, addWish, removeWish, setWishReaction } = useTravel();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [voterId, setVoterId] = useState('');
  const [cloudVotes, setCloudVotes] = useState<Record<string, Record<string, ReactionVote>>>({});
  const [syncUnavailable, setSyncUnavailable] = useState(false);
  const tripId = selectedTrip?.sharedTripId || selectedTrip?.id || '';
  const wishIdsKey = selectedTrip?.wishes.map((wish) => wish.id).join(',') || '';

  useEffect(() => {
    if (!supabase || !wishIdsKey) return;
    let alive = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    const refresh = async () => {
      const ids = wishIdsKey.split(',').filter(Boolean);
      if (!ids.length) return;
      try {
        const user = await ensureGuestIdentity();
        if (!user) return;
        if (alive) setVoterId(user.id);
        const { data, error } = await supabase.from('travel_wishlist_reactions').select('wish_id,user_id,display_name,reaction').eq('trip_id', tripId).in('wish_id', ids);
        if (error) throw error;
        const votes: Record<string, Record<string, ReactionVote>> = {};
        for (const vote of data || []) {
          votes[vote.wish_id] ??= {};
          votes[vote.wish_id][vote.user_id] = { displayName: vote.display_name, reaction: vote.reaction };
        }
        if (alive) { setCloudVotes(votes); setSyncUnavailable(false); }
      } catch {
        if (alive) setSyncUnavailable(true);
      }
    };
    void refresh();
    interval = setInterval(() => { void refresh(); }, 12000);
    return () => { alive = false; if (interval) clearInterval(interval); };
  }, [tripId, wishIdsKey]);

  if (!selectedTrip) return null;

  const vote = async (wishId: string, reaction: WishReaction) => {
    let activeVoterId = voterId;
    if (supabase && !activeVoterId) {
      const user = await ensureGuestIdentity().catch(() => null);
      activeVoterId = user?.id || '';
      if (activeVoterId) setVoterId(activeVoterId);
    }
    const current = cloudVotes[wishId]?.[activeVoterId]?.reaction || selectedTrip.wishes.find((wish) => wish.id === wishId)?.reactions?.[activeVoterId || profileName]?.reaction;
    const next = current === reaction ? undefined : reaction;
    const key = activeVoterId || profileName || 'You';
    setWishReaction(selectedTrip.id, wishId, key, profileName || 'You', next);
    if (!supabase || !activeVoterId) return;
    try {
      const request = supabase.from('travel_wishlist_reactions');
      const result = next
        ? await request.upsert({ trip_id: tripId, wish_id: wishId, user_id: activeVoterId, display_name: profileName || 'Traveller', reaction: next, updated_at: new Date().toISOString() }, { onConflict: 'trip_id,wish_id,user_id' })
        : await request.delete().eq('trip_id', tripId).eq('wish_id', wishId).eq('user_id', activeVoterId);
      if (result.error) throw result.error;
      setCloudVotes((currentVotes) => {
        const votes = { ...currentVotes, [wishId]: { ...(currentVotes[wishId] || {}) } };
        if (next) votes[wishId][activeVoterId] = { displayName: profileName || 'Traveller', reaction: next };
        else delete votes[wishId][activeVoterId];
        return votes;
      });
      setSyncUnavailable(false);
    } catch {
      setSyncUnavailable(true);
      Alert.alert('Saved on this device', 'This reaction will sync when the connection is ready.');
    }
  };

  const save = () => { if (!name.trim()) return; addWish(selectedTrip.id, { name: name.trim(), category: category || 'Activity', location }); setOpen(false); setName(''); setCategory(''); setLocation(''); };
  return <Section title="Wishlist">
    <Text style={s.copy}>{isGroupTrip(selectedTrip.members) ? 'Add your reaction to see which ideas the travellers are leaning toward.' : 'Keep a small shortlist of places and experiences you would like to try.'}</Text>
    {syncUnavailable && !!supabase && isGroupTrip(selectedTrip.members) && <Text style={s.syncHint}>Shared reactions will sync when the connection is ready.</Text>}
    <View style={s.stack}>{selectedTrip.wishes.map((item, index) => {
      const votes: Record<string, ReactionVote> = { ...(item.reactions || {}), ...(cloudVotes[item.id] || {}) };
      const myVote = votes[voterId || profileName]?.reaction;
      const voters = Object.values(votes);
      return <Card key={item.id} enterDelay={index * 35} style={s.wishCard}>
        <View style={s.wishHeading}>
          <View style={{ flex: 1 }}><Text style={s.itemTitle}>{item.name}</Text><Text style={s.copy}>{item.category}{item.location ? ` · ${item.location}` : ''}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} onPress={() => removeWish(selectedTrip.id, item.id)}><Ionicons name="trash-outline" size={19} color={colors.muted}/></Pressable>
        </View>
        <View style={s.reactionRow}>{reactionChoices.map((choice) => {
          const count = voters.filter((voteItem) => voteItem.reaction === choice.value).length;
          const selected = myVote === choice.value;
          return <Pressable key={choice.value} accessibilityRole="button" accessibilityLabel={`${choice.label}, ${count} votes`} accessibilityState={{ selected }} onPress={() => vote(item.id, choice.value)} style={[s.reactionButton, selected && { backgroundColor: choice.tint, borderColor: choice.color }]}>
            <Ionicons name={choice.icon as any} size={16} color={selected ? choice.color : colors.muted}/><Text style={[s.reactionLabel, selected && { color: choice.color }]}>{choice.label}</Text><Text style={[s.reactionCount, selected && { color: choice.color }]}>{count}</Text>
          </Pressable>;
        })}</View>
        {voters.length ? <Text style={s.voterNames}>{voters.map((voter) => `${voter.displayName}: ${voter.reaction}`).join('  ·  ')}</Text> : <Text style={s.voterNames}>No reactions yet</Text>}
      </Card>;
    })}</View>
    {!selectedTrip.wishes.length ? <EmptyMoment compact title="Keep a small shortlist" copy="Save a place or an experience you would like to try." actionTitle="Add first wish" icon="add" onPress={() => setOpen(true)}/> : <PrimaryButton title="Add another wish" onPress={() => setOpen(true)}/>}<View />
    <Sheet visible={open} title="New wish" onClose={() => setOpen(false)}><AutocompleteField value={name} onChangeText={setName} placeholder="Name" suggestions={wishSuggestions}/><Field value={category} onChangeText={setCategory} placeholder="Category, for example activity"/><Field value={location} onChangeText={setLocation} placeholder="Location (optional)"/><PrimaryButton title="Save wish" icon="checkmark" onPress={save} disabled={!name.trim()}/></Sheet>
  </Section>;
}
function Memories() { const { selectedTrip, addPhoto } = useTravel(); if (!selectedTrip) return null; return <Section title="Memories"><View style={s.gallery}>{selectedTrip.memories.map((item) => <View key={item.id} style={s.memory}><Image source={{ uri: item.image }} style={s.image}/><Text style={s.copy}>{formatJournalDate(item.date)}</Text></View>)}</View>{!selectedTrip.memories.length ? <EmptyMoment compact mascot="memories" title="Save the good bits" copy="Choose a photo when there is a moment worth keeping." actionTitle="Choose first photo" icon="image-outline" onPress={() => addPhoto(selectedTrip.id)}/> : <PrimaryButton title="Choose another photo" icon="image-outline" onPress={() => addPhoto(selectedTrip.id)}/>}</Section>; }
const s = StyleSheet.create({
  tripTabs: { flexDirection: 'row', gap: 6, paddingTop: 20, paddingBottom: 16 },
  compactOverviewLink: { flex: 1, minWidth: 0, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripCompanions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 2 },
  companionSummary: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  companionAvatars: { flexDirection: 'row', gap: 5 },
  companionAvatar: { width: 30, height: 30, overflow: 'hidden', borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purpleSoft }, companionAvatarPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  companionInitial: { color: colors.purple, fontSize: 14, fontWeight: '700' },
  companionLabel: { flexShrink: 1, color: colors.muted, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  inviteShortcut: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 14, borderWidth: 1, borderColor: '#C8E3FF', backgroundColor: '#F7FBFF' },
  inviteShortcutText: { color: colors.blue, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  handoffCard: { gap: 16, padding: 20, marginBottom: 22, borderColor: '#D7E8FF', backgroundColor: colors.blueSoft },
  handoffHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  handoffTitle: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.heading, fontSize: 28, lineHeight: 36 },
  handoffSecondary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, marginTop: 4 },
  tripTab: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 3, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tripTabText: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  tripTabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tripTabTextActive: { color: '#FFFFFF' },
  tripSectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, marginBottom: 18 },
  tripSectionContent: { gap: 14 },
  moreChoices: { gap: 12 },
  moreChoice: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  moreIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  moreChoiceTitle: { flex: 1, minWidth: 0, fontFamily: fonts.heading, fontSize: 22, lineHeight: 29, color: colors.text },
  moreBack: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  overviewStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -6, marginBottom: 4 },
  overviewStatusText: { flex: 1, color: colors.muted, fontSize: 17, lineHeight: 24 },
  guidanceCard: { backgroundColor: colors.blueSoft, borderColor: '#D7E8FF', gap: 18, padding: 20 },
  guidanceIntro: { alignItems: 'center', gap: 10 },
  overviewActivity: { gap: 12, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  overviewActivityTitle: { fontFamily: fonts.heading, color: colors.text, fontSize: 25, lineHeight: 33 },
  overviewActivityMeta: { color: colors.muted, fontSize: 17, lineHeight: 25, flexShrink: 1 },
  overviewActivityLabel: { color: colors.blue, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  overviewLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, marginTop: 3 },
  overviewLinkText: { color: colors.blue, fontSize: 18, lineHeight: 25, fontWeight: '600', flexShrink: 1 },
  overviewDetailsBlock: { marginTop: 26 },
  overviewDetailsButton: { minHeight: 76, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface },
  overviewDetailsIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  overviewDetailsTitle: { flex: 1, minWidth: 0, fontFamily: fonts.heading, color: colors.text, fontSize: 22, lineHeight: 29 },
  overviewDetailsContent: { gap: 18, paddingTop: 16 },
  overviewSettings: { gap: 6, padding: 16 },
  overviewSettingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 56, paddingVertical: 10 },
  overviewSettingText: { flex: 1, minWidth: 0, color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  overviewMembers: { gap: 12, paddingVertical: 8, marginBottom: 8 },
  overviewMember: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guidanceIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  guidanceTitle: { alignSelf: 'stretch', fontFamily: fonts.heading, fontSize: 32, lineHeight: 40, color: colors.text, textAlign: 'center' },
  guidanceCopy: { color: colors.muted, fontSize: 18, lineHeight: 26, marginBottom: 4 },
  editDates: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  editDatesText: { color: colors.blue, fontSize: 18, fontWeight: '600' },
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingTop: 72, paddingBottom: 42 }, hero: { height: 224, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.mist, shadowColor: colors.navy, shadowOpacity: .12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 }, heroImage: { borderRadius: 32 }, heroShade: { flex: 1, justifyContent: 'flex-end', padding: 22, backgroundColor: 'rgba(38,49,84,.27)' }, date: { color: colors.sun, fontWeight: '900', fontSize: 14, letterSpacing: .2 }, heroCopy: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, marginTop: 6, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 17, lineHeight: 25, marginTop: 5 }, tabs: { gap: 8, paddingVertical: 24 }, tab: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 18, backgroundColor: '#F7F8FC' }, activeTab: { backgroundColor: colors.mist }, tabText: { color: colors.muted, fontWeight: '800', fontSize: 16 }, activeText: { color: colors.teal }, stack: { gap: 14, marginBottom: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 13 }, itemTitle: { color: colors.navy, fontSize: 20, fontWeight: '900', letterSpacing: -.35, lineHeight: 27}, packGroup: { gap: 8, marginBottom: 9 }, packGroupTitle: { color: colors.coral, fontSize: 16, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 4, marginTop: 5, lineHeight: 23}, pack: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 21, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 16, shadowColor: colors.navy, shadowOpacity: .035, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, done: { textDecorationLine: 'line-through', opacity: .5 }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginBottom: 16 }, memory: { width: '47%' }, image: { height: 146, borderRadius: 21, backgroundColor: colors.mist }, empty: { flexGrow: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 28 }, emptyText: { color: colors.navy, fontWeight: '800', fontSize: 16 }, weather: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.sand, borderColor: 'transparent', marginTop: 2, paddingVertical: 21 }, weatherTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' }, temperature: { alignItems: 'flex-end' }, temperatureValue: { color: colors.navy, fontSize: 34, fontWeight: '900', letterSpacing: -1.4 }, weatherRange: { color: colors.muted, fontSize: 16, fontWeight: '800', lineHeight: 23}, tripFacts: { gap: 14, paddingVertical: 21 }, factLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' }, factText: { color: colors.navy, fontSize: 16, fontWeight: '900', marginTop: 4 }, factDivider: { height: 1, backgroundColor: colors.border }, countdown: { alignSelf: 'flex-start', backgroundColor: colors.lime, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }, countdownText: { color: colors.ink, fontSize: 13, fontWeight: '900' }, note: { color: colors.navy, fontSize: 13, lineHeight: 20, marginTop: 12 }, summaryRow: { flexDirection: 'row', gap: 13 }, summaryCard: { flex: 1, gap: 4, padding: 17 }, summaryNumber: { color: colors.navy, fontSize: 28, fontWeight: '900', marginTop: 5 }, members: { flexDirection: 'row', flexWrap: 'wrap', gap: 17, paddingVertical: 17 }, member: { alignItems: 'center', gap: 6, minWidth: 50 }, memberName: { color: colors.navy, fontSize: 12, fontWeight: '800' } });

// The trip's sections share the same quiet white / blue / lilac language as Home.
Object.assign(s, StyleSheet.create({
  content: { padding: 16, paddingTop: 72, paddingBottom: 42 },
  tripHero: { minHeight: 150, borderRadius: 24, padding: 20, backgroundColor: '#EAF4FF', borderWidth: 1, borderColor: '#C8E3FF', shadowColor: colors.blue, shadowOpacity: .1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  tripHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, tripHeroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, tripHeroTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700' }, tripHeroDestination: { color: colors.muted, fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C8E3FF' }, activeBadge: { backgroundColor: '#EAF7F0', borderColor: '#CDEDDD' }, statusBadgeText: { color: colors.blue, fontSize: 11, fontWeight: '700' }, activeBadgeText: { color: '#25885C' }, heroCountdown: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 36, fontWeight: '700', marginTop: 23, letterSpacing: -.45 }, heroDates: { color: colors.muted, fontSize: 17, marginTop: 4 }, packProgressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }, packProgressText: { color: colors.text, fontSize: 12, fontWeight: '600' }, packProgressTrack: { height: 7, borderRadius: 5, backgroundColor: '#D7E8FF', overflow: 'hidden', marginTop: 8 }, packProgressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.blue },
  heroCard: { borderRadius: 24, padding: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOpacity: .04, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  hero: { height: 220, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.blueSoft },
  heroImage: { borderRadius: 17 },
  heroDetails: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  date: { color: colors.text, fontWeight: '700', fontSize: 18, lineHeight: 26},
  heroCopy: { color: colors.muted, fontSize: 18, lineHeight: 26, marginTop: 5, fontWeight: '400' },
  compactTripHeader: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 7, paddingRight: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, shadowColor: colors.text, shadowOpacity: .035, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  compactTripImage: { width: 48, height: 72, borderRadius: 13, backgroundColor: colors.blueSoft },
  compactTripContent: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', minWidth: 0 },
  compactTripEyebrow: { color: colors.muted, fontSize: 16, fontWeight: '500', marginBottom: 3, lineHeight: 20},
  compactTripTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', marginBottom: 0, lineHeight: 26},
  compactTripMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 17 },
  compactTripMetaText: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20},
  compactTripAction: { width: 34, height: 34, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  tabs: { gap: 8, paddingVertical: 20 },
  compactTabs: { paddingBottom: 2 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeTab: { backgroundColor: colors.blueSoft, borderColor: '#C8E3FF' },
  tabText: { color: colors.muted, fontWeight: '500', fontSize: 13 },
  activeText: { color: colors.blue, fontWeight: '600' },
  itemTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', letterSpacing: -.15, lineHeight: 27},
  packGroupTitle: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: .2, paddingHorizontal: 4, marginTop: 5, lineHeight: 24},
  pack: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 13, shadowOpacity: 0, elevation: 0 },
  weatherCard: { backgroundColor: '#FBFDFF', borderColor: '#D9EAFF', marginTop: 2, padding: 17 }, weatherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, weatherCurrent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, weatherIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, forecastStrip: { gap: 7, paddingTop: 17, paddingRight: 4 }, forecastDay: { width: 76, minHeight: 110, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8 }, forecastLabel: { color: colors.muted, fontSize: 16, fontWeight: '600', lineHeight: 23}, forecastTemp: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 25}, forecastLow: { color: colors.muted, fontSize: 16, lineHeight: 23}, weatherNote: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 13 }, weatherTip: { color: colors.navy, fontSize: 17, lineHeight: 24, fontWeight: '800', marginTop: 11 },
  weatherTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700' },
  temperatureValue: { color: colors.blue, fontSize: 32, fontWeight: '700', letterSpacing: -1.4 },
  infoRow: { gap: 10, paddingRight: 8 }, infoCard: { width: 252, minHeight: 136, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14 }, infoIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 11 }, currencyIcon: { backgroundColor: colors.purpleSoft }, plugIcon: { backgroundColor: '#FFF1E8' }, infoLabel: { color: colors.muted, fontSize: 16, fontWeight: '700', letterSpacing: 0, lineHeight: 23}, infoValue: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, lineHeight: 27, fontWeight: '700', marginTop: 5 }, infoCopy: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 4 },
  plugCard: { width: 264, paddingTop: 12 }, plugPreview: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, minHeight: 52, marginBottom: 8 }, plugPreviewIcon: { alignItems: 'center', width: 43 }, plugTypeMini: { color: colors.muted, fontSize: 14, fontWeight: '700', marginTop: -2, lineHeight: 20}, morePlugTypes: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1E8', marginTop: 3 }, morePlugTypesText: { color: colors.coral, fontSize: 11, fontWeight: '800' }, plugStatus: { marginTop: 8, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }, worksStatus: { backgroundColor: '#EAF7F0' }, adapterStatus: { backgroundColor: '#FFF1E8' }, plugStatusText: { fontSize: 16, fontWeight: '700', flexShrink: 1, lineHeight: 23}, worksStatusText: { color: '#25885C' }, adapterStatusText: { color: '#B86521' },
  plugSheetIntro: { color: colors.muted, fontSize: 18, marginBottom: 14, lineHeight: 26}, plugDetailList: { gap: 9 }, plugDetailRow: { minHeight: 68, borderRadius: 16, backgroundColor: '#F9F6F0', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, plugDetailIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, plugDetailTitle: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 27}, plugDetailCopy: { color: colors.muted, fontSize: 17, marginTop: 3, lineHeight: 24}, plugSheetTip: { flexDirection: 'row', gap: 10, borderRadius: 16, padding: 13, marginTop: 16 }, plugSheetTipTitle: { fontSize: 18, fontWeight: '800', lineHeight: 25}, plugSheetTipCopy: { color: colors.text, fontSize: 17, lineHeight: 24, marginTop: 3 }, groundingNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 14, backgroundColor: '#FFF7E9', padding: 12, marginTop: 10 }, groundingNoteText: { color: '#8C4D19', flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '600' }, voltageWarning: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: '#FFF1E8', padding: 12, marginTop: 10 }, voltageWarningText: { color: '#8C4D19', flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '600' }, plugSource: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 15, marginBottom: 6 },
  inviteBlock: { marginTop: 28 },
  factText: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  countdown: { alignSelf: 'flex-start', backgroundColor: colors.purpleSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  countdownText: { color: colors.purple, fontSize: 13, fontWeight: '600' },
  summaryNumber: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 5 },
  memberName: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 24},
  addFriendLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 7, marginBottom: 8, paddingHorizontal: 5 },
  addFriendText: { color: colors.blue, fontSize: 18, fontWeight: '600', flex: 1, lineHeight: 25},
  friendOption: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 12, marginTop: 9 },
  activityIdea: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 13 },
  activityIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  activityIconWarm: { backgroundColor: colors.sand },
  activityIconPurple: { backgroundColor: colors.purpleSoft },
  tripDateRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripDateIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextActivityCard: { gap: 15, padding: 17, borderColor: '#DCEBFF', backgroundColor: '#FBFDFF' },
  nextActivityTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextActivityIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  nextActivityLabel: { color: colors.blue, fontSize: 10, fontWeight: '700', letterSpacing: .9, marginBottom: 4 },
  nextActivityDetails: { gap: 8, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  nextActivityDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextActivityMeta: { flex: 1, color: colors.muted, fontSize: 17, lineHeight: 24},
  nextActivityNote: { color: colors.text, fontSize: 17, lineHeight: 24, backgroundColor: colors.surface, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  reminderCard: { gap: 14, backgroundColor: '#FCFAFF', borderColor: '#E3D9FA', padding: 16 },
  reminderHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  reminderList: { gap: 8, borderTopWidth: 1, borderTopColor: '#EBE4F7', paddingTop: 12 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderText: { flex: 1, color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  reminderEmpty: { color: colors.muted, fontSize: 17, lineHeight: 24, borderTopWidth: 1, borderTopColor: '#EBE4F7', paddingTop: 12 },
  reminderButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: '#CFE4FF', backgroundColor: colors.surface },
  reminderButtonText: { color: colors.blue, fontSize: 18, fontWeight: '700', lineHeight: 25},
  activityEmptyCard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, backgroundColor: '#FBFCFE' },
  activityEmptyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  activityCompleteIcon: { backgroundColor: '#ECF8F1' },
  activityEmptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700', lineHeight: 29},
  activityEmptyCopy: { color: colors.muted, fontSize: 18, lineHeight: 26, marginTop: 4 },
  activityEmptyAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  planTimeline: { gap: 25 },
  planDay: { gap: 12 },
  planDayHeader: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 3 },
  planDayMarker: { width: 18, height: 43, alignItems: 'center', justifyContent: 'center' },
  planDayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue, borderWidth: 3, borderColor: '#DCEBFF' },
  planDayHeading: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0, lineHeight: 24},
  planDayDate: { color: colors.muted, fontSize: 16, marginTop: 3, lineHeight: 23},
  planDayCount: { minWidth: 29, height: 29, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  planDayCountText: { color: colors.blue, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  planDayAdd: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginLeft: 32, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.blueSoft },
  planDayAddText: { color: colors.blue, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  activityDateContext: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, marginBottom: 18, borderRadius: 15, backgroundColor: colors.blueSoft },
  activityDateText: { flex: 1, minWidth: 0, color: colors.text, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  activityDateChange: { color: colors.blue, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  discardDraft: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, marginTop: 4, marginBottom: 4, justifyContent: 'center' },
  discardDraftText: { color: colors.muted, fontSize: 17, lineHeight: 24, fontWeight: '500' },
  planDayActivities: { gap: 9, marginLeft: 9, paddingLeft: 19, borderLeftWidth: 1, borderLeftColor: '#DCEBFF' },
  planCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  planActivityCard: { minHeight: 91, gap: 12, padding: 14, borderRadius: 19, shadowOpacity: .02 },
  planTimeBlock: { flexDirection: 'row', gap: 8, paddingHorizontal: 10, minHeight: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  planStartTime: { color: colors.blue, fontSize: 17, fontWeight: '700', lineHeight: 24},
  planEndTime: { color: colors.muted, fontSize: 17, lineHeight: 24 },
  planActivityContent: { flex: 1, minHeight: 57, justifyContent: 'center', paddingVertical: 2 },
  planMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  planMetaText: { flex: 1, color: colors.muted, fontSize: 16, lineHeight: 23},
  planNote: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 6 },
  planRemove: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -2, marginRight: -3 },
  planEmptyCard: { backgroundColor: '#FBFDFF', borderColor: '#DCEBFF' },
  planAddButton: { marginTop: 4 },
  packingStart: { gap: 12 },
  templateGrid: { gap: 12 },
  templateCard: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 14 },
  templateIcon: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  templateTitle: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.heading, fontSize: 23, lineHeight: 30, fontWeight: '700' },
  packingStartEmpty: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 8 },
  packingLinkText: { color: colors.blue, fontSize: 18, lineHeight: 25, fontWeight: '600', flexShrink: 1 },
  packingProgress: { gap: 16, borderRadius: 22, backgroundColor: colors.blueSoft, padding: 20, marginBottom: 24 },
  packingMascot: { alignItems: 'center', gap: 4 },
  packingSpeechBubble: { alignSelf: 'stretch', marginHorizontal: 8, backgroundColor: colors.paper, borderColor: colors.ink, borderWidth: 3, borderTopLeftRadius: 28, borderTopRightRadius: 25, borderBottomLeftRadius: 23, borderBottomRightRadius: 28, paddingHorizontal: 14, paddingVertical: 8, shadowColor: colors.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: .12, shadowRadius: 2, elevation: 2 },
  packingSpeechTail: { position: 'absolute', top: -12, left: '50%', marginLeft: -10, width: 20, height: 20, backgroundColor: colors.paper, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.ink, transform: [{ rotate: '45deg' }] },
  packingQuestion: { color: colors.text, fontFamily: 'Nunito_800ExtraBold_Italic', fontSize: 32, lineHeight: 40, textAlign: 'center' },
  packingComplete: { backgroundColor: '#E9F4EC' },
  packingProgressHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packingProgressText: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  packingProgressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  packingProgressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.teal },
  packingRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingRight: 4 },
  packingCheck: { flex: 1, minWidth: 0, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  packingItemCopy: { flex: 1, minWidth: 0, gap: 4 },
  packingItemTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, lineHeight: 26, fontWeight: '700' },
  packingPerson: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  packingRemove: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  packingDetailsToggle: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 2 },
  packingDetails: { gap: 20, paddingBottom: 8 },
  weatherSuggestButton: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, borderWidth: 1, borderColor: '#CBE4FF', backgroundColor: '#F7FBFF', padding: 12, marginTop: 16 },
  weatherSuggestDisabled: { opacity: .63 },
  weatherSuggestIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  weatherSuggestTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  weatherSuggestCopy: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 3 },
  weatherSuggestionPanel: { gap: 12, backgroundColor: '#F7FBFF', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 1, borderTopWidth: 0, borderColor: '#CBE4FF', marginTop: -3, padding: 13, paddingTop: 15 },
  weatherSuggestionIntro: { color: colors.muted, fontSize: 16, lineHeight: 23},
  weatherChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  weatherChip: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#DCEBFF', paddingHorizontal: 9, paddingVertical: 7 },
  weatherChipText: { color: colors.text, fontSize: 17, fontWeight: '600', lineHeight: 24},
  weatherChipCategory: { color: colors.muted, fontSize: 9, marginTop: 2 },
  weatherAddButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CBE4FF' },
  weatherAddText: { color: colors.blue, fontSize: 18, fontWeight: '700', lineHeight: 25},
  categoryPicker: { gap: 9, marginTop: 2 },
  categoryPickerLabel: { color: colors.text, fontFamily: fonts.heading, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { minHeight: 46, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryOptionSelected: { borderColor: '#BFDFFF', backgroundColor: colors.blueSoft },
  categoryOptionText: { color: colors.muted, fontSize: 16, lineHeight: 22, flexShrink: 1, fontWeight: '600' },
  categoryOptionTextSelected: { color: colors.blue },
  wishCard: { gap: 12 },
  wishHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reactionButton: { flexGrow: 1, flexBasis: '45%', minWidth: 110, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  reactionLabel: { flexShrink: 1, color: colors.muted, fontSize: 16, fontWeight: '600', lineHeight: 23},
  reactionCount: { color: colors.muted, fontSize: 16, fontWeight: '700', lineHeight: 23},
  voterNames: { color: colors.muted, fontSize: 16, lineHeight: 23},
  syncHint: { color: '#9B711F', backgroundColor: '#FFF6E3', fontSize: 16, lineHeight: 23, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, marginTop: 6, marginBottom: 12 },
}));
