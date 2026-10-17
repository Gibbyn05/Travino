import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field, Sheet } from '@/src/forms';
import { destinationSuggestions } from '@/src/suggestions';
import { AccentText, DestinationCover, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';

export default function HomeScreen() {
  const { profileName, trips, createTrip, setSelectedTripId } = useTravel();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const save = () => {
    if (!title.trim() || !city.trim() || !start.trim() || !end.trim()) return;
    createTrip({ title, city, country: country || 'Unknown', startDate: start, endDate: end, members: [] });
    setOpen(false); setTitle(''); setCity(''); setCountry(''); setStart(''); setEnd('');
  };
  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.topRow}>
      <Text style={s.greeting}>Hi {profileName || 'traveller'}!</Text>
      <View style={s.profileDot}><Text style={s.profileInitial}>{(profileName || 'T').slice(0, 1).toUpperCase()}</Text></View>
    </View>
    <View style={s.heroCopy}>
      <Text style={s.heroEyebrow}>TRAVEL, TOGETHER</Text>
      <Text style={s.heading}>Plan your</Text>
      <Text style={s.gradientHeading}><Text style={{ color: colors.blue }}>next</Text><Text style={{ color: '#8EA9F8' }}> adventure</Text></Text>
      <Text style={s.heroDescription}>Keep your itinerary, memories and travel crew in one happy place.</Text>
    </View>
    <LinearGradient colors={['#FFFFFF', '#F7F8FF', '#EDF8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.createCard}>
      <View style={s.createText}><Text style={s.microCopy}>YOUR FIRST STEP</Text><Text style={s.createTitle}>Tell us where to go.{"\n"}We’ll help with the rest ✈️</Text></View>
      <View style={s.characters} pointerEvents="none">
        <Character style={s.characterPink}/><Character style={s.characterYellow}/><Character style={s.characterBlue}/><Character style={s.characterPurple}/>
        <Ionicons name="sparkles" size={14} color="#FFC451" style={s.characterSparkle}/>
      </View>
      <View style={s.createButton}><PrimaryButton title="Start a new trip" icon="add" onPress={() => setOpen(true)}/></View>
    </LinearGradient>
    <View style={s.sectionHead}><AccentText text={trips.length ? 'Your trips' : 'Your next adventure'} style={s.sectionTitle}/>{trips.length > 0 && <Ionicons name="arrow-forward" size={18} color={colors.text}/>}</View>
    {trips.length === 0 ? <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="airplane-outline" size={28} color={colors.blue}/></View><Text style={s.emptyTitle}>Where to next?</Text><Text style={s.emptyCopy}>Create a trip to keep all your plans together.</Text></View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{trips.map((trip) => <Pressable key={trip.id} onPress={() => { setSelectedTripId(trip.id); router.push('/trip'); }} style={({ pressed }) => [s.tripCard, pressed && { opacity: .85 }]}>
      <DestinationCover country={trip.country} uri={trip.coverImage} style={s.tripImage} imageStyle={s.tripImageRadius}/>
      <View style={s.tripMeta}><View style={{ flex: 1 }}><Text style={s.tripTitle}>{trip.title}</Text><Text style={s.tripLocation}>{trip.city}, {trip.country}</Text><Text style={s.tripDate}>{trip.startDate} – {trip.endDate}</Text></View><View style={s.tripArrow}><Ionicons name="arrow-forward" size={19} color={colors.blue}/></View></View>
    </Pressable>)}</ScrollView>}
    <Sheet visible={open} title="New trip" onClose={() => setOpen(false)}>
      <Field value={title} onChangeText={setTitle} placeholder="Trip name"/>
      <AutocompleteField value={city} onChangeText={setCity} placeholder="City or destination" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)}/>
      <Field value={country} onChangeText={setCountry} placeholder="Country"/>
      <DateField value={start} onChangeText={(date) => { setStart(date); if (end && end <= date) setEnd(''); }} placeholder="Start date"/>
      <DateField value={end} onChangeText={setEnd} placeholder="End date" minDate={start}/>
      <PrimaryButton title="Save trip" icon="checkmark" onPress={save}/>
    </Sheet>
  </ScrollView>;
}

function Character({ style }: { style: object }) {
  return <View style={[s.character, style]}><View style={s.eyes}><View style={s.eye}><View style={s.pupil}/></View><View style={s.eye}><View style={s.pupil}/></View></View><View style={s.mouth}/></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 68, paddingBottom: 44 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  greeting: { color: colors.muted, fontSize: 16, fontWeight: '400' },
  profileDot: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: colors.purple, fontSize: 17, fontWeight: '700' },
  heroCopy: { marginBottom: 28 },
  heroEyebrow: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.25, marginBottom: 8 },
  heading: { color: colors.text, fontFamily: fonts.heading, fontSize: 43, fontWeight: '700', letterSpacing: 0, lineHeight: 49 },
  gradientHeading: { fontFamily: fonts.heading, fontSize: 43, fontWeight: '700', letterSpacing: 0, lineHeight: 51 },
  heroDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 315 },
  createCard: { borderWidth: 1, borderColor: '#D7E8FF', borderRadius: 24, minHeight: 180, padding: 20, overflow: 'hidden' },
  createText: { zIndex: 1 }, microCopy: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.05, marginBottom: 7 },
  createTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', lineHeight: 26, letterSpacing: 0 },
  characters: { position: 'absolute', right: 17, top: 24, width: 130, height: 83 },
  character: { position: 'absolute', width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: .09, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  eyes: { flexDirection: 'row', gap: 4, transform: [{ rotate: '-7deg' }] },
  eye: { width: 13, height: 15, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pupil: { width: 6, height: 8, borderRadius: 4, backgroundColor: '#243869' },
  mouth: { width: 13, height: 4, borderRadius: 4, backgroundColor: '#FFFFFF', marginTop: 4, opacity: .86 },
  characterSparkle: { position: 'absolute', right: -3, top: 40 },
  characterPink: { right: 2, top: 1, backgroundColor: '#F170A4', transform: [{ rotate: '16deg' }] },
  characterYellow: { left: 39, top: 7, backgroundColor: '#FFC451', transform: [{ rotate: '-13deg' }] },
  characterBlue: { left: 10, bottom: 2, backgroundColor: colors.blueBright, transform: [{ rotate: '10deg' }] },
  characterPurple: { right: 14, bottom: 0, backgroundColor: colors.purple, transform: [{ rotate: '-9deg' }] },
  createButton: { marginTop: 22, zIndex: 1 },
  sectionHead: { marginTop: 34, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700', letterSpacing: -.35 },
  empty: { minHeight: 210, borderWidth: 1, borderColor: colors.border, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 25, backgroundColor: colors.surface },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, fontWeight: '700' }, emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  list: { gap: 13, paddingRight: 24, paddingBottom: 8 }, tripCard: { width: 228, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 6, shadowColor: colors.text, shadowOpacity: .04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  tripImage: { height: 150, borderRadius: 17, overflow: 'hidden' }, tripImageRadius: { borderRadius: 17 },
  tripMeta: { paddingHorizontal: 10, paddingTop: 15, paddingBottom: 11, flexDirection: 'row', alignItems: 'center' },
  tripTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, fontWeight: '700', letterSpacing: -.2 },
  tripLocation: { color: colors.muted, fontSize: 13, marginTop: 3 }, tripDate: { color: colors.blue, fontSize: 12, fontWeight: '500', marginTop: 6 },
  tripArrow: { width: 35, height: 35, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
});
