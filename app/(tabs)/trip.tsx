// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field, Sheet } from '@/src/forms';
import { Avatar, Card, CapybaraMoment, DestinationCover, EmptyMoment, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { TripDatesSheet } from '@/src/trip-dates-sheet';
import { TripDetailsSheet } from '@/src/trip-details-sheet';
import { useTravel, WishReaction } from '@/src/store';
import { fetchWeather, Weather } from '@/src/weather';
import { activitySuggestionsForDestination, packingCategorySuggestions, packingSuggestions, suggestedPackingCategory, wishSuggestions } from '@/src/suggestions';
import { inviteUrl } from '@/src/invites';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { remindersForTrip, scheduleTripReminders, sendTripNotification } from '@/src/notifications';
import { formatDate, formatJournalDate, formatTripDates, isGroupTrip } from '@/src/dates';
import { countryInfoFor, timeDifferenceFromHome } from '@/src/travel-info';
const tabs = ['Overview', 'Plan', 'Activities', 'Packing', 'Wishlist', 'Memories'];
export default function TripScreen() {
  const router = useRouter();
  const { selectedTrip } = useTravel();
  const { tab: requestedTab, welcome } = useLocalSearchParams<{ tab?: string; welcome?: string }>();
  const [tab, setTab] = useState('Overview');
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [startActivity, setStartActivity] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const selectedId = selectedTrip?.id;
  useFocusEffect(useCallback(() => {
    setTab(requestedTab && tabs.includes(requestedTab) ? requestedTab : 'Overview');
    setStartActivity(false); setDatesOpen(false); setDetailsOpen(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [selectedId, requestedTab]));
  if (!selectedTrip) return <Empty/>;
  const invite = () => {
    const base = process.env.EXPO_PUBLIC_APP_URL || 'https://travino-git-main-gibbyn05s-projects.vercel.app';
    const link = inviteUrl(selectedTrip, base);
    return Share.share({ message: `Join ${selectedTrip.title} in Travino:\n${link}` });
  };
  const isOverview = tab === 'Overview';
  return <ScrollView ref={scroll} style={s.page} contentContainerStyle={s.content}>
    {isOverview ? <PageTitle eyebrow={`${selectedTrip.city}, ${selectedTrip.country}`}>{selectedTrip.title}</PageTitle>
      : <Pressable accessibilityRole="button" accessibilityLabel="Open trip overview" onPress={() => setTab('Overview')} style={({ pressed }) => [s.compactTripHeader, pressed && s.pressed]}>
        <DestinationCover country={selectedTrip.country} uri={selectedTrip.coverImage} style={s.compactTripImage} imageStyle={s.compactTripImage}/>
        <View style={s.compactTripContent}>
          <Text style={s.compactTripEyebrow} numberOfLines={1}>{selectedTrip.city}, {selectedTrip.country}</Text>
          <Text style={s.compactTripTitle} numberOfLines={1}>{selectedTrip.title}</Text>
          <View style={s.compactTripMeta}><Ionicons name="calendar-clear-outline" size={13} color={colors.muted}/><Text style={s.compactTripMetaText} numberOfLines={1}>{formatTripDates(selectedTrip.startDate, selectedTrip.endDate)}</Text></View>
          <View style={s.compactTripMeta}><Ionicons name="people-outline" size={13} color={colors.muted}/><Text style={s.compactTripMetaText}>{selectedTrip.members.length ? `${selectedTrip.members.length} ${selectedTrip.members.length === 1 ? 'traveller' : 'travellers'}` : 'Solo trip'}</Text></View>
        </View>
        <View style={s.compactTripAction}><Ionicons name="grid-outline" size={17} color={colors.blue}/></View>
      </Pressable>}
    {isOverview && selectedTrip.activities.length === 0 && <Card style={s.guidanceCard}>
      <View style={s.guidanceIcon}><Ionicons name={welcome === selectedTrip.id ? 'checkmark' : 'sparkles-outline'} size={25} color={colors.blue}/></View>
      <Text accessibilityRole="header" style={s.guidanceTitle}>{welcome === selectedTrip.id ? 'Your trip is ready!' : 'Make it your kind of trip'}</Text>
      <Text style={s.guidanceCopy}>Start with one thing you’d love to do in {selectedTrip.city}. You can choose a date later.</Text>
      <PrimaryButton title="Add your first activity" icon="add" onPress={() => { setStartActivity(true); setTab('Plan'); }}/>
    </Card>}
    {isOverview && <TripHero/>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.tabs, !isOverview && s.compactTabs]}>{tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={[s.tab, tab === item && s.activeTab]}><Text style={[s.tabText, tab === item && s.activeText]}>{item}</Text></Pressable>)}</ScrollView>
    {tab === 'Overview' && <Overview onOpenPlan={() => { setStartActivity(false); setTab('Plan'); }} onEditDates={() => setDatesOpen(true)} onEditDetails={() => setDetailsOpen(true)} onInvite={invite} onOpenAddFriend={() => setAddFriendOpen(true)}/>}{tab === 'Plan' && <Plan key={selectedTrip.id} initiallyOpen={startActivity} onOpened={() => setStartActivity(false)}/>}{tab === 'Activities' && <ThingsToDo onOpen={(activity) => router.push({ pathname: '/activity-browser', params: { activity, city: selectedTrip.city, country: selectedTrip.country } })} />}{tab === 'Packing' && <Packing/>}{tab === 'Wishlist' && <Wishes/>}{tab === 'Memories' && <Memories/>}
    {detailsOpen && <TripDetailsSheet key={selectedTrip.id} trip={selectedTrip} onClose={() => setDetailsOpen(false)}/>}
    {datesOpen && <TripDatesSheet key={selectedTrip.id} trip={selectedTrip} onClose={() => setDatesOpen(false)}/>}
    <AddTripFriendSheet visible={addFriendOpen} onClose={() => setAddFriendOpen(false)} tripId={selectedTrip.id} tripTitle={selectedTrip.title} existingNames={selectedTrip.members}/>
  </ScrollView>;
}

type TripFriend = { profile_id: string; display_name: string; status: string };
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
function Empty() { const router = useRouter(); return <View style={s.empty}><EmptyMoment title="Your next trip starts here" copy="Pick a place and Travino will keep the plans, lists and memories close." actionTitle="Plan a trip" icon="add" onPress={() => router.push('/new-trip' as never)}/></View>; }
function useWeather(city: string, country: string) { const [weather, setWeather] = useState<Weather | null>(null); const [error, setError] = useState(false); const [loading, setLoading] = useState(true); useEffect(() => { const controller = new AbortController(); setLoading(true); setError(false); fetchWeather(city, country, controller.signal).then((value) => { setWeather(value); setLoading(false); }).catch((reason) => { if (reason.name !== 'AbortError') { setError(true); setLoading(false); } }); return () => controller.abort(); }, [city, country]); return { weather, error, loading }; }
function useCurrencyRate(currency?: string) { const [rate, setRate] = useState<number | null>(null); useEffect(() => { if (!currency || currency === 'NOK') { setRate(currency === 'NOK' ? 1 : null); return; } let active = true; fetch('https://open.er-api.com/v6/latest/NOK').then((response) => response.ok ? response.json() : null).then((payload) => { const value = Number(payload?.rates?.[currency]); if (active) setRate(Number.isFinite(value) ? value : null); }).catch(() => { if (active) setRate(null); }); return () => { active = false; }; }, [currency]); return rate; }
function readableCountdown(value: string) { const parts = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); const start = parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])) : new Date(value); if (Number.isNaN(start.getTime())) return null; const today = new Date(); today.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0); const days = Math.round((start.getTime() - today.getTime()) / 86400000); return days < 0 ? 'Trip completed' : days === 0 ? 'Leaving today' : `${days} ${days === 1 ? 'day' : 'days'} to go`; }
function dayName(value: string, index: number) { if (index === 0) return 'Today'; const date = new Date(`${value}T12:00:00`); return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date); }
function WeatherCard({ city, weather, error, loading }: { city: string; weather: Weather | null; error: boolean; loading: boolean }) { return <Card style={s.weatherCard}><View style={s.weatherHeader}><View style={s.weatherCurrent}><View style={s.weatherIcon}><Ionicons name={weather?.icon ?? 'partly-sunny-outline'} size={25} color={colors.blue}/></View><View><Text style={s.weatherTitle}>Weather in {city}</Text><Text style={s.copy}>{loading ? 'Getting the week ahead …' : error ? 'The forecast will be back soon.' : `${weather?.condition} · Feels like ${weather?.apparentTemperature}°`}</Text></View></View>{weather ? <Text style={s.temperatureValue}>{weather.temperature}°</Text> : null}</View>{weather?.forecast?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.forecastStrip}>{weather.forecast.map((day, index) => <View key={day.date} style={s.forecastDay}><Text style={s.forecastLabel}>{dayName(day.date, index)}</Text><Ionicons name={day.icon} size={18} color={index === 0 ? colors.blue : colors.muted}/><Text style={s.forecastTemp}>{day.high}°</Text><Text style={s.forecastLow}>{day.low}°</Text></View>)}</ScrollView> : null}</Card>; }
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

function Overview({ onOpenPlan, onEditDates, onEditDetails, onInvite, onOpenAddFriend }: { onOpenPlan: () => void; onEditDates: () => void; onEditDetails: () => void; onInvite: () => void; onOpenAddFriend: () => void }) {
  const { selectedTrip, updateTrip } = useTravel();
  const [remindersEnabled, setRemindersEnabled] = useState(Boolean(selectedTrip?.reminderNotificationIds?.length));
  if (!selectedTrip) return null;
  const weatherState = useWeather(selectedTrip.city, selectedTrip.country);
  const now = new Date();
  const nextEntry = selectedTrip.activities
    .map((activity) => ({ activity, status: activityStatus(activity, now) }))
    .filter((entry) => entry.status !== null)
    .sort((a, b) => a.status!.start.getTime() - b.status!.start.getTime())[0];
  const next = nextEntry?.activity;
  const happeningNow = nextEntry?.status?.happeningNow;
  const hasActivities = selectedTrip.activities.length > 0;
  const hasUnscheduled = selectedTrip.activities.some(activity => !activityMoment(activity.date, activity.startTime));
  const remainingPacking = selectedTrip.packing.filter((item) => !item.done).length;
  const gentleReminders = remindersForTrip(selectedTrip).slice(0, 2);
  const enableReminders = async () => {
    try {
      const result = await scheduleTripReminders(selectedTrip);
      if (result.status === 'denied') {
        Alert.alert('Reminders are off', 'You can turn them on later in iPhone Settings when it feels useful.');
        return;
      }
      updateTrip(selectedTrip.id, { reminderNotificationIds: result.ids });
      setRemindersEnabled(true);
      Alert.alert('Gentle reminders are ready', result.reminders.length ? `We will keep the useful moments close for ${selectedTrip.title}.` : 'There are no future moments to remind you about for this trip.');
    } catch {
      Alert.alert('Reminders could not be set', 'Try again in a moment. Your trip plans are still safe here.');
    }
  };
  return <>
    <WeatherCard city={selectedTrip.city} {...weatherState}/>
    <Card style={{ marginTop: 16 }}><Text style={s.copy}>{formatTripDates(selectedTrip.startDate, selectedTrip.endDate)}</Text><Pressable accessibilityRole="button" onPress={onEditDates} style={s.editDates}><Ionicons name="calendar-outline" size={17} color={colors.blue}/><Text style={s.editDatesText}>{selectedTrip.startDate ? 'Change dates' : 'Add travel dates'}</Text><Ionicons name="arrow-forward" size={17} color={colors.blue}/></Pressable><Pressable accessibilityRole="button" onPress={onEditDetails} style={s.editDates}><Ionicons name="create-outline" size={17} color={colors.blue}/><Text style={s.editDatesText}>Edit trip name & style</Text></Pressable></Card>
    <TravelInfo country={selectedTrip.country} destinationTimeZone={weatherState.weather?.timezone}/>
    <View style={s.inviteBlock}><PrimaryButton title={isGroupTrip(selectedTrip.members) ? 'Invite travellers' : 'Invite someone'} icon="person-add-outline" onPress={onInvite}/>{!isGroupTrip(selectedTrip.members) ? <Pressable accessibilityRole="button" onPress={onOpenAddFriend} style={s.addFriendLink}><Ionicons name="people-outline" size={18} color={colors.blue}/><Text style={s.addFriendText}>Bring a friend along</Text><Ionicons name="chevron-forward" size={17} color={colors.muted}/></Pressable> : null}</View>
    <Section title="Next activity">
      {next ? <Card style={s.nextActivityCard}>
        <View style={s.nextActivityTop}>
          <View style={s.nextActivityIcon}><Ionicons name={happeningNow ? 'play' : 'calendar-clear-outline'} size={20} color={colors.blue}/></View>
          <View style={{ flex: 1 }}>
            <Text style={s.nextActivityLabel}>{happeningNow ? 'HAPPENING NOW' : 'UP NEXT'}</Text>
            <Text style={s.itemTitle}>{next.title}</Text>
          </View>
        </View>
        <View style={s.nextActivityDetails}>
          <View style={s.nextActivityDetail}><Ionicons name="time-outline" size={16} color={colors.muted}/><Text style={s.nextActivityMeta}>{formatDate(next.date)} · {next.startTime}{next.endTime ? `–${next.endTime}` : ''}</Text></View>
          {next.location && <View style={s.nextActivityDetail}><Ionicons name="location-outline" size={16} color={colors.muted}/><Text style={s.nextActivityMeta}>{next.location}</Text></View>}
        </View>
        {next.note && <Text style={s.nextActivityNote}>{next.note}</Text>}
      </Card> : <Card style={s.activityEmptyCard}>
        <CapybaraMoment size={48}/>
        <View style={{ flex: 1 }}><Text style={s.activityEmptyTitle}>{hasUnscheduled ? 'Your ideas are waiting' : hasActivities ? 'All caught up' : 'Your days are wide open'}</Text><Text style={s.activityEmptyCopy}>{hasUnscheduled ? 'Choose a date and time whenever you’re ready to put your ideas on the calendar.' : hasActivities ? 'Everything on the plan is finished. Time to enjoy the moment.' : 'Add an activity when you’re ready to shape the trip.'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={hasActivities ? 'View trip plan' : 'Add an activity'} onPress={onOpenPlan} hitSlop={8} style={({ pressed }) => [s.activityEmptyAction, pressed && s.pressed]}><Ionicons name="arrow-forward" size={18} color={colors.blue}/></Pressable>
      </Card>}
    </Section>
    <Section title="Gentle reminders">
      <Card style={s.reminderCard}>
        <View style={s.reminderHeading}><View style={s.reminderIcon}><Ionicons name="notifications-outline" size={20} color={colors.purple}/></View><View style={{ flex: 1 }}><Text style={s.itemTitle}>{remindersEnabled ? 'Your trip reminders are on' : 'Keep the right moments close'}</Text><Text style={s.copy}>{remindersEnabled ? 'A few calm nudges are set around your departure, plans and journey home.' : 'Turn them on when you want Travino to quietly help you remember.'}</Text></View></View>
        {gentleReminders.length ? <View style={s.reminderList}>{gentleReminders.map((reminder) => <View style={s.reminderRow} key={`${reminder.title}-${reminder.when.toISOString()}`}><Ionicons name="time-outline" size={15} color={colors.muted}/><Text style={s.reminderText}>{reminder.title}</Text></View>)}</View> : <Text style={s.reminderEmpty}>Add dates or future activities to see useful reminders here.</Text>}
        {!remindersEnabled && <Pressable accessibilityRole="button" onPress={enableReminders} style={({ pressed }) => [s.reminderButton, pressed && s.pressed]}><Ionicons name="notifications-outline" size={17} color={colors.blue}/><Text style={s.reminderButtonText}>Turn on trip reminders</Text></Pressable>}
      </Card>
    </Section>
    <Section title="Still to do"><View style={s.summaryRow}><Card style={s.summaryCard}><Ionicons name="bag-handle-outline" size={22} color={colors.teal}/><Text style={s.summaryNumber}>{remainingPacking}</Text><Text style={s.copy}>to pack</Text></Card><Card style={s.summaryCard}><Ionicons name="heart-outline" size={22} color={colors.coral}/><Text style={s.summaryNumber}>{selectedTrip.wishes.length}</Text><Text style={s.copy}>on your wishlist</Text></Card></View></Section>
    {isGroupTrip(selectedTrip.members) ? <Section title="Travellers"><Card style={s.members}>{selectedTrip.members.map((member) => <View key={member} style={s.member}><Avatar name={member}/><Text style={s.memberName}>{member}</Text></View>)}</Card></Section> : null}
  </>;
}
function TravelInfo({ country, destinationTimeZone }: { country: string; destinationTimeZone?: string }) {
  const info = countryInfoFor(country);
  const rate = useCurrencyRate(info?.currency);
  const timeDifference = timeDifferenceFromHome(destinationTimeZone);
  const exchange = rate && info ? `100 kr ≈ ${new Intl.NumberFormat('en', { maximumFractionDigits: info.currency === 'JPY' ? 0 : 1 }).format(rate * 100)} ${info.currency}` : info ? `${info.currency} · ${info.currencyName}` : 'Currency details soon';
  return <Section title="Good to know"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.infoRow}>
    <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={s.infoCard}><View style={s.infoIcon}><Ionicons name="time-outline" size={18} color={colors.blue}/></View><Text style={s.infoLabel}>TIME</Text><Text style={s.infoValue}>{timeDifference || 'Set home location'}</Text><Text style={s.infoCopy}>{timeDifference ? 'Home and destination' : 'Add it in Profile'}</Text></Pressable>
    <View style={s.infoCard}><View style={[s.infoIcon, s.currencyIcon]}><Ionicons name="cash-outline" size={18} color={colors.purple}/></View><Text style={s.infoLabel}>CURRENCY</Text><Text style={s.infoValue} numberOfLines={1}>{exchange}</Text><Text style={s.infoCopy}>{info ? info.currencyName : 'No currency details yet'}</Text></View>
    <View style={s.infoCard}><View style={[s.infoIcon, s.plugIcon]}><Ionicons name="flash-outline" size={18} color={colors.coral}/></View><Text style={s.infoLabel}>PLUGS</Text><Text style={s.infoValue}>{info?.plugs || 'Check before you go'}</Text><Text style={s.infoCopy}>{info?.voltage || 'Voltage details soon'}</Text></View>
  </ScrollView></Section>;
}
function tripState(trip: { startDate: string; endDate: string }) { const start = new Date(trip.startDate); const end = new Date(trip.endDate); const today = new Date(); today.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { label: 'Upcoming', countdown: 'Dates to be confirmed' }; const days = Math.round((start.getTime() - today.getTime()) / 86400000); if (days > 0) return { label: 'Upcoming', countdown: days === 1 ? '1 day to go' : `Starts in ${days} days` }; if (end >= today) { const number = Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1); const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1); return { label: 'Active', countdown: `Day ${number} of ${total}` }; } return { label: 'Completed', countdown: 'A trip to remember' }; }
function TripHero() { const { selectedTrip } = useTravel(); if (!selectedTrip) return null; const state = tripState(selectedTrip); const packed = selectedTrip.packing.filter((item) => item.done).length; const total = selectedTrip.packing.length; const progress = total ? Math.round(packed / total * 100) : 0; return <View style={s.tripHero}><View style={s.tripHeroTop}><View style={s.tripHeroIcon}><Ionicons name="airplane" size={22} color="#FFFFFF"/></View><View style={{ flex: 1 }}><Text style={s.tripHeroTitle}>{selectedTrip.title}</Text><Text style={s.tripHeroDestination}>{selectedTrip.city}, {selectedTrip.country}</Text></View><View style={[s.statusBadge, state.label === 'Active' && s.activeBadge]}><Text style={[s.statusBadgeText, state.label === 'Active' && s.activeBadgeText]}>{state.label}</Text></View></View><Text style={s.heroCountdown}>{state.countdown}</Text><Text style={s.heroDates}>{formatTripDates(selectedTrip.startDate, selectedTrip.endDate)}</Text><View style={s.packProgressHead}><Text style={s.packProgressText}>Packed</Text><Text style={s.packProgressText}>{packed} of {total} packed</Text></View><View style={s.packProgressTrack}><View style={[s.packProgressFill, { width: `${progress}%` as `${number}%` }]}/></View></View>; }
function Plan({ initiallyOpen = false, onOpened }: { initiallyOpen?: boolean; onOpened?: () => void }) {
  const { selectedTrip, addActivity, updateActivity, removeActivity } = useTravel();
  const [open, setOpen] = useState(initiallyOpen);
  useEffect(() => { if (initiallyOpen) { setOpen(true); onOpened?.(); } }, [initiallyOpen]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [details, setDetails] = useState(false);
  const [error, setError] = useState('');
  if (!selectedTrip) return null;
  const ideas = activitySuggestionsForDestination(selectedTrip.city, selectedTrip.country);
  const orderedActivities = selectedTrip.activities.slice().sort((left, right) => {
    const leftTime = activityMoment(left.date, left.startTime || '00:00')?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = activityMoment(right.date, right.startTime || '00:00')?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime || left.title.localeCompare(right.title);
  });
  const dayGroups = orderedActivities.reduce<{ key: string; heading: string; date: string; items: typeof orderedActivities }[]>((groups, activity) => {
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
        date: parsed ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(parsed) : 'No rush — choose dates whenever you’re ready',
        items: [],
      };
      groups.push(group);
    }
    group.items.push(activity);
    return groups;
  }, []);
  const clear = () => { setTitle(''); setDate(''); setStart(''); setEnd(''); setLocation(''); setNote(''); setEditingId(undefined); setDetails(false); setError(''); };
  const edit = (item: typeof selectedTrip.activities[number]) => {
    setEditingId(item.id); setTitle(item.title); setDate(item.date); setStart(item.startTime); setEnd(item.endTime || ''); setLocation(item.location || ''); setNote(item.note || ''); setDetails(true); setError(''); setOpen(true);
  };
  const save = () => {
    if (!title.trim()) return;
    if ((start && !activityMoment(date, start)) || (end && (!start || !activityMoment(date, end) || activityMoment(date, end)! < activityMoment(date, start)!))) {
      setError('Choose a date and use times like 10:00. End time must be after start time.');
      return;
    }
    const item = { title: title.trim(), date, startTime: start, endTime: end, location, note };
    if (editingId) updateActivity(selectedTrip.id, editingId, item);
    else addActivity(selectedTrip.id, item);
    setOpen(false); clear();
  };
  return <Section title="Plan">
    {dayGroups.length ? <View style={s.planTimeline}>{dayGroups.map((group) => <View key={group.key} style={s.planDay}>
      <View style={s.planDayHeader}>
        <View style={s.planDayMarker}><View style={s.planDayDot}/></View>
        <View style={{ flex: 1 }}><Text style={s.planDayHeading}>{group.heading}</Text><Text style={s.planDayDate}>{group.date}</Text></View>
        <View style={s.planDayCount}><Text style={s.planDayCountText}>{group.items.length}</Text></View>
      </View>
      <View style={s.planDayActivities}>{group.items.map((item) => <Card key={item.id} style={s.planActivityCard}>
        <View style={s.planTimeBlock}><Text style={s.planStartTime}>{item.startTime || '—'}</Text>{item.endTime && <Text style={s.planEndTime}>{item.endTime}</Text>}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={() => edit(item)} style={s.planActivityContent}>
          <Text style={s.itemTitle}>{item.title}</Text>
          {item.location && <View style={s.planMetaRow}><Ionicons name="location-outline" size={14} color={colors.muted}/><Text style={s.planMetaText}>{item.location}</Text></View>}
          {item.note && <Text style={s.planNote} numberOfLines={2}>{item.note}</Text>}
          <Text style={s.editDatesText}>{!item.date ? 'Add date & details' : 'Edit details'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.title}`} hitSlop={10} onPress={() => removeActivity(selectedTrip.id, item.id)} style={({ pressed }) => [s.planRemove, pressed && s.pressed]}><Ionicons name="trash-outline" size={17} color={colors.muted}/></Pressable>
      </Card>)}</View>
    </View>)}</View> : <Card style={s.planEmptyCard}>
      <View style={s.planEmptyIcon}><Ionicons name="calendar-clear-outline" size={25} color={colors.blue}/></View>
      <Text style={s.planEmptyTitle}>A blank page for your trip</Text>
      <Text style={s.planEmptyCopy}>Add the first activity and your days will arrange themselves here.</Text>
    </Card>}
    <View style={s.planAddButton}><PrimaryButton title={dayGroups.length ? 'Add another activity' : 'Add first activity'} onPress={() => { clear(); setOpen(true); }}/></View>
    <Sheet visible={open} title={editingId ? 'Edit activity' : selectedTrip.activities.length ? 'New activity' : 'Your first idea'} onClose={() => { setOpen(false); clear(); }}>
      <AutocompleteField value={title} onChangeText={setTitle} placeholder="Activity" suggestions={ideas} showSuggestionsOnFocus/>
      <Text style={s.copy}>One thing you’d love to do is enough to get started.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={s.editDates}><Ionicons name={details ? 'chevron-up' : 'add'} color={colors.blue} size={18}/><Text style={s.editDatesText}>{details ? 'Hide optional details' : 'Add date, time or details'}</Text></Pressable>
      {details && <>
        <DateField value={date} onChangeText={setDate} placeholder="Date (optional)"/>
        <Field value={start} onChangeText={setStart} placeholder="Start time (optional)"/>
        <Field value={end} onChangeText={setEnd} placeholder="End time (optional)"/>
        <Field value={location} onChangeText={setLocation} placeholder="Location (optional)"/>
        <Field value={note} onChangeText={setNote} placeholder="Note (optional)" multiline/>
      </>}
      {error ? <Text accessibilityRole="alert" style={{ color: '#B42318', marginVertical: 12 }}>{error}</Text> : null}
      <PrimaryButton title="Save activity" icon="checkmark" disabled={!title.trim()} onPress={save}/>
    </Sheet>
  </Section>;
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
  { name: 'Weekend', icon: 'partly-sunny-outline', copy: 'The easy essentials for a short escape.', items: [['Passport', 'Documents'], ['Charger', 'Electronics'], ['Toiletries', 'Toiletries'], ['Underwear', 'Clothing'], ['Light jacket', 'Clothing'], ['Sneakers', 'Shoes']] },
  { name: 'Business', icon: 'briefcase-outline', copy: 'A practical list for work away.', items: [['Passport', 'Documents'], ['Laptop charger', 'Electronics'], ['Adapter', 'Electronics'], ['Smart outfit', 'Clothing'], ['Notebook', 'Documents'], ['Toiletries', 'Toiletries']] },
  { name: 'Family', icon: 'people-outline', copy: 'A calm start for travelling with family.', items: [['Passport', 'Documents'], ['Snacks', 'Other'], ['Water bottle', 'Other'], ['Medication', 'Health'], ['Charger', 'Electronics'], ['Comfort item', 'Other']] },
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
function Packing() {
  const { selectedTrip, addPacking, togglePacking, removePacking, updateTrip } = useTravel();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Clothing');
  const [person, setPerson] = useState('');
  const [showWeatherSuggestions, setShowWeatherSuggestions] = useState(false);
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(selectedTrip?.city || '', selectedTrip?.country || '');
  if (!selectedTrip) return null;
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
    addPacking(selectedTrip.id, { title: cleanTitle, category: category || suggestedPackingCategory(title) || 'Other', person: person.trim() });
    setOpen(false);
    setTitle(''); setCategory('Clothing'); setPerson('');
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
  return <Section title="Packing list">
    <View style={s.stack}>{orderedGroups.map(([group, items]) => <View key={group} style={s.packGroup}>
      <Text style={s.packGroupTitle}>{group}</Text>
      {items.map((item) => <View key={item.id} style={s.pack}>
        <Pressable onPress={() => togglePacking(selectedTrip.id, item.id)}><Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={item.done ? colors.teal : colors.muted}/></Pressable>
        <View style={{ flex: 1 }}><Text style={[s.itemTitle, item.done && s.done]}>{item.title}</Text>{item.person && <Text style={s.copy}>{item.person}</Text>}</View>
        <Pressable onPress={() => removePacking(selectedTrip.id, item.id)}><Ionicons name="close" size={20} color={colors.muted}/></Pressable>
      </View>)}
    </View>)}</View>
    {!selectedTrip.packing.length && <>
      <EmptyMoment compact title="Start with a small list" copy={isGroupTrip(selectedTrip.members) ? 'Pick a starter list, then decide who brings what.' : 'Pick a starter list, then make it your own.'} actionTitle="Add an item" icon="add" onPress={() => setOpen(true)}/>
      <View style={s.templateBlock}><Text style={s.templateHeading}>STARTER LISTS</Text><View style={s.templateGrid}>{packingTemplates.map((template) => <Pressable key={template.name} accessibilityRole="button" onPress={() => addItems(template.items as [string, string][])} style={({ pressed }) => [s.templateCard, pressed && s.pressed]}><View style={s.templateIcon}><Ionicons name={template.icon as any} size={20} color={colors.blue}/></View><Text style={s.templateTitle}>{template.name}</Text><Text style={s.templateCopy}>{template.copy}</Text></Pressable>)}</View></View>
    </>}
    <Pressable accessibilityRole="button" disabled={weatherLoading || weatherError} onPress={() => setShowWeatherSuggestions((visible) => !visible)} style={({ pressed }) => [s.weatherSuggestButton, (pressed || weatherLoading || weatherError) && s.pressed, (weatherLoading || weatherError) && s.weatherSuggestDisabled]}>
      <View style={s.weatherSuggestIcon}><Ionicons name={weatherLoading ? 'sync-outline' : weatherError ? 'cloud-offline-outline' : 'partly-sunny-outline'} size={20} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.weatherSuggestTitle}>{weatherLoading ? 'Checking the weather…' : weatherError ? 'Weather suggestions are unavailable' : `Suggest from weather in ${selectedTrip.city}`}</Text><Text style={s.weatherSuggestCopy}>{weatherLoading ? 'This only takes a moment.' : weatherError ? 'Try again when you are online.' : weather ? `${weather.condition}, ${weather.temperature}°. See what may help.` : 'Choose suggestions for this destination.'}</Text></View><Ionicons name={showWeatherSuggestions ? 'chevron-up' : 'chevron-down'} size={20} color={colors.blue}/>
    </Pressable>
    {showWeatherSuggestions && !weatherLoading && !weatherError && <View style={s.weatherSuggestionPanel}>{weatherSuggestions.length ? <><Text style={s.weatherSuggestionIntro}>Based on the next seven days</Text><View style={s.weatherChips}>{weatherSuggestions.map(([item, itemCategory]) => <View style={s.weatherChip} key={item}><Text style={s.weatherChipText}>{item}</Text><Text style={s.weatherChipCategory}>{itemCategory}</Text></View>)}</View><Pressable accessibilityRole="button" onPress={() => { addItems(weatherSuggestions); setShowWeatherSuggestions(false); }} style={s.weatherAddButton}><Ionicons name="add-circle-outline" size={18} color={colors.blue}/><Text style={s.weatherAddText}>Add {weatherSuggestions.length} suggestions</Text></Pressable></> : <Text style={s.weatherSuggestionIntro}>Those useful weather-based items are already on your list.</Text>}</View>}
    <PrimaryButton title="Add packing item" onPress={() => setOpen(true)}/>
    <Sheet visible={open} title="New packing item" onClose={() => setOpen(false)}>
      <AutocompleteField value={title} onChangeText={setTitle} placeholder="What are you packing?" suggestions={packingSuggestions} onPick={(item) => setCategory(item.detail ?? 'Other')}/>
      <View style={s.categoryPicker}><Text style={s.categoryPickerLabel}>Category</Text><View style={s.categoryOptions}>{packingCategories.map((item) => <Pressable key={item.name} accessibilityRole="button" accessibilityState={{ selected: category === item.name }} onPress={() => setCategory(item.name)} style={[s.categoryOption, category === item.name && s.categoryOptionSelected]}><Ionicons name={item.icon as any} size={16} color={category === item.name ? colors.blue : colors.muted}/><Text style={[s.categoryOptionText, category === item.name && s.categoryOptionTextSelected]}>{item.name}</Text></Pressable>)}</View></View>
      {isGroupTrip(selectedTrip.members) && <AutocompleteField value={person} onChangeText={setPerson} placeholder="Assigned to (optional)" suggestions={memberSuggestions} showSuggestionsOnFocus/>}
      <PrimaryButton title="Add item" icon="checkmark" onPress={save} disabled={!title.trim()}/>
    </Sheet>
  </Section>;
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
function Memories() { const { selectedTrip, addPhoto } = useTravel(); if (!selectedTrip) return null; return <Section title="Memories"><View style={s.gallery}>{selectedTrip.memories.map((item) => <View key={item.id} style={s.memory}><Image source={{ uri: item.image }} style={s.image}/><Text style={s.copy}>{formatJournalDate(item.date)}</Text></View>)}</View>{!selectedTrip.memories.length ? <EmptyMoment compact title="Save the good bits" copy="Choose a photo when there is a moment worth keeping." actionTitle="Choose first photo" icon="image-outline" onPress={() => addPhoto(selectedTrip.id)}/> : <PrimaryButton title="Choose another photo" icon="image-outline" onPress={() => addPhoto(selectedTrip.id)}/>}</Section>; }
const s = StyleSheet.create({
  guidanceCard: { marginBottom: 22, backgroundColor: colors.blueSoft, borderColor: '#D7E8FF', gap: 12 },
  guidanceIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  guidanceTitle: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 31, color: colors.text },
  guidanceCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 4 },
  editDates: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  editDatesText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingTop: 72, paddingBottom: 42 }, hero: { height: 224, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.mist, shadowColor: colors.navy, shadowOpacity: .12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 }, heroImage: { borderRadius: 32 }, heroShade: { flex: 1, justifyContent: 'flex-end', padding: 22, backgroundColor: 'rgba(38,49,84,.27)' }, date: { color: colors.sun, fontWeight: '900', fontSize: 14, letterSpacing: .2 }, heroCopy: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, marginTop: 6, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 }, tabs: { gap: 8, paddingVertical: 24 }, tab: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 18, backgroundColor: '#F7F8FC' }, activeTab: { backgroundColor: colors.mist }, tabText: { color: colors.muted, fontWeight: '800', fontSize: 13 }, activeText: { color: colors.teal }, stack: { gap: 14, marginBottom: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 13 }, itemTitle: { color: colors.navy, fontSize: 17, fontWeight: '900', letterSpacing: -.35 }, packGroup: { gap: 8, marginBottom: 9 }, packGroupTitle: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 4, marginTop: 5 }, pack: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 21, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 16, shadowColor: colors.navy, shadowOpacity: .035, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, done: { textDecorationLine: 'line-through', opacity: .5 }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginBottom: 16 }, memory: { width: '47%' }, image: { height: 146, borderRadius: 21, backgroundColor: colors.mist }, empty: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 28 }, emptyText: { color: colors.navy, fontWeight: '800', fontSize: 16 }, weather: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.sand, borderColor: 'transparent', marginTop: 2, paddingVertical: 21 }, weatherTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' }, temperature: { alignItems: 'flex-end' }, temperatureValue: { color: colors.navy, fontSize: 34, fontWeight: '900', letterSpacing: -1.4 }, weatherRange: { color: colors.muted, fontSize: 11, fontWeight: '800' }, tripFacts: { gap: 14, paddingVertical: 21 }, factLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' }, factText: { color: colors.navy, fontSize: 16, fontWeight: '900', marginTop: 4 }, factDivider: { height: 1, backgroundColor: colors.border }, countdown: { alignSelf: 'flex-start', backgroundColor: colors.lime, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }, countdownText: { color: colors.ink, fontSize: 13, fontWeight: '900' }, note: { color: colors.navy, fontSize: 13, lineHeight: 20, marginTop: 12 }, summaryRow: { flexDirection: 'row', gap: 13 }, summaryCard: { flex: 1, gap: 4, padding: 17 }, summaryNumber: { color: colors.navy, fontSize: 28, fontWeight: '900', marginTop: 5 }, members: { flexDirection: 'row', flexWrap: 'wrap', gap: 17, paddingVertical: 17 }, member: { alignItems: 'center', gap: 6, minWidth: 50 }, memberName: { color: colors.navy, fontSize: 12, fontWeight: '800' } });

// The trip's sections share the same quiet white / blue / lilac language as Home.
Object.assign(s, StyleSheet.create({
  content: { padding: 16, paddingTop: 72, paddingBottom: 42 },
  tripHero: { minHeight: 218, borderRadius: 24, padding: 20, backgroundColor: '#EAF4FF', borderWidth: 1, borderColor: '#C8E3FF', shadowColor: colors.blue, shadowOpacity: .1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  tripHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, tripHeroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, tripHeroTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700' }, tripHeroDestination: { color: colors.muted, fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C8E3FF' }, activeBadge: { backgroundColor: '#EAF7F0', borderColor: '#CDEDDD' }, statusBadgeText: { color: colors.blue, fontSize: 11, fontWeight: '700' }, activeBadgeText: { color: '#25885C' }, heroCountdown: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 36, fontWeight: '700', marginTop: 23, letterSpacing: -.45 }, heroDates: { color: colors.muted, fontSize: 13, marginTop: 4 }, packProgressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }, packProgressText: { color: colors.text, fontSize: 12, fontWeight: '600' }, packProgressTrack: { height: 7, borderRadius: 5, backgroundColor: '#D7E8FF', overflow: 'hidden', marginTop: 8 }, packProgressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.blue },
  heroCard: { borderRadius: 24, padding: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOpacity: .04, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  hero: { height: 220, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.blueSoft },
  heroImage: { borderRadius: 17 },
  heroDetails: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  date: { color: colors.text, fontWeight: '700', fontSize: 15 },
  heroCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, fontWeight: '400' },
  compactTripHeader: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 7, paddingRight: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, shadowColor: colors.text, shadowOpacity: .035, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  compactTripImage: { width: 79, height: 82, borderRadius: 16, backgroundColor: colors.blueSoft },
  compactTripContent: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', minWidth: 0 },
  compactTripEyebrow: { color: colors.blue, fontSize: 10, fontWeight: '700', letterSpacing: .55, textTransform: 'uppercase', marginBottom: 3 },
  compactTripTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 18, fontWeight: '700', letterSpacing: -.2, marginBottom: 7 },
  compactTripMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 17 },
  compactTripMetaText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 14 },
  compactTripAction: { width: 34, height: 34, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  tabs: { gap: 8, paddingVertical: 20 },
  compactTabs: { paddingBottom: 2 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeTab: { backgroundColor: colors.blueSoft, borderColor: '#C8E3FF' },
  tabText: { color: colors.muted, fontWeight: '500', fontSize: 13 },
  activeText: { color: colors.blue, fontWeight: '600' },
  itemTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700', letterSpacing: -.15 },
  packGroupTitle: { color: colors.purple, fontSize: 12, fontWeight: '700', letterSpacing: .2, paddingHorizontal: 4, marginTop: 5 },
  pack: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 13, shadowOpacity: 0, elevation: 0 },
  weatherCard: { backgroundColor: '#FBFDFF', borderColor: '#D9EAFF', marginTop: 2, padding: 17 }, weatherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, weatherCurrent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, weatherIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, forecastStrip: { gap: 7, paddingTop: 17, paddingRight: 4 }, forecastDay: { width: 52, minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 8 }, forecastLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' }, forecastTemp: { color: colors.text, fontSize: 13, fontWeight: '700' }, forecastLow: { color: colors.muted, fontSize: 11 },
  weatherTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700' },
  temperatureValue: { color: colors.blue, fontSize: 32, fontWeight: '700', letterSpacing: -1.4 },
  infoRow: { gap: 10, paddingRight: 8 }, infoCard: { width: 164, minHeight: 132, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14 }, infoIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 11 }, currencyIcon: { backgroundColor: colors.purpleSoft }, plugIcon: { backgroundColor: '#FFF1E8' }, infoLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: .7 }, infoValue: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, lineHeight: 19, fontWeight: '700', marginTop: 5 }, infoCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  inviteBlock: { marginTop: 28 },
  factText: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  countdown: { alignSelf: 'flex-start', backgroundColor: colors.purpleSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  countdownText: { color: colors.purple, fontSize: 13, fontWeight: '600' },
  summaryNumber: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 5 },
  memberName: { color: colors.text, fontSize: 12, fontWeight: '600' },
  addFriendLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 7, marginBottom: 8, paddingHorizontal: 5 },
  addFriendText: { color: colors.blue, fontSize: 14, fontWeight: '600', flex: 1 },
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
  nextActivityMeta: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  nextActivityNote: { color: colors.text, fontSize: 13, lineHeight: 19, backgroundColor: colors.surface, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  reminderCard: { gap: 14, backgroundColor: '#FCFAFF', borderColor: '#E3D9FA', padding: 16 },
  reminderHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  reminderList: { gap: 8, borderTopWidth: 1, borderTopColor: '#EBE4F7', paddingTop: 12 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  reminderEmpty: { color: colors.muted, fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: '#EBE4F7', paddingTop: 12 },
  reminderButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderColor: '#CFE4FF', backgroundColor: colors.surface },
  reminderButtonText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  activityEmptyCard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, backgroundColor: '#FBFCFE' },
  activityEmptyIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  activityCompleteIcon: { backgroundColor: '#ECF8F1' },
  activityEmptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700' },
  activityEmptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  activityEmptyAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  planTimeline: { gap: 25 },
  planDay: { gap: 12 },
  planDayHeader: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 3 },
  planDayMarker: { width: 18, height: 43, alignItems: 'center', justifyContent: 'center' },
  planDayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue, borderWidth: 3, borderColor: '#DCEBFF' },
  planDayHeading: { color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: .65 },
  planDayDate: { color: colors.muted, fontSize: 12, marginTop: 3 },
  planDayCount: { minWidth: 29, height: 29, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  planDayCountText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  planDayActivities: { gap: 9, marginLeft: 9, paddingLeft: 19, borderLeftWidth: 1, borderLeftColor: '#DCEBFF' },
  planActivityCard: { minHeight: 91, flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 14, borderRadius: 19, shadowOpacity: .02 },
  planTimeBlock: { width: 48, minHeight: 57, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  planStartTime: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  planEndTime: { color: colors.muted, fontSize: 10, marginTop: 3 },
  planActivityContent: { flex: 1, minHeight: 57, justifyContent: 'center', paddingVertical: 2 },
  planMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  planMetaText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  planNote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  planRemove: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -2, marginRight: -3 },
  planEmptyCard: { backgroundColor: '#FBFDFF', borderColor: '#DCEBFF' },
  planAddButton: { marginTop: 4 },
  templateBlock: { marginTop: 16, marginBottom: 2 },
  templateHeading: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: .8, marginBottom: 9, paddingHorizontal: 2 },
  templateGrid: { flexDirection: 'row', gap: 8 },
  templateCard: { flex: 1, minHeight: 137, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 11 },
  templateIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  templateTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, fontWeight: '700' },
  templateCopy: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 4 },
  weatherSuggestButton: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, borderWidth: 1, borderColor: '#CBE4FF', backgroundColor: '#F7FBFF', padding: 12, marginTop: 16 },
  weatherSuggestDisabled: { opacity: .63 },
  weatherSuggestIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  weatherSuggestTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, fontWeight: '700' },
  weatherSuggestCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  weatherSuggestionPanel: { gap: 12, backgroundColor: '#F7FBFF', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 1, borderTopWidth: 0, borderColor: '#CBE4FF', marginTop: -3, padding: 13, paddingTop: 15 },
  weatherSuggestionIntro: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  weatherChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  weatherChip: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#DCEBFF', paddingHorizontal: 9, paddingVertical: 7 },
  weatherChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  weatherChipCategory: { color: colors.muted, fontSize: 9, marginTop: 2 },
  weatherAddButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CBE4FF' },
  weatherAddText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  categoryPicker: { gap: 9, marginTop: 2 },
  categoryPickerLabel: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700' },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryOptionSelected: { borderColor: '#BFDFFF', backgroundColor: colors.blueSoft },
  categoryOptionText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  categoryOptionTextSelected: { color: colors.blue },
  wishCard: { gap: 12 },
  wishHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reactionRow: { flexDirection: 'row', gap: 7 },
  reactionButton: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  reactionLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  reactionCount: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  voterNames: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  syncHint: { color: '#9B711F', backgroundColor: '#FFF6E3', fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, marginTop: 6, marginBottom: 12 },
}));
