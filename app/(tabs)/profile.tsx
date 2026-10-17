import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { Card, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';

function parseTripDate(value: string): Date | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}
const dayStamp = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export default function ProfileScreen() {
  const { profileName, profileBio = '', saveProfile, trips, selectedTrip, deleteTrip, syncMemoryBookPhotos } = useTravel();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profileName);
  const [bio, setBio] = useState(profileBio);
  const [memoryBookPublic, setMemoryBookPublic] = useState(false);
  const [sharingReady, setSharingReady] = useState(false);
  const memoryCount = trips.reduce((total, trip) => total + trip.memories.length, 0);
  const { countriesVisited, daysAway } = useMemo(() => {
    const localToday = new Date();
    const today = Date.UTC(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());
    const tripDays = new Set<number>();
    const visited = new Set<string>();
    for (const trip of trips) {
      if (trip.id === 'spain-2026') continue; // Ignore the editable starter sample in real travel stats.
      const start = parseTripDate(trip.startDate);
      const end = parseTripDate(trip.endDate);
      if (!start || !end || dayStamp(start) > today) continue;
      const last = Math.min(dayStamp(end), today);
      if (last < dayStamp(start)) continue;
      if (dayStamp(end) < today && trip.country.trim()) visited.add(trip.country.trim().toLocaleLowerCase());
      for (let date = dayStamp(start); date <= last; date += 86_400_000) tripDays.add(date);
    }
    return { countriesVisited: visited.size, daysAway: tripDays.size };
  }, [trips]);

  useEffect(() => {
    let active = true;
    const loadVisibility = async () => {
      if (!supabase) return;
      try {
        const user = await ensureGuestIdentity();
        if (!user) return;
        const { data: own, error } = await supabase.rpc('ensure_my_profile', { p_display_name: profileName || 'Traveler' });
        if (error) throw error;
        if (active && own) setMemoryBookPublic(Boolean(own.memory_book_public));
        if (active && own) setSharingReady(true);
      } catch { /* Show sharing as unavailable until the database migration is installed. */ }
    };
    loadVisibility();
    return () => { active = false; };
  }, [profileName]);

  const save = async () => {
    const cleanName = name.trim();
    const cleanBio = bio.trim();
    if (!cleanName) { Alert.alert('Add your name', 'Your friends need a name to recognize you.'); return; }
    saveProfile(cleanName, cleanBio);
    if (supabase) {
      try {
        const user = await ensureGuestIdentity();
        if (user) {
          const { error: ensureError } = await supabase.rpc('ensure_my_profile', { p_display_name: cleanName });
          if (ensureError) throw ensureError;
          const { error } = await supabase.from('profiles').update({ display_name: cleanName, bio: cleanBio }).eq('id', user.id).select('id').single();
          if (error) throw error;
        }
      } catch {
        Alert.alert('Saved on this device', 'Your profile is saved here. Connect the updated Supabase database to sync it with friends.');
      }
    }
    setOpen(false);
  };

  const setBookVisibility = async (next: boolean) => {
    if (!supabase || !sharingReady) {
      Alert.alert('Sharing is not set up yet', 'Apply the latest Supabase migration before making your memory book available to friends.');
      return;
    }
    if (next) {
      const failedUploads = await syncMemoryBookPhotos();
      if (failedUploads > 0) {
        Alert.alert('Some photos could not be shared', 'Your memory book is still private. Check your connection and try again.');
        return;
      }
    }
    const previous = memoryBookPublic;
    setMemoryBookPublic(next);
    try {
      const user = await ensureGuestIdentity();
      if (!user) throw new Error('Sign in is required');
      const { error } = await supabase.from('profiles').update({ memory_book_public: next }).eq('id', user.id).select('id').single();
      if (error) throw error;
    } catch {
      setMemoryBookPublic(previous);
      Alert.alert('Could not update sharing', 'Please try again once your connection is available.');
    }
  };

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow="Your travel profile">Profile</PageTitle>
    <Card style={s.profile}>
      <View style={s.avatar}><Text style={s.initial}>{(profileName || '?').slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.name}>{profileName || 'Your name'}</Text><Text style={s.copy}>{profileBio || 'Collecting little moments along the way.'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => { setName(profileName); setBio(profileBio); setOpen(true); }} style={s.pencil}><Ionicons name="pencil" size={18} color={colors.blue}/></Pressable>
    </Card>
    <View style={s.stats}>
      <Card style={s.stat}><View style={s.statIcon}><Ionicons name="earth-outline" size={20} color={colors.blue}/></View><Text style={s.statNumber}>{countriesVisited}</Text><Text style={s.statLabel}>countries visited</Text></Card>
      <Card style={s.stat}><View style={[s.statIcon, { backgroundColor: colors.purpleSoft }]}><Ionicons name="sunny-outline" size={20} color={colors.purple}/></View><Text style={s.statNumber}>{daysAway}</Text><Text style={s.statLabel}>days away</Text></Card>
    </View>
    <Pressable onPress={() => router.push('/memory-book' as any)} style={({ pressed }) => [s.memoryBookRow, pressed && s.pressed]}>
      <View style={s.memoryBookIcon}><Ionicons name="book-outline" size={21} color={colors.purple}/></View>
      <View style={{ flex: 1 }}><Text style={s.editText}>Memory book</Text><Text style={s.copy}>{memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'photo' : 'photos'} from your trips` : 'A place for your favourite travel moments'}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted}/>
    </Pressable>
    <Pressable onPress={() => router.push('/friends' as any)} style={({ pressed }) => [s.editRow, pressed && s.pressed]}><View style={s.editIcon}><Ionicons name="people-outline" size={20} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.editText}>Friends</Text><Text style={s.copy}>Share your travel memories, together</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
    <Card style={s.privacyCard}>
      <View style={s.privacyIcon}><Ionicons name="lock-closed-outline" size={20} color={colors.blue}/></View>
      <View style={{ flex: 1 }}><Text style={s.detailTitle}>Memory book sharing</Text><Text style={s.copy}>{memoryBookPublic ? 'Visible to your friends only' : 'Private — only you can see it'}</Text></View>
      <Switch value={memoryBookPublic} onValueChange={setBookVisibility} trackColor={{ false: '#E2E8EF', true: colors.blue }} thumbColor="#FFFFFF" accessibilityLabel="Share memory book with friends"/>
    </Card>
    <Section title="Your journeys">
      <Card style={s.detailCard}><View style={s.detailIcon}><Ionicons name="airplane-outline" size={23} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.detailTitle}>{trips.filter((trip) => trip.id !== 'spain-2026').length} saved {trips.filter((trip) => trip.id !== 'spain-2026').length === 1 ? 'trip' : 'trips'}</Text><Text style={s.copy}>Your plans stay yours unless you invite someone along.</Text></View></Card>
      {selectedTrip && selectedTrip.id !== 'spain-2026' && <Pressable onPress={() => deleteTrip(selectedTrip.id)} style={({ pressed }) => [s.deleteRow, pressed && s.pressed]}><Ionicons name="trash-outline" size={19} color={colors.pink}/><Text style={s.deleteText}>Delete “{selectedTrip.title}”</Text></Pressable>}
    </Section>
    <Section title="Premium"><Card style={s.detailCard}><View style={s.premiumIcon}><Ionicons name="sparkles-outline" size={22} color={colors.purple}/></View><View style={{ flex: 1 }}><Text style={s.detailTitle}>Purchases are not configured</Text><Text style={s.copy}>Map and app features are open while App Store and RevenueCat are set up.</Text></View></Card></Section>
    <Sheet visible={open} title="Edit profile" onClose={() => setOpen(false)}><Field value={name} onChangeText={setName} placeholder="Your name"/><Field value={bio} onChangeText={setBio} placeholder="A little about you" multiline/><PrimaryButton title="Save profile" icon="checkmark" onPress={save}/></Sheet>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 42 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 19, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' },
  avatar: { height: 58, width: 58, borderRadius: 21, backgroundColor: colors.blueBright, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' }, name: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', letterSpacing: -.2 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 }, pencil: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14 }, stat: { flex: 1, alignItems: 'flex-start', paddingVertical: 15, paddingHorizontal: 15 }, statIcon: { height: 36, width: 36, borderRadius: 13, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 9 }, statNumber: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -.6 }, statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  editRow: { marginTop: 12, minHeight: 68, paddingHorizontal: 17, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  editIcon: { height: 40, width: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  memoryBookRow: { marginTop: 14, minHeight: 76, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  memoryBookIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  editText: { color: colors.text, fontSize: 15, fontWeight: '600' }, pressed: { opacity: .7 },
  privacyCard: { marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 15 },
  privacyIcon: { height: 40, width: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  detailCard: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  detailIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  premiumIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700', letterSpacing: -.1 },
  deleteRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 3 },
  deleteText: { color: colors.pink, fontSize: 14, fontWeight: '600' },
});
