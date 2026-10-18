import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DestinationCover, EmptyMoment, PageTitle } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';
import { stockCoverForCountry } from '@/src/country-images';

type CountryBook = { country: string; trips: Trip[]; photoCount: number; cover?: string };
const normalise = (value: string) => value.trim().toLocaleLowerCase('en-US');

export default function MemoryBookIndex() {
  const { trips } = useTravel();
  const books = Object.values(trips.reduce<Record<string, CountryBook>>((grouped, trip) => {
    const country = trip.country.trim() || 'Somewhere';
    const key = normalise(country);
    const book = grouped[key] ?? { country, trips: [], photoCount: 0, cover: '' };
    book.trips.push(trip);
    book.photoCount += trip.memories.length;
    book.cover ||= trip.memories[0]?.image || trip.coverImage || stockCoverForCountry(country);
    grouped[key] = book;
    return grouped;
  }, {}));

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow="A collection of places and moments">Memory book</PageTitle>
    <Text style={s.intro}>Every trip leaves a little story behind. Choose a place to open its pages.</Text>
    {books.length ? <View style={s.books}>{books.map((book) => {
      const cities = [...new Set(book.trips.map((trip) => trip.city).filter(Boolean))];
      return <Pressable key={normalise(book.country)} accessibilityRole="button" onPress={() => router.push({ pathname: '/memory-book/[country]', params: { country: book.country } } as any)} style={({ pressed }) => [s.bookPressable, pressed && s.pressed]}>
        <DestinationCover country={book.country} uri={book.cover} imageStyle={s.bookImage} style={s.bookImage}>
          <LinearGradient colors={['rgba(20,28,38,0.04)', 'rgba(20,28,38,0.08)', 'rgba(20,28,38,0.78)']} locations={[0, .42, 1]} style={s.bookShade}>
            <View style={s.photoCount}><Ionicons name="images-outline" size={14} color="#FFFFFF"/><Text style={s.photoCountText}>{book.photoCount}</Text></View>
            <View><Text style={s.country}>{book.country}</Text><Text style={s.bookDetail}>{cities.join(' · ') || `${book.trips.length} ${book.trips.length === 1 ? 'trip' : 'trips'}`}</Text></View>
          </LinearGradient>
        </DestinationCover>
        <View style={s.bookFooter}><Text style={s.footerText}>{book.trips.length} {book.trips.length === 1 ? 'trip' : 'trips'} · {book.photoCount} {book.photoCount === 1 ? 'memory' : 'memories'}</Text><Ionicons name="arrow-forward" size={18} color={colors.blue}/></View>
      </Pressable>;
    })}</View> : <EmptyMoment style={s.empty} title="Your first chapter is waiting" copy="Create a trip, then keep a few photos from the days you want to remember." actionTitle="Plan a trip" icon="airplane-outline" onPress={() => router.push('/')}/>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 48 },
  intro: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: -10, marginBottom: 25, maxWidth: 350 },
  books: { gap: 20 },
  bookPressable: { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOpacity: .055, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  bookImage: { height: 220, width: '100%' as const, backgroundColor: colors.blueSoft },
  bookShade: { flex: 1, justifyContent: 'space-between', padding: 18 },
  photoCount: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(20,28,38,.34)' },
  photoCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  country: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 29, lineHeight: 36, fontWeight: '700', letterSpacing: -.55 },
  bookDetail: { color: 'rgba(255,255,255,.9)', fontSize: 13, marginTop: 4 },
  bookFooter: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 17 },
  footerText: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  pressed: { opacity: .86, transform: [{ scale: .99 }] },
  empty: { backgroundColor: colors.purpleSoft, borderColor: '#E8DFFF' },
});
