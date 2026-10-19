import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { Card, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { completedTripCount, levelForCompletedTrips, TRAVEL_LEVELS } from '@/src/travel-levels';

function parseTripDate(value: string): Date | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}
const dayStamp = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export default function ProfileScreen() {
  const { profileName, profileBio = '', saveProfile, trips, selectedTrip, deleteTrip, setTripCompletionState, memoryBooksPublicByDefault, setMemoryBooksPublicByDefault } = useTravel();
  const [open, setOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [name, setName] = useState(profileName);
  const [bio, setBio] = useState(profileBio);
  const previousLevel = useRef<number | null>(null);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const memoryCount = trips.reduce((total, trip) => total + trip.memories.length, 0);
  const completedTrips = useMemo(() => completedTripCount(trips.filter((trip) => trip.id !== 'spain-2026')), [trips]);
  const travelLevel = useMemo(() => levelForCompletedTrips(completedTrips), [completedTrips]);
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
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    if (previousLevel.current === null) { previousLevel.current = travelLevel.level; return; }
    if (travelLevel.level <= previousLevel.current) { previousLevel.current = travelLevel.level; return; }
    previousLevel.current = travelLevel.level;
    setLevelUp(travelLevel.title);
    if (!reduceMotion) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      celebrationOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(2_200),
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setLevelUp(null); });
    } else {
      celebrationOpacity.setValue(1);
      const timer = setTimeout(() => setLevelUp(null), 2_600);
      return () => clearTimeout(timer);
    }
  }, [celebrationOpacity, reduceMotion, travelLevel.level, travelLevel.title]);

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
        Alert.alert('Saved on this device', 'Your profile is safe here and will sync when the connection is ready.');
      }
    }
    setOpen(false);
  };

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow="Your travel profile">Profile</PageTitle>
    <Card style={s.profile}>
      <View style={s.avatar}><Text style={s.initial}>{(profileName || '?').slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.name}>{profileName || 'Your name'}</Text><Text style={s.copy}>{profileBio || 'Collecting little moments along the way.'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => { setName(profileName); setBio(profileBio); setOpen(true); }} style={s.pencil}><Ionicons name="pencil" size={18} color={colors.blue}/></Pressable>
    </Card>
    <Pressable accessibilityRole="button" accessibilityLabel="Open travel levels" onPress={() => setLevelsOpen(true)} style={({ pressed }) => [s.levelCard, pressed && s.pressed]}>
      <View style={s.levelTop}><View style={s.levelNumber}><Text style={s.levelNumberText}>{travelLevel.level}</Text></View><View style={{ flex: 1 }}><Text style={s.levelEyebrow}>TRAVEL LEVEL</Text><Text style={s.levelTitle}>{travelLevel.title}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.muted}/></View>
      <View style={s.levelProgressHead}><Text style={s.levelProgressCopy}>{travelLevel.nextTitle && travelLevel.tripsLeft !== null ? `${travelLevel.tripsLeft} more ${travelLevel.tripsLeft === 1 ? 'trip' : 'trips'} to ${travelLevel.nextTitle}` : 'Max level reached'}</Text><Text style={s.levelProgressValue}>{completedTrips} completed</Text></View>
      <View style={s.levelTrack}><View style={[s.levelFill, { width: `${levelProgressWidth(completedTrips, travelLevel.level)}%` as `${number}%` }]}/></View>
    </Pressable>
    {levelUp && <Animated.View accessibilityLiveRegion="polite" style={[s.levelUp, { opacity: celebrationOpacity, transform: [{ scale: reduceMotion ? 1 : celebrationOpacity.interpolate({ inputRange: [0, 1], outputRange: [.98, 1] }) }] }]}><Ionicons name="sparkles-outline" size={19} color={colors.purple}/><View style={{ flex: 1 }}><Text style={s.levelUpEyebrow}>LEVEL UP</Text><Text style={s.levelUpTitle}>{levelUp}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Dismiss level up" onPress={() => setLevelUp(null)} hitSlop={10}><Ionicons name="close" size={17} color={colors.muted}/></Pressable></Animated.View>}
    <View style={s.stats}>
      <Card style={s.stat}><View style={s.statIcon}><Ionicons name="earth-outline" size={20} color={colors.blue}/></View><Text style={s.statNumber}>{countriesVisited}</Text><Text style={s.statLabel}>{countriesVisited === 1 ? 'country visited' : 'countries visited'}</Text></Card>
      <Card style={s.stat}><View style={[s.statIcon, { backgroundColor: colors.purpleSoft }]}><Ionicons name="sunny-outline" size={20} color={colors.purple}/></View><Text style={s.statNumber}>{daysAway}</Text><Text style={s.statLabel}>{daysAway === 1 ? 'day away' : 'days away'}</Text></Card>
    </View>
    <Pressable onPress={() => router.push('/memory-book' as any)} style={({ pressed }) => [s.memoryBookRow, pressed && s.pressed]}>
      <View style={s.memoryBookIcon}><Ionicons name="book-outline" size={21} color={colors.purple}/></View>
      <View style={{ flex: 1 }}><Text style={s.editText}>Memory book</Text><Text style={s.copy}>{memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'photo' : 'photos'} from your trips` : 'A place for your favourite travel moments'}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted}/>
    </Pressable>
    <Pressable onPress={() => router.push('/friends' as any)} style={({ pressed }) => [s.editRow, pressed && s.pressed]}><View style={s.editIcon}><Ionicons name="people-outline" size={20} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.editText}>Friends</Text><Text style={s.copy}>Share your travel memories with friends</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
    <Card style={s.privacyCard}>
      <View style={s.privacyIcon}><Ionicons name={memoryBooksPublicByDefault ? 'globe-outline' : 'lock-closed-outline'} size={20} color={colors.blue}/></View>
      <View style={{ flex: 1 }}><Text style={s.detailTitle}>Memory books</Text><Text style={s.copy}>{memoryBooksPublicByDefault ? 'All public to accepted friends by default' : 'All private by default'}</Text><Text style={s.privacyHint}>A book can use its own setting from the shelf.</Text></View>
      <View style={s.visibilityChoices}>
        <Pressable accessibilityRole="button" onPress={() => setMemoryBooksPublicByDefault(false)} style={[s.visibilityChoice, !memoryBooksPublicByDefault && s.visibilityChoiceActive]}><Ionicons name="lock-closed-outline" size={14} color={!memoryBooksPublicByDefault ? '#FFFFFF' : colors.muted}/><Text style={[s.visibilityChoiceText, !memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>All private</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setMemoryBooksPublicByDefault(true)} style={[s.visibilityChoice, memoryBooksPublicByDefault && s.visibilityChoiceActive]}><Ionicons name="globe-outline" size={14} color={memoryBooksPublicByDefault ? '#FFFFFF' : colors.muted}/><Text style={[s.visibilityChoiceText, memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>All public</Text></Pressable>
      </View>
    </Card>
    <Section title="Your journeys">
      <Card style={s.detailCard}><View style={s.detailIcon}><Ionicons name="airplane-outline" size={23} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.detailTitle}>{trips.filter((trip) => trip.id !== 'spain-2026').length} saved {trips.filter((trip) => trip.id !== 'spain-2026').length === 1 ? 'trip' : 'trips'}</Text><Text style={s.copy}>Your plans stay yours unless you invite someone along.</Text></View></Card>
      {selectedTrip && selectedTrip.id !== 'spain-2026' && selectedTrip.completionState !== 'completed' && <Pressable accessibilityRole="button" onPress={() => setTripCompletionState(selectedTrip.id, 'completed')} style={({ pressed }) => [s.completeTripRow, pressed && s.pressed]}><Ionicons name="checkmark-circle-outline" size={19} color={colors.blue}/><Text style={s.completeTripText}>Mark “{selectedTrip.title}” as completed</Text></Pressable>}
      {selectedTrip && selectedTrip.id !== 'spain-2026' && <Pressable onPress={() => deleteTrip(selectedTrip.id)} style={({ pressed }) => [s.deleteRow, pressed && s.pressed]}><Ionicons name="trash-outline" size={19} color={colors.pink}/><Text style={s.deleteText}>Delete “{selectedTrip.title}”</Text></Pressable>}
    </Section>
    <Section title="App"><Pressable accessibilityRole="button" accessibilityLabel="Preview onboarding" onPress={() => router.push({ pathname: '/onboarding', params: { preview: '1' } } as any)} style={({ pressed }) => [s.previewRow, pressed && s.pressed]}><View style={s.previewIcon}><Ionicons name="eye-outline" size={20} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.editText}>Preview onboarding</Text><Text style={s.copy}>Review the welcome flow without changing your profile or trips.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable></Section>
    <Section title="Travino"><Card style={s.detailCard}><View style={s.premiumIcon}><Ionicons name="sparkles-outline" size={22} color={colors.purple}/></View><View style={{ flex: 1 }}><Text style={s.detailTitle}>Travino is growing gently</Text><Text style={s.copy}>Everything here is open while we keep shaping the first version for travellers.</Text></View></Card></Section>
    <Sheet visible={open} title="Edit profile" onClose={() => setOpen(false)}><Field value={name} onChangeText={setName} placeholder="Your name"/><Field value={bio} onChangeText={setBio} placeholder="A little about you" multiline/><Text style={s.profileHint}>Your name and introduction help accepted friends recognize you when you share a memory book.</Text><PrimaryButton title="Save profile" icon="checkmark" onPress={save} disabled={!name.trim()}/></Sheet>
    <Sheet visible={levelsOpen} title="Travel levels" onClose={() => setLevelsOpen(false)}><Text style={s.levelSheetIntro}>Levels follow completed trips only. Planned and cancelled trips do not count.</Text><View style={s.levelList}>{TRAVEL_LEVELS.map((entry) => { const current = entry.level === travelLevel.level; const locked = entry.threshold > completedTrips; return <View key={entry.level} style={[s.levelRow, current && s.levelRowCurrent, locked && s.levelRowLocked]}><View style={[s.levelRowNumber, current && s.levelRowNumberCurrent]}><Text style={[s.levelRowNumberText, current && s.levelRowNumberTextCurrent]}>{entry.level}</Text></View><View style={{ flex: 1 }}><Text style={[s.levelRowTitle, locked && s.levelRowTextLocked]}>{entry.title}</Text><Text style={[s.levelRowCopy, locked && s.levelRowTextLocked]}>{entry.threshold} completed trips</Text></View>{current ? <Ionicons name="checkmark-circle" size={21} color={colors.blue}/> : locked ? <Ionicons name="lock-closed-outline" size={17} color={colors.muted}/> : <Ionicons name="checkmark" size={20} color={colors.blue}/>}</View>; })}</View></Sheet>
  </ScrollView>;
}

function levelProgressWidth(completedTrips: number, level: number) {
  const current = TRAVEL_LEVELS.find((entry) => entry.level === level) ?? TRAVEL_LEVELS[0];
  const next = TRAVEL_LEVELS.find((entry) => entry.level === level + 1);
  if (!next) return 100;
  return Math.max(0, Math.min(100, Math.round((completedTrips - current.threshold) / (next.threshold - current.threshold) * 100)));
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 42 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 19, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' },
  avatar: { height: 58, width: 58, borderRadius: 21, backgroundColor: colors.blueBright, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' }, name: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', letterSpacing: -.2 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 }, pencil: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  levelCard: { marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: '#F4EEFF', borderWidth: 1, borderColor: '#E5DAFF', shadowColor: colors.purple, shadowOpacity: .06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 }, levelTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, levelNumber: { width: 48, height: 48, borderRadius: 17, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' }, levelNumberText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' }, levelEyebrow: { color: colors.purple, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, levelTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 2 }, levelProgressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 15 }, levelProgressCopy: { color: colors.text, fontSize: 12, fontWeight: '600', flex: 1 }, levelProgressValue: { color: colors.muted, fontSize: 11 }, levelTrack: { height: 6, marginTop: 8, overflow: 'hidden', borderRadius: 3, backgroundColor: '#DFD3F7' }, levelFill: { height: '100%', borderRadius: 3, backgroundColor: colors.purple }, levelUp: { minHeight: 67, marginTop: 10, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 19, backgroundColor: '#FFF6DD', borderWidth: 1, borderColor: '#F3DEAA' }, levelUpEyebrow: { color: '#A66B00', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, levelUpTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700', marginTop: 1 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14 }, stat: { flex: 1, alignItems: 'flex-start', paddingVertical: 15, paddingHorizontal: 15 }, statIcon: { height: 36, width: 36, borderRadius: 13, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 9 }, statNumber: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -.6 }, statLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  editRow: { marginTop: 12, minHeight: 68, paddingHorizontal: 17, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  editIcon: { height: 40, width: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  memoryBookRow: { marginTop: 14, minHeight: 76, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  memoryBookIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  editText: { color: colors.text, fontSize: 15, fontWeight: '600' }, pressed: { opacity: .7 },
  previewRow: { minHeight: 76, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  previewIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  privacyCard: { marginTop: 12, flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 15 },
  privacyIcon: { height: 40, width: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  privacyHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, visibilityChoices: { gap: 6, alignItems: 'flex-end' }, visibilityChoice: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#EEF0F3' }, visibilityChoiceActive: { backgroundColor: colors.blue }, visibilityChoiceText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, visibilityChoiceTextActive: { color: '#FFFFFF' },
  detailCard: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  detailIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  premiumIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 15, fontWeight: '700', letterSpacing: -.1 },
  deleteRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 3 },
  completeTripRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 3 }, completeTripText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  deleteText: { color: colors.pink, fontSize: 14, fontWeight: '600' },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7, marginLeft: 2 },
  levelSheetIntro: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 16 }, levelList: { gap: 8 }, levelRow: { minHeight: 62, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, backgroundColor: '#F7F3ED' }, levelRowCurrent: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' }, levelRowLocked: { opacity: .48 }, levelRowNumber: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECE6DD' }, levelRowNumberCurrent: { backgroundColor: colors.blue }, levelRowNumberText: { color: colors.muted, fontSize: 13, fontWeight: '800' }, levelRowNumberTextCurrent: { color: '#FFFFFF' }, levelRowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, levelRowCopy: { color: colors.muted, fontSize: 12, marginTop: 2 }, levelRowTextLocked: { color: colors.muted },
  profileHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -1, marginBottom: 18 },
});
