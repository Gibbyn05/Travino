// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, ImageBackground, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field, Sheet } from '@/src/forms';
import { Avatar, Card, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';
import { fetchWeather, Weather } from '@/src/weather';
import { activitySuggestionsForDestination, packingCategorySuggestions, packingSuggestions, suggestedPackingCategory, wishSuggestions } from '@/src/suggestions';
import { stockCoverForCountry } from '@/src/country-images';
import { inviteUrl } from '@/src/invites';
const tabs = ['Overview', 'Plan', 'Packing', 'Wishlist', 'Memories'];
export default function TripScreen() {
  const { selectedTrip } = useTravel();
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState('Overview');
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
    {tab === 'Overview' && <Overview/>}{tab === 'Plan' && <Plan/>}{tab === 'Packing' && <Packing/>}{tab === 'Wishlist' && <Wishes/>}{tab === 'Memories' && <Memories/>}
  </ScrollView>;
}
function Empty() { return <View style={s.empty}><Ionicons name="airplane-outline" size={38} color={colors.teal}/><Text style={s.emptyText}>Choose or create a trip first.</Text></View>; }
function useWeather(city: string, country: string) { const [weather, setWeather] = useState<Weather | null>(null); const [error, setError] = useState(false); const [loading, setLoading] = useState(true); useEffect(() => { const controller = new AbortController(); setLoading(true); setError(false); fetchWeather(city, country, controller.signal).then((value) => { setWeather(value); setLoading(false); }).catch((reason) => { if (reason.name !== 'AbortError') { setError(true); setLoading(false); } }); return () => controller.abort(); }, [city, country]); return { weather, error, loading }; }
function readableCountdown(value: string) { const parts = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); const start = parts ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1])) : new Date(value); if (Number.isNaN(start.getTime())) return null; const today = new Date(); today.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0); const days = Math.round((start.getTime() - today.getTime()) / 86400000); return days < 0 ? 'Trip completed' : days === 0 ? 'Leaving today' : `${days} ${days === 1 ? 'day' : 'days'} to go`; }
function WeatherCard({ city, country }: { city: string; country: string }) { const { weather, error, loading } = useWeather(city, country); return <Card style={s.weather}>{<Ionicons name={weather?.icon ?? 'partly-sunny-outline'} size={38} color={colors.teal}/>}<View style={{ flex: 1 }}><Text style={s.weatherTitle}>Weather in {city}</Text>{loading ? <Text style={s.copy}>Getting the forecast …</Text> : error ? <Text style={s.copy}>Weather is unavailable right now.</Text> : <Text style={s.copy}>{weather?.condition} · Feels like {weather?.apparentTemperature}°</Text>}</View>{weather && <View style={s.temperature}><Text style={s.temperatureValue}>{weather.temperature}°</Text><Text style={s.weatherRange}>{weather.low}°–{weather.high}°</Text></View>}</Card>; }
function Overview() { const { selectedTrip } = useTravel(); if (!selectedTrip) return null; const next = selectedTrip.activities.slice().sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0]; const remainingPacking = selectedTrip.packing.filter((item) => !item.done).length; const countdown = readableCountdown(selectedTrip.startDate); return <><WeatherCard city={selectedTrip.city} country={selectedTrip.country}/><Section title="Trip details"><Card style={s.tripFacts}><View><Text style={s.factLabel}>Departure</Text><Text style={s.factText}>{selectedTrip.startDate}</Text></View><View style={s.factDivider}/><View><Text style={s.factLabel}>Return</Text><Text style={s.factText}>{selectedTrip.endDate}</Text></View><View style={s.countdown}><Text style={s.countdownText}>{countdown ?? 'Date missing'}</Text></View></Card></Section><Section title="Next activity">{next ? <Card><Text style={s.itemTitle}>{next.title}</Text><Text style={s.copy}>{next.date} · {next.startTime}{next.location ? ` · ${next.location}` : ''}</Text>{next.note && <Text style={s.note}>{next.note}</Text>}</Card> : <Card><Text style={s.copy}>No activities yet. Add them under Plan.</Text></Card>}</Section><Section title="Still to do"><View style={s.summaryRow}><Card style={s.summaryCard}><Ionicons name="bag-handle-outline" size={22} color={colors.teal}/><Text style={s.summaryNumber}>{remainingPacking}</Text><Text style={s.copy}>to pack</Text></Card><Card style={s.summaryCard}><Ionicons name="heart-outline" size={22} color={colors.coral}/><Text style={s.summaryNumber}>{selectedTrip.wishes.length}</Text><Text style={s.copy}>on your wishlist</Text></Card></View></Section><Section title="Travel group">{selectedTrip.members.length ? <Card style={s.members}>{selectedTrip.members.map((member) => <View key={member} style={s.member}><Avatar name={member}/><Text style={s.memberName}>{member}</Text></View>)}</Card> : <Card><Text style={s.copy}>No one has been added yet. Use “Invite members” above.</Text></Card>}</Section></>; }
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
function Packing() { const { selectedTrip, addPacking, togglePacking, removePacking } = useTravel(); const [open, setOpen] = useState(false); const [title, setTitle] = useState(''); const [category, setCategory] = useState(''); const [person, setPerson] = useState(''); if (!selectedTrip) return null; const categorySuggestions = [...packingCategorySuggestions, ...selectedTrip.packing.map((item) => ({ label: item.category, value: item.category })).filter((item, index, list) => list.findIndex((candidate) => candidate.value === item.value) === index)]; const groups = selectedTrip.packing.reduce<Record<string, typeof selectedTrip.packing>>((all, item) => { const key = item.category || 'Other'; all[key] = [...(all[key] ?? []), item]; return all; }, {}); const orderedGroups = Object.entries(groups).sort(([left], [right]) => { const leftIndex = packingCategorySuggestions.findIndex((item) => item.value === left); const rightIndex = packingCategorySuggestions.findIndex((item) => item.value === right); return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex) || left.localeCompare(right, 'en'); }); const save = () => { if (!title) return; addPacking(selectedTrip.id, { title, category: category.trim() || suggestedPackingCategory(title) || 'Other', person }); setOpen(false); setTitle(''); setCategory(''); setPerson(''); }; return <Section title="Packing list"><View style={s.stack}>{orderedGroups.map(([group, items]) => <View key={group} style={s.packGroup}><Text style={s.packGroupTitle}>{group}</Text>{items.map((item) => <View key={item.id} style={s.pack}><Pressable onPress={() => togglePacking(selectedTrip.id, item.id)}><Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={item.done ? colors.teal : colors.muted}/></Pressable><View style={{ flex: 1 }}><Text style={[s.itemTitle, item.done && s.done]}>{item.title}</Text>{item.person && <Text style={s.copy}>{item.person}</Text>}</View><Pressable onPress={() => removePacking(selectedTrip.id, item.id)}><Ionicons name="close" size={20} color={colors.muted}/></Pressable></View>)}</View>)}</View>{!selectedTrip.packing.length && <Text style={s.copy}>No packing items yet.</Text>}<PrimaryButton title="Add packing item" onPress={() => setOpen(true)}/><Sheet visible={open} title="New packing item" onClose={() => setOpen(false)}><AutocompleteField value={title} onChangeText={setTitle} placeholder="What are you packing?" suggestions={packingSuggestions} onPick={(item) => { if (!category) setCategory(item.detail ?? ''); }}/><AutocompleteField value={category} onChangeText={setCategory} placeholder="Category" suggestions={categorySuggestions}/><Field value={person} onChangeText={setPerson} placeholder="Assigned to (optional)"/><PrimaryButton title="Add item" icon="checkmark" onPress={save}/></Sheet></Section>; }
function Wishes() { const { selectedTrip, addWish, toggleWish, removeWish } = useTravel(); const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [category, setCategory] = useState('Activity'); const [location, setLocation] = useState(''); if (!selectedTrip) return null; const save = () => { if (!name) return; addWish(selectedTrip.id, { name, category: category || 'Other', location }); setOpen(false); setName(''); setLocation(''); }; return <Section title="Wishlist"><View style={s.stack}>{selectedTrip.wishes.map((item) => <Card key={item.id} style={s.row}><Pressable onPress={() => toggleWish(selectedTrip.id, item.id)}><Ionicons name={item.voted ? 'heart' : 'heart-outline'} size={23} color={colors.coral}/></Pressable><View style={{ flex: 1 }}><Text style={s.itemTitle}>{item.name}</Text><Text style={s.copy}>{item.category}{item.location ? ` · ${item.location}` : ''}</Text></View><Pressable onPress={() => removeWish(selectedTrip.id, item.id)}><Ionicons name="trash-outline" size={19} color={colors.muted}/></Pressable></Card>)}</View>{!selectedTrip.wishes.length && <Text style={s.copy}>Save places and experiences you are considering.</Text>}<PrimaryButton title="Add wish" onPress={() => setOpen(true)}/><Sheet visible={open} title="New wish" onClose={() => setOpen(false)}><AutocompleteField value={name} onChangeText={setName} placeholder="Name" suggestions={wishSuggestions}/><Field value={category} onChangeText={setCategory} placeholder="Category"/><Field value={location} onChangeText={setLocation} placeholder="Location (optional)"/><PrimaryButton title="Save wish" icon="checkmark" onPress={save}/></Sheet></Section>; }
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
}));
