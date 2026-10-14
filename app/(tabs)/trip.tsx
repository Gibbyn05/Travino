// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, ImageBackground, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field, Sheet } from '@/src/forms';
import { Avatar, Card, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel, WishReaction } from '@/src/store';
import { fetchWeather, Weather } from '@/src/weather';
import { activitySuggestionsForDestination, packingCategorySuggestions, packingSuggestions, suggestedPackingCategory, wishSuggestions } from '@/src/suggestions';
import { stockCoverForCountry } from '@/src/country-images';
import { inviteUrl } from '@/src/invites';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { sendTripNotification } from '@/src/notifications';
const tabs = ['Overview', 'Plan', 'Activities', 'Packing', 'Wishlist', 'Memories'];
export default function TripScreen() {
  const router = useRouter();
  const { selectedTrip } = useTravel();
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState('Overview');
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  useEffect(() => { if (requestedTab && tabs.includes(requestedTab)) setTab(requestedTab); }, [requestedTab]);
  if (!selectedTrip) return <Empty/>;
  const invite = () => {
    const base = process.env.EXPO_PUBLIC_APP_URL || 'https://travino-git-main-gibbyn05s-projects.vercel.app';
    const link = inviteUrl(selectedTrip, base);
    return Share.share({ message: `Join ${selectedTrip.title} in Reisefølge:\n${link}` });
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <PageTitle eyebrow={`${selectedTrip.city}, ${selectedTrip.country}`} accent="Trip Plan">{selectedTrip.title}</PageTitle>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{tabs.map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, tab === item && s.activeTab]}><Text style={[s.tabText, tab === item && s.activeText]}>{item}</Text></Pressable>)}</ScrollView>
    <View style={s.heroCard}><ImageBackground source={{ uri: selectedTrip.coverImage || stockCoverForCountry(selectedTrip.country) }} style={s.hero} imageStyle={s.heroImage}/><View style={s.heroDetails}><View style={{ flex: 1 }}><Text style={s.date}>{selectedTrip.startDate} – {selectedTrip.endDate}</Text><Text style={s.heroCopy}>{selectedTrip.members.length ? `${selectedTrip.members.join(', ')} are travelling together` : 'No one has been added yet.'}</Text></View><Ionicons name="arrow-forward" size={19} color={colors.blue}/></View></View>
    <View style={{ marginTop: 12 }}><PrimaryButton title="Invite members" icon="person-add-outline" onPress={invite}/></View>
    <Pressable accessibilityRole="button" onPress={() => setAddFriendOpen(true)} style={s.addFriendLink}><Ionicons name="people-outline" size={18} color={colors.blue}/><Text style={s.addFriendText}>Add an accepted friend to this trip</Text><Ionicons name="chevron-forward" size={17} color={colors.muted}/></Pressable>
    {tab === 'Overview' && <Overview/>}{tab === 'Plan' && <Plan/>}{tab === 'Activities' && <ThingsToDo onOpen={(activity) => router.push({ pathname: '/activity-browser', params: { activity, city: selectedTrip.city, country: selectedTrip.country } })} />}{tab === 'Packing' && <Packing/>}{tab === 'Wishlist' && <Wishes/>}{tab === 'Memories' && <Memories/>}
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
      if (!supabase) throw new Error('Connect Reisefølge to Supabase to add friends to a trip.');
      const user = await ensureGuestIdentity();
      if (!user) throw new Error('Sign in before adding a travel companion.');
      const { data, error } = await supabase.rpc('my_friendships');
      if (error) throw error;
      const accepted = ((data || []) as any[]).filter((friend) => friend.status === 'accepted').map((friend) => ({ profile_id: friend.profile_id, display_name: friend.display_name, status: friend.status }));
      if (alive) setFriends(accepted);
    })().catch((error: any) => {
      if (alive) Alert.alert('Friends could not be loaded', error?.message || 'Try again when you are online.');
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
    } catch (error: any) {
      Alert.alert('Could not add this friend', error?.message || 'Check that the latest Supabase setup is installed, then try again.');
    } finally { setAddingId(''); }
  };

  const available = friends.filter((friend) => !existingNames.includes(friend.display_name));
  return <Sheet visible={visible} title="Add a friend" onClose={onClose}>
    <Text style={s.copy}>Choose someone you have connected with using a friend code. They will get a notification about this trip.</Text>
    {loading ? <ActivityIndicator color={colors.blue} style={{ padding: 24 }}/> : available.length ? available.map((friend) => <Pressable key={friend.profile_id} disabled={!!addingId} onPress={() => add(friend)} style={s.friendOption}>
      <Avatar name={friend.display_name}/><Text style={[s.itemTitle, { flex: 1 }]}>{friend.display_name}</Text>{addingId === friend.profile_id ? <ActivityIndicator color={colors.blue}/> : <Ionicons name="add-circle-outline" size={24} color={colors.blue}/>}
    </Pressable>) : <Text style={s.copy}>No new friends to add yet. Connect first from Profile → Friends.</Text>}
  </Sheet>;
}
function Empty() { return <View style={s.empty}><Ionicons name="airplane-outline" size={38} color={colors.teal}/><Text style={s.emptyText}>Choose or create a trip first.</Text></View>; }
function useWeather(city: string, country: string) { const [weather, setWeather] = useState<Weather | null>(null); const [error, setError] = useState(false); const [loading, setLoading] = useState(true); useEffect(() => { const controller = new AbortController(); setLoading(true); setError(false); fetchWeather(city, country, controller.signal).then((value) => { setWeather(value); setLoading(false); }).catch((reason) => { if (reason.name !== 'AbortError') { setError(true); setLoading(false); } }); return () => controller.abort(); }, [city, country]); return { weather, error, loading }; }
function readableCountdown(value: string) { const parts = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); const start = parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])) : new Date(value); if (Number.isNaN(start.getTime())) return null; const today = new Date(); today.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0); const days = Math.round((start.getTime() - today.getTime()) / 86400000); return days < 0 ? 'Trip completed' : days === 0 ? 'Leaving today' : `${days} ${days === 1 ? 'day' : 'days'} to go`; }
function WeatherCard({ city, country }: { city: string; country: string }) { const { weather, error, loading } = useWeather(city, country); return <Card style={s.weather}>{<Ionicons name={weather?.icon ?? 'partly-sunny-outline'} size={38} color={colors.teal}/>}<View style={{ flex: 1 }}><Text style={s.weatherTitle}>Weather in {city}</Text>{loading ? <Text style={s.copy}>Getting the forecast …</Text> : error ? <Text style={s.copy}>Weather is unavailable right now.</Text> : <Text style={s.copy}>{weather?.condition} · Feels like {weather?.apparentTemperature}°</Text>}</View>{weather && <View style={s.temperature}><Text style={s.temperatureValue}>{weather.temperature}°</Text><Text style={s.weatherRange}>{weather.low}°–{weather.high}°</Text></View>}</Card>; }
function Overview() { const { selectedTrip } = useTravel(); if (!selectedTrip) return null; const next = selectedTrip.activities.slice().sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0]; const remainingPacking = selectedTrip.packing.filter((item) => !item.done).length; const countdown = readableCountdown(selectedTrip.startDate); return <><WeatherCard city={selectedTrip.city} country={selectedTrip.country}/><Section title="Trip details"><Card style={s.tripFacts}><TripDateFact label="Departure" date={selectedTrip.startDate}/><View style={s.factDivider}/><TripDateFact label="Return" date={selectedTrip.endDate} returning/><View style={s.countdown}><Text style={s.countdownText}>{countdown ?? 'Date missing'}</Text></View></Card></Section><Section title="Next activity">{next ? <Card><Text style={s.itemTitle}>{next.title}</Text><Text style={s.copy}>{next.date} · {next.startTime}{next.location ? ` · ${next.location}` : ''}</Text>{next.note && <Text style={s.note}>{next.note}</Text>}</Card> : <Card><Text style={s.copy}>No activities yet. Add them under Plan.</Text></Card>}</Section><Section title="Still to do"><View style={s.summaryRow}><Card style={s.summaryCard}><Ionicons name="bag-handle-outline" size={22} color={colors.teal}/><Text style={s.summaryNumber}>{remainingPacking}</Text><Text style={s.copy}>to pack</Text></Card><Card style={s.summaryCard}><Ionicons name="heart-outline" size={22} color={colors.coral}/><Text style={s.summaryNumber}>{selectedTrip.wishes.length}</Text><Text style={s.copy}>on your wishlist</Text></Card></View></Section><Section title="Travel group">{selectedTrip.members.length ? <Card style={s.members}>{selectedTrip.members.map((member) => <View key={member} style={s.member}><Avatar name={member}/><Text style={s.memberName}>{member}</Text></View>)}</Card> : <Card><Text style={s.copy}>No one has been added yet. Use “Invite members” above.</Text></Card>}</Section></>; }
function TripDateFact({ label, date, returning = false }: { label: string; date: string; returning?: boolean }) {
  const tint = returning ? '#E36F78' : '#35A875';
  return <View style={s.tripDateRow}>
    <View style={[s.tripDateIcon, { backgroundColor: returning ? '#FFF0F1' : '#ECF8F1' }]}>
      <Ionicons name="airplane" size={18} color={tint} style={returning ? { transform: [{ rotate: '180deg' }] } : undefined}/>
    </View>
    <View style={{ flex: 1 }}><Text style={s.factLabel}>{label}</Text><Text style={s.factText}>{date || 'Date missing'}</Text></View>
  </View>;
}
function Plan() {
  const { selectedTrip, addActivity, removeActivity } = useTravel();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  if (!selectedTrip) return null;
  const ideas = activitySuggestionsForDestination(selectedTrip.city, selectedTrip.country);
  const save = () => {
    if (!title || !date || !start) return;
    addActivity(selectedTrip.id, { title, date, startTime: start, endTime: end, location, note });
    setOpen(false);
    setTitle('');
    setDate('');
    setStart('');
    setEnd('');
    setLocation('');
    setNote('');
  };
  return <Section title="Plan">
    <View style={s.stack}>{selectedTrip.activities.map((item) => <Card key={item.id} style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.itemTitle}>{item.title}</Text>
        <Text style={s.copy}>{item.date} · {item.startTime}{item.endTime ? `–${item.endTime}` : ''}</Text>
        {item.location && <Text style={s.copy}>{item.location}</Text>}
      </View>
      <Pressable onPress={() => removeActivity(selectedTrip.id, item.id)}><Ionicons name="trash-outline" size={20} color={colors.coral}/></Pressable>
    </Card>)}</View>
    {!selectedTrip.activities.length && <Text style={s.copy}>Add activities for your travel days.</Text>}
    <PrimaryButton title="Add activity" onPress={() => setOpen(true)}/>
    <Sheet visible={open} title="New activity" onClose={() => setOpen(false)}>
      <AutocompleteField value={title} onChangeText={setTitle} placeholder="Activity" suggestions={ideas} showSuggestionsOnFocus/>
      <DateField value={date} onChangeText={setDate} placeholder="Date"/>
      <Field value={start} onChangeText={setStart} placeholder="Start time"/>
      <Field value={end} onChangeText={setEnd} placeholder="End time (optional)"/>
      <Field value={location} onChangeText={setLocation} placeholder="Location (optional)"/>
      <Field value={note} onChangeText={setNote} placeholder="Note (optional)" multiline/>
      <PrimaryButton title="Save activity" icon="checkmark" onPress={save}/>
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
function Packing() {
  const { selectedTrip, addPacking, togglePacking, removePacking } = useTravel();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [person, setPerson] = useState('');
  if (!selectedTrip) return null;
  const categorySuggestions = [...packingCategorySuggestions, ...selectedTrip.packing.map((item) => ({ label: item.category, value: item.category })).filter((item, index, list) => list.findIndex((candidate) => candidate.value === item.value) === index)];
  const memberSuggestions = selectedTrip.members.map((name) => ({ label: name, value: name }));
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
    addPacking(selectedTrip.id, { title: cleanTitle, category: category.trim() || suggestedPackingCategory(title) || 'Other', person: person.trim() });
    setOpen(false);
    setTitle(''); setCategory(''); setPerson('');
    if (recipientId) sendTripNotification({ event: 'packing_assigned', tripId: selectedTrip.id, tripTitle: selectedTrip.title, recipientId, itemTitle: cleanTitle }).then((result) => {
      if (!result.pushSent) Alert.alert('Packing item saved', 'The item was assigned, but your travel companion may need to enable push notifications.');
    }).catch((error: any) => Alert.alert('Packing item saved', `The assignment was saved, but the notification could not be sent. ${error?.message || ''}`));
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
    {!selectedTrip.packing.length && <Text style={s.copy}>No packing items yet.</Text>}
    <PrimaryButton title="Add packing item" onPress={() => setOpen(true)}/>
    <Sheet visible={open} title="New packing item" onClose={() => setOpen(false)}>
      <AutocompleteField value={title} onChangeText={setTitle} placeholder="What are you packing?" suggestions={packingSuggestions} onPick={(item) => { if (!category) setCategory(item.detail ?? ''); }}/>
      <AutocompleteField value={category} onChangeText={setCategory} placeholder="Category" suggestions={categorySuggestions}/>
      <AutocompleteField value={person} onChangeText={setPerson} placeholder="Assigned to (optional)" suggestions={memberSuggestions} showSuggestionsOnFocus/>
      <PrimaryButton title="Add item" icon="checkmark" onPress={save}/>
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
  const [category, setCategory] = useState('Activity');
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
      Alert.alert('Saved on this device', 'This reaction could not sync with the group. Check the latest Supabase migration and your trip invitation, then try again.');
    }
  };

  const save = () => { if (!name.trim()) return; addWish(selectedTrip.id, { name: name.trim(), category: category || 'Activity', location }); setOpen(false); setName(''); setLocation(''); };
  return <Section title="Wishlist">
    <Text style={s.copy}>React to ideas together and see what the group is excited about.</Text>
    {syncUnavailable && !!supabase && <Text style={s.syncHint}>Group voting needs the latest Supabase setup and a trip invitation.</Text>}
    <View style={s.stack}>{selectedTrip.wishes.map((item) => {
      const votes: Record<string, ReactionVote> = { ...(item.reactions || {}), ...(cloudVotes[item.id] || {}) };
      const myVote = votes[voterId || profileName]?.reaction;
      const voters = Object.values(votes);
      return <Card key={item.id} style={s.wishCard}>
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
    {!selectedTrip.wishes.length && <Text style={s.copy}>Save places and experiences you are considering.</Text>}
    <PrimaryButton title="Add wish" onPress={() => setOpen(true)}/>
    <Sheet visible={open} title="New wish" onClose={() => setOpen(false)}><AutocompleteField value={name} onChangeText={setName} placeholder="Name" suggestions={wishSuggestions}/><Field value={category} onChangeText={setCategory} placeholder="Category"/><Field value={location} onChangeText={setLocation} placeholder="Location (optional)"/><PrimaryButton title="Save wish" icon="checkmark" onPress={save}/></Sheet>
  </Section>;
}
function Memories() { const { selectedTrip, addPhoto } = useTravel(); if (!selectedTrip) return null; return <Section title="Memories"><View style={s.gallery}>{selectedTrip.memories.map((item) => <View key={item.id} style={s.memory}><Image source={{ uri: item.image }} style={s.image}/><Text style={s.copy}>{item.date}</Text></View>)}</View>{!selectedTrip.memories.length && <Text style={s.copy}>Choose photos you want to keep from this trip.</Text>}<PrimaryButton title="Choose photo" icon="image-outline" onPress={() => addPhoto(selectedTrip.id)}/></Section>; }
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { padding: 24, paddingTop: 72, paddingBottom: 42 }, hero: { height: 224, borderRadius: 32, overflow: 'hidden', backgroundColor: colors.mist, shadowColor: colors.navy, shadowOpacity: .12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 }, heroImage: { borderRadius: 32 }, heroShade: { flex: 1, justifyContent: 'flex-end', padding: 22, backgroundColor: 'rgba(38,49,84,.27)' }, date: { color: colors.sun, fontWeight: '900', fontSize: 14, letterSpacing: .2 }, heroCopy: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, marginTop: 6, fontWeight: '700' }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 }, tabs: { gap: 8, paddingVertical: 24 }, tab: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 18, backgroundColor: '#F7F8FC' }, activeTab: { backgroundColor: colors.mist }, tabText: { color: colors.muted, fontWeight: '800', fontSize: 13 }, activeText: { color: colors.teal }, stack: { gap: 14, marginBottom: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 13 }, itemTitle: { color: colors.navy, fontSize: 17, fontWeight: '900', letterSpacing: -.35 }, packGroup: { gap: 8, marginBottom: 9 }, packGroupTitle: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 4, marginTop: 5 }, pack: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 21, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 16, shadowColor: colors.navy, shadowOpacity: .035, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }, done: { textDecorationLine: 'line-through', opacity: .5 }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginBottom: 16 }, memory: { width: '47%' }, image: { height: 146, borderRadius: 21, backgroundColor: colors.mist }, empty: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 28 }, emptyText: { color: colors.navy, fontWeight: '800', fontSize: 16 }, weather: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.sand, borderColor: 'transparent', marginTop: 2, paddingVertical: 21 }, weatherTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' }, temperature: { alignItems: 'flex-end' }, temperatureValue: { color: colors.navy, fontSize: 34, fontWeight: '900', letterSpacing: -1.4 }, weatherRange: { color: colors.muted, fontSize: 11, fontWeight: '800' }, tripFacts: { gap: 14, paddingVertical: 21 }, factLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' }, factText: { color: colors.navy, fontSize: 16, fontWeight: '900', marginTop: 4 }, factDivider: { height: 1, backgroundColor: colors.border }, countdown: { alignSelf: 'flex-start', backgroundColor: colors.lime, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }, countdownText: { color: colors.ink, fontSize: 13, fontWeight: '900' }, note: { color: colors.navy, fontSize: 13, lineHeight: 20, marginTop: 12 }, summaryRow: { flexDirection: 'row', gap: 13 }, summaryCard: { flex: 1, gap: 4, padding: 17 }, summaryNumber: { color: colors.navy, fontSize: 28, fontWeight: '900', marginTop: 5 }, members: { flexDirection: 'row', flexWrap: 'wrap', gap: 17, paddingVertical: 17 }, member: { alignItems: 'center', gap: 6, minWidth: 50 }, memberName: { color: colors.navy, fontSize: 12, fontWeight: '800' } });

// The trip's sections share the same quiet white / blue / lilac language as Home.
Object.assign(s, StyleSheet.create({
  content: { padding: 16, paddingTop: 72, paddingBottom: 42 },
  heroCard: { borderRadius: 24, padding: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOpacity: .04, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  hero: { height: 220, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.blueSoft },
  heroImage: { borderRadius: 17 },
  heroDetails: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  date: { color: colors.text, fontWeight: '700', fontSize: 15 },
  heroCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, fontWeight: '400' },
  tabs: { gap: 8, paddingVertical: 20 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeTab: { backgroundColor: colors.blueSoft, borderColor: '#C8E3FF' },
  tabText: { color: colors.muted, fontWeight: '500', fontSize: 13 },
  activeText: { color: colors.blue, fontWeight: '600' },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -.35 },
  packGroupTitle: { color: colors.purple, fontSize: 12, fontWeight: '700', letterSpacing: .2, paddingHorizontal: 4, marginTop: 5 },
  pack: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 16 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF', marginTop: 2, paddingVertical: 21 },
  weatherTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  temperatureValue: { color: colors.blue, fontSize: 32, fontWeight: '700', letterSpacing: -1.4 },
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
  wishCard: { gap: 12 },
  wishHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reactionRow: { flexDirection: 'row', gap: 7 },
  reactionButton: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  reactionLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  reactionCount: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  voterNames: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  syncHint: { color: '#9B711F', backgroundColor: '#FFF6E3', fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, marginTop: 6, marginBottom: 12 },
}));
