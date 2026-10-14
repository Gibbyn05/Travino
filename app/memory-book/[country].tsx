import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton } from '@/src/ui';
import { colors } from '@/src/theme';
import { Memory, Trip, useTravel } from '@/src/store';
import { stockCoverForCountry } from '@/src/country-images';

type BookPhoto = { memory: Memory; trip: Trip };
const normalise = (value: string) => value.trim().toLocaleLowerCase('en-US');

export default function CountryMemoryBook() {
  const { country: routeCountry } = useLocalSearchParams<{ country: string }>();
  const { trips, setSelectedTripId } = useTravel();
  const country = Array.isArray(routeCountry) ? routeCountry[0] : routeCountry;
  const countryTrips = trips.filter((trip) => normalise(trip.country) === normalise(country ?? ''));
  const photos: BookPhoto[] = countryTrips.flatMap((trip) => trip.memories.map((memory) => ({ memory, trip })));
  const cover = photos[0]?.memory.image || countryTrips[0]?.coverImage || stockCoverForCountry(countryTrips[0]?.country || country || '');
  const addPhotosTo = (trip: Trip) => {
    setSelectedTripId(trip.id);
    router.push('/trip?tab=Memories');
  };

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}><Ionicons name="arrow-back" size={21} color={colors.text}/><Text style={s.backText}>Memory book</Text></Pressable>
    {countryTrips.length ? <>
      <ImageBackground source={{ uri: cover }} imageStyle={s.coverImage} style={s.cover}>
        <View style={s.coverShade}>
          <Text style={s.eyebrow}>A TRAVEL JOURNAL</Text>
          <Text style={s.title}>{countryTrips[0].country}</Text>
          <Text style={s.coverCopy}>{[...new Set(countryTrips.map((trip) => trip.city).filter(Boolean))].join(' · ')}</Text>
          <View style={s.coverRule}/>
          <Text style={s.coverCount}>{photos.length} {photos.length === 1 ? 'moment' : 'moments'} collected</Text>
        </View>
      </ImageBackground>
      <View style={s.journalHeading}><Text style={s.sectionTitle}>Little moments, kept close</Text><Text style={s.sectionCopy}>From {countryTrips.length} {countryTrips.length === 1 ? 'journey' : 'journeys'}</Text></View>
      {photos.length ? <View style={s.gallery}>{photos.map(({ memory, trip }, index) => <View key={`${trip.id}-${memory.id}`} style={[s.photoCard, index % 3 === 1 && s.photoCardTall]}>
        <Image source={{ uri: memory.image }} style={s.photo}/>
        <View style={s.photoCaption}>
          <Text style={s.photoDate}>{memory.date}</Text>
          <Text style={s.photoPlace} numberOfLines={1}>{memory.location || trip.city}</Text>
          {memory.text ? <Text style={s.photoNote} numberOfLines={2}>{memory.text}</Text> : null}
        </View>
      </View>)}</View> : <Card style={s.empty}>
        <View style={s.emptyIcon}><Ionicons name="camera-outline" size={25} color={colors.purple}/></View>
        <Text style={s.emptyTitle}>The pages are ready</Text>
        <Text style={s.sectionCopy}>Add photos to a trip and they’ll gather here in your {countryTrips[0].country} book.</Text>
      </Card>}
      <View style={s.tripsSection}>
        <Text style={s.sectionTitle}>Journeys in {countryTrips[0].country}</Text>
        {countryTrips.map((trip) => <Pressable key={trip.id} onPress={() => addPhotosTo(trip)} style={({ pressed }) => [s.tripRow, pressed && s.pressed]}>
          <View style={s.tripIcon}><Ionicons name="airplane-outline" size={19} color={colors.blue}/></View>
          <View style={{ flex: 1 }}><Text style={s.tripTitle}>{trip.title}</Text><Text style={s.sectionCopy}>{trip.city} · {trip.startDate} – {trip.endDate}</Text></View>
          <Text style={s.addLabel}>Add photos</Text>
        </Pressable>)}
      </View>
    </> : <Card style={s.empty}>
      <View style={s.emptyIcon}><Ionicons name="book-outline" size={25} color={colors.purple}/></View>
      <Text style={s.emptyTitle}>This book isn’t here yet</Text>
      <Text style={s.sectionCopy}>Create a trip to {country || 'this place'} to begin collecting memories.</Text>
      <PrimaryButton title="Back to memory books" icon="arrow-back" onPress={() => router.replace('/memory-book' as any)}/>
    </Card>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 48 },
  back: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  backText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  cover: { height: 280, borderRadius: 25, overflow: 'hidden', backgroundColor: colors.blueSoft },
  coverImage: { borderRadius: 25 },
  coverShade: { flex: 1, justifyContent: 'flex-end', padding: 22, backgroundColor: 'rgba(23,31,48,.3)' },
  eyebrow: { color: 'rgba(255,255,255,.83)', fontSize: 10, letterSpacing: 2.1, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 37, fontWeight: '700', letterSpacing: -1.7, marginTop: 5 },
  coverCopy: { color: 'rgba(255,255,255,.92)', fontSize: 14, marginTop: 3 },
  coverRule: { height: 1, backgroundColor: 'rgba(255,255,255,.6)', marginTop: 16, marginBottom: 10 },
  coverCount: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', letterSpacing: .2 },
  journalHeading: { marginTop: 29, marginBottom: 15 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -.6 },
  sectionCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  photoCard: { width: '48.2%', overflow: 'hidden', borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 1 },
  photoCardTall: { transform: [{ translateY: 13 }] },
  photo: { width: '100%', height: 158, backgroundColor: colors.blueSoft },
  photoCaption: { paddingHorizontal: 11, paddingVertical: 10, minHeight: 63 },
  photoDate: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: .2 },
  photoPlace: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 3 },
  photoNote: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  empty: { alignItems: 'center', gap: 10, padding: 23, backgroundColor: colors.purpleSoft, borderColor: '#E8DFFF', marginBottom: 6 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  tripsSection: { marginTop: 34, gap: 10, marginBottom: 18 },
  tripRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  tripIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  tripTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  addLabel: { color: colors.blue, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: .8 },
});
