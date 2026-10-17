import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccentText, Card, DestinationCover, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Memory, Trip, useTravel } from '@/src/store';
import { stockCoverForCountry } from '@/src/country-images';

const normalise = (value: string) => value.trim().toLocaleLowerCase('en-US');
const parseDate = (value: string) => {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = iso ? new Date(+iso[1], +iso[2] - 1, +iso[3]) : dotted ? new Date(+dotted[3], +dotted[2] - 1, +dotted[1]) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const journalDate = (value: string) => {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date) : value;
};

export default function CountryMemoryBook() {
  const { country: routeCountry } = useLocalSearchParams<{ country: string }>();
  const { trips, setSelectedTripId } = useTravel();
  const country = Array.isArray(routeCountry) ? routeCountry[0] : routeCountry;
  const countryTrips = trips.filter((trip) => normalise(trip.country) === normalise(country ?? ''))
    .sort((a, b) => (parseDate(a.startDate)?.getTime() ?? 0) - (parseDate(b.startDate)?.getTime() ?? 0));
  const photos = countryTrips.reduce((total, trip) => total + trip.memories.length, 0);
  const cover = countryTrips.flatMap((trip) => trip.memories)[0]?.image || countryTrips[0]?.coverImage || stockCoverForCountry(countryTrips[0]?.country || country || '');
  const addPhotosTo = (trip: Trip) => {
    setSelectedTripId(trip.id);
    router.push('/trip?tab=Memories');
  };

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}><Ionicons name="arrow-back" size={20} color={colors.text}/><Text style={s.backText}>All memory books</Text></Pressable>
    {countryTrips.length ? <>
      <View style={s.bookCoverFrame}>
        <DestinationCover country={countryTrips[0].country} uri={cover} imageStyle={s.coverImage} style={s.cover}>
          <LinearGradient colors={['rgba(26,27,42,.02)', 'rgba(26,27,42,.15)', 'rgba(26,27,42,.76)']} locations={[0, .48, 1]} style={s.coverShade}>
            <View style={s.coverTop}><Text style={s.coverKicker}>THE TRAVEL JOURNAL</Text><Ionicons name="sparkles-outline" size={17} color="#FFFFFF"/></View>
            <View><Text style={s.coverTitle}>{countryTrips[0].country}</Text><Text style={s.coverCities}>{[...new Set(countryTrips.map((trip) => trip.city).filter(Boolean))].join('   ·   ')}</Text><View style={s.coverDivider}/><Text style={s.coverMeta}>{countryTrips.length} {countryTrips.length === 1 ? 'journey' : 'journeys'}   /   {photos} {photos === 1 ? 'memory' : 'memories'}</Text></View>
          </LinearGradient>
        </DestinationCover>
        <View style={s.bookSpine}/>
      </View>

      <View style={s.introduction}>
        <Text style={s.chapterEyebrow}>A PLACE WE KEEP COMING BACK TO</Text>
        <Text style={s.introTitle}>Little moments,{"\n"}kept close.</Text>
        <Text style={s.introText}>A few pages from your time in {countryTrips[0].country} — the places, the days, and the things worth remembering.</Text>
      </View>

      {countryTrips.map((trip, tripIndex) => <JourneyChapter key={trip.id} trip={trip} index={tripIndex + 1} onAddPhotos={() => addPhotosTo(trip)}/>)}
      <View style={s.lastPage}><View style={s.lastPageRule}/><Ionicons name="airplane-outline" size={18} color={colors.purple}/><Text style={s.lastPageText}>THE STORY CONTINUES</Text><View style={s.lastPageRule}/></View>
    </> : <Card style={s.empty}>
      <View style={s.emptyIcon}><Ionicons name="book-outline" size={25} color={colors.purple}/></View>
      <Text style={s.emptyTitle}>This book isn’t here yet</Text>
      <Text style={s.emptyCopy}>Create a trip to {country || 'this place'} to begin collecting memories.</Text>
      <PrimaryButton title="Back to memory books" icon="arrow-back" onPress={() => router.replace('/memory-book' as never)}/>
    </Card>}
  </ScrollView>;
}

function JourneyChapter({ trip, index, onAddPhotos }: { trip: Trip; index: number; onAddPhotos: () => void }) {
  const memories = [...trip.memories].sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));
  const featured = memories[0];
  const rest = memories.slice(1);
  return <View style={s.chapter}>
    <View style={s.chapterHeader}>
      <View style={s.chapterMarker}><Text style={s.chapterNumber}>{String(index).padStart(2, '0')}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.chapterEyebrow}>CHAPTER {String(index).padStart(2, '0')}  ·  {trip.startDate} — {trip.endDate}</Text><AccentText text={trip.city} style={s.chapterTitle}/><Text style={s.chapterSubtitle}>{trip.title}{trip.members.length ? ` · with ${trip.members.join(' & ')}` : ''}</Text></View>
    </View>
    {featured ? <>
      <View style={s.featuredPolaroid}>
        <Image source={{ uri: featured.image }} style={s.featuredImage}/>
        <View style={s.featuredCaption}>
          <Text style={s.photoDate}>{journalDate(featured.date)}</Text>
          <Text style={s.photoLocation}>{featured.location || trip.city}</Text>
          {featured.text ? <Text style={s.photoNote}>{featured.text}</Text> : null}
        </View>
      </View>
      {!!rest.length && <View style={s.smallMoments}>{rest.map((memory, photoIndex) => <Polaroid key={memory.id} memory={memory} city={trip.city} tilt={photoIndex % 2 === 0 ? -1.2 : 1.2}/>)}</View>}
    </> : <View style={s.chapterEmpty}>
      <Ionicons name="camera-outline" size={22} color={colors.purple}/>
      <View style={{ flex: 1 }}><Text style={s.emptyMomentTitle}>This chapter is waiting for its first photo.</Text><Text style={s.photoNote}>Add a picture and a little memory will find its place here.</Text></View>
    </View>}
    <Pressable accessibilityRole="button" onPress={onAddPhotos} style={({ pressed }) => [s.addMomentButton, pressed && s.pressed]}><Ionicons name="add" size={17} color={colors.blue}/><Text style={s.addMomentText}>{memories.length ? 'Add another moment' : 'Add photos to this chapter'}</Text></Pressable>
    <View style={s.chapterEnd}/>
  </View>;
}

function Polaroid({ memory, city, tilt }: { memory: Memory; city: string; tilt: number }) {
  return <View style={[s.polaroid, { transform: [{ rotate: `${tilt}deg` }] }]}>
    <Image source={{ uri: memory.image }} style={s.smallPhoto}/>
    <Text style={s.photoDate}>{journalDate(memory.date)}</Text>
    <Text style={s.smallLocation} numberOfLines={1}>{memory.location || city}</Text>
    {memory.text ? <Text style={s.smallNote} numberOfLines={2}>{memory.text}</Text> : null}
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FBFAF7' }, content: { paddingHorizontal: 18, paddingTop: 57, paddingBottom: 55 },
  back: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, backText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  bookCoverFrame: { borderRadius: 7, backgroundColor: '#FFFFFF', padding: 7, paddingLeft: 12, shadowColor: '#493F34', shadowOpacity: .13, shadowRadius: 19, shadowOffset: { width: 0, height: 9 }, elevation: 3 }, cover: { height: 300, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.blueSoft }, coverImage: { borderRadius: 4 }, coverShade: { flex: 1, padding: 20, justifyContent: 'space-between' }, bookSpine: { position: 'absolute', left: 7, top: 7, bottom: 7, width: 4, backgroundColor: 'rgba(255,255,255,.45)' }, coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, coverKicker: { color: 'rgba(255,255,255,.9)', fontSize: 9, fontWeight: '700', letterSpacing: 2.1 }, coverTitle: { color: '#FFFFFF', fontSize: 43, lineHeight: 49, fontFamily: fonts.heading, letterSpacing: -.7 }, coverCities: { color: '#FFFFFF', fontSize: 13, marginTop: 4 }, coverDivider: { height: 1, backgroundColor: 'rgba(255,255,255,.55)', marginTop: 17, marginBottom: 10 }, coverMeta: { color: 'rgba(255,255,255,.92)', fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  introduction: { paddingHorizontal: 7, paddingTop: 34, paddingBottom: 31, borderBottomWidth: 1, borderBottomColor: '#E9E2D8' }, chapterEyebrow: { color: colors.purple, fontSize: 9, fontWeight: '700', letterSpacing: 1.3, lineHeight: 14 }, introTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 32, lineHeight: 36, letterSpacing: -.5, marginTop: 10 }, introText: { color: '#77746F', fontSize: 13, lineHeight: 21, marginTop: 9, maxWidth: 320 },
  chapter: { paddingTop: 29 }, chapterHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 17 }, chapterMarker: { width: 41, height: 41, borderRadius: 21, borderWidth: 1, borderColor: '#DED5C9', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, chapterNumber: { color: colors.purple, fontFamily: fonts.heading, fontSize: 15 }, chapterTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 25, lineHeight: 30, marginTop: 4 }, chapterSubtitle: { color: '#77746F', fontSize: 12, marginTop: 2 },
  featuredPolaroid: { backgroundColor: '#FFFFFF', padding: 8, paddingBottom: 14, borderRadius: 4, borderWidth: 1, borderColor: '#F0ECE6', shadowColor: '#493F34', shadowOpacity: .1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, featuredImage: { width: '100%', height: 245, backgroundColor: '#EEE9E1', borderRadius: 2 }, featuredCaption: { paddingHorizontal: 8, paddingTop: 12 }, photoDate: { color: '#88827A', fontSize: 11, fontStyle: 'italic' }, photoLocation: { color: colors.text, fontFamily: fonts.heading, fontSize: 18, marginTop: 4 }, photoNote: { color: '#77746F', fontSize: 12, lineHeight: 18, marginTop: 4 },
  smallMoments: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 13, marginTop: 16 }, polaroid: { flex: 1, backgroundColor: '#FFFFFF', padding: 7, paddingBottom: 12, borderRadius: 3, borderWidth: 1, borderColor: '#F0ECE6', shadowColor: '#493F34', shadowOpacity: .08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 }, smallPhoto: { width: '100%', height: 127, backgroundColor: '#EEE9E1', borderRadius: 2 }, smallLocation: { color: colors.text, fontFamily: fonts.heading, fontSize: 13, marginTop: 4 }, smallNote: { color: '#77746F', fontSize: 10, lineHeight: 14, marginTop: 3 },
  chapterEmpty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, backgroundColor: '#F4F0E9', borderRadius: 15 }, emptyMomentTitle: { color: colors.text, fontSize: 13, fontWeight: '600' }, addMomentButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, marginTop: 6 }, addMomentText: { color: colors.blue, fontSize: 12, fontWeight: '600' }, chapterEnd: { height: 1, backgroundColor: '#E9E2D8', marginTop: 17 },
  lastPage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 31 }, lastPageRule: { width: 32, height: 1, backgroundColor: '#DED5C9' }, lastPageText: { color: '#8B8379', fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  empty: { alignItems: 'center', gap: 10, padding: 23, backgroundColor: '#F4F0E9', borderColor: '#E9E2D8' }, emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 21, textAlign: 'center' }, emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 7 }, pressed: { opacity: .76 },
});
