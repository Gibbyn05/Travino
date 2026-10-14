import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field, Sheet } from '@/src/forms';
import { destinationSuggestions } from '@/src/suggestions';
import { stockCoverForCountry } from '@/src/country-images';
import { PrimaryButton } from '@/src/ui';
import { colors } from '@/src/theme';
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
    <Text style={s.heading}>Create Your</Text>
    <Text style={s.gradientHeading}><Text style={{ color: colors.blue }}>Own</Text><Text style={{ color: '#8EA9F8' }}> Trip</Text><Text style={{ color: '#EBA8D7' }}> Plan</Text></Text>
    <LinearGradient colors={['#FFFFFF', '#F7F8FF', '#EDF8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.createCard}>
      <View style={s.createText}><Text style={s.microCopy}>Ready to plan something fun?</Text><Text style={s.createTitle}>Tell us where to go.{"\n"}We’ve got the rest ✈️</Text></View>
      <View style={s.characters} pointerEvents="none">
        <View style={[s.character, s.characterPink]}><Ionicons name="heart" size={22} color="#FFFFFF"/></View>
        <View style={[s.character, s.characterYellow]}><Ionicons name="sunny" size={22} color="#FFFFFF"/></View>
        <View style={[s.character, s.characterBlue]}><Ionicons name="airplane" size={22} color="#FFFFFF"/></View>
        <View style={[s.character, s.characterPurple]}><Ionicons name="sparkles" size={22} color="#FFFFFF"/></View>
      </View>
      <View style={s.createButton}><PrimaryButton title="Start a new trip" icon="add" onPress={() => setOpen(true)}/></View>
    </LinearGradient>
    <View style={s.sectionHead}><Text style={s.sectionTitle}>{trips.length ? 'Your trips' : 'Your next adventure'}</Text>{trips.length > 0 && <Ionicons name="arrow-forward" size={18} color={colors.text}/>}</View>
    {trips.length === 0 ? <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="airplane-outline" size={28} color={colors.blue}/></View><Text style={s.emptyTitle}>Where to next?</Text><Text style={s.emptyCopy}>Create a trip to keep all your plans together.</Text></View> : <View style={s.list}>{trips.map((trip) => <Pressable key={trip.id} onPress={() => { setSelectedTripId(trip.id); router.push('/trip'); }} style={({ pressed }) => [s.tripCard, pressed && { opacity: .85 }]}>
      <ImageBackground source={{ uri: trip.coverImage || stockCoverForCountry(trip.country) }} style={s.tripImage} imageStyle={s.tripImageRadius}/>
      <View style={s.tripMeta}><View style={{ flex: 1 }}><Text style={s.tripTitle}>{trip.title}</Text><Text style={s.tripLocation}>{trip.city}, {trip.country}</Text><Text style={s.tripDate}>{trip.startDate} – {trip.endDate}</Text></View><View style={s.tripArrow}><Ionicons name="arrow-forward" size={19} color={colors.blue}/></View></View>
    </Pressable>)}</View>}
    <Sheet visible={open} title="New trip" onClose={() => setOpen(false)}>
      <Field value={title} onChangeText={setTitle} placeholder="Trip name"/>
      <AutocompleteField value={city} onChangeText={setCity} placeholder="City or destination" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)}/>
      <Field value={country} onChangeText={setCountry} placeholder="Country"/>
      <DateField value={start} onChangeText={setStart} placeholder="Start date"/>
      <DateField value={end} onChangeText={setEnd} placeholder="End date"/>
      <PrimaryButton title="Save trip" icon="checkmark" onPress={save}/>
    </Sheet>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 24, paddingTop: 78, paddingBottom: 44 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { color: colors.muted, fontSize: 16, fontWeight: '400' },
  profileDot: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: colors.purple, fontSize: 17, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -1.7, lineHeight: 38 },
  gradientHeading: { fontSize: 34, fontWeight: '700', letterSpacing: -1.7, lineHeight: 40, marginBottom: 28 },
  createCard: { borderWidth: 1, borderColor: '#D7E8FF', borderRadius: 24, minHeight: 178, padding: 20, overflow: 'hidden' },
  createText: { zIndex: 1 }, microCopy: { color: colors.muted, fontSize: 12, marginBottom: 7 },
  createTitle: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 24, letterSpacing: -.35 },
  characters: { position: 'absolute', right: 17, top: 28, width: 130, height: 86 },
  character: { position: 'absolute', width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: .09, shadowRadius: 7, shadowOffset: { width: 0, height: 4 } },
  characterPink: { right: 2, top: 1, backgroundColor: '#F170A4', transform: [{ rotate: '16deg' }] },
  characterYellow: { left: 39, top: 7, backgroundColor: '#FFC451', transform: [{ rotate: '-13deg' }] },
  characterBlue: { left: 10, bottom: 2, backgroundColor: colors.blueBright, transform: [{ rotate: '10deg' }] },
  characterPurple: { right: 14, bottom: 0, backgroundColor: colors.purple, transform: [{ rotate: '-9deg' }] },
  createButton: { marginTop: 24, zIndex: 1 },
  sectionHead: { marginTop: 34, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -.7 },
  empty: { minHeight: 210, borderWidth: 1, borderColor: colors.border, borderRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 25, backgroundColor: colors.surface },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' }, emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  list: { gap: 17 }, tripCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 7, shadowColor: colors.text, shadowOpacity: .04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  tripImage: { height: 185, borderRadius: 17, overflow: 'hidden' }, tripImageRadius: { borderRadius: 17 },
  tripMeta: { paddingHorizontal: 10, paddingTop: 15, paddingBottom: 11, flexDirection: 'row', alignItems: 'center' },
  tripTitle: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -.4 },
  tripLocation: { color: colors.muted, fontSize: 13, marginTop: 3 }, tripDate: { color: colors.blue, fontSize: 12, fontWeight: '500', marginTop: 6 },
  tripArrow: { width: 35, height: 35, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
});
