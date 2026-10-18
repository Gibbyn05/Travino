import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyMoment, PageTitle } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';
import { JournalBook } from '@/src/memory-journal';

export default function MemoryBookIndex() {
  const { trips } = useTravel();
  // A journal starts when a destination exists. Photos remain optional so a
  // newly planned trip can already have a place on the shelf.
  const journals = trips.filter((trip) => Boolean(trip.city.trim() || trip.country.trim()));

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow="A shelf of places worth keeping">Travel journals</PageTitle>
    <Text style={s.intro}>Each trip gets its own little book. Open one to keep the good bits close.</Text>
    {journals.length ? (
      <View style={s.shelf}>{journals.map((trip, index) => <JournalBook key={trip.id} trip={trip} index={index} onPress={() => router.push({ pathname: '/memory-book/[country]', params: { country: trip.country || trip.city, tripId: trip.id } } as never)}/>)}</View>
    ) : (
      <EmptyMoment style={s.empty} title="Your shelf is ready" copy="Add a destination to a trip and its journal will appear here." actionTitle="Plan a trip" icon="airplane-outline" onPress={() => router.push('/')}/>
    )}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 72, paddingBottom: 48 },
  intro: { color: '#777269', fontSize: 15, lineHeight: 23, marginTop: -10, marginBottom: 28, maxWidth: 330 },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' },
  empty: { backgroundColor: '#F7F0E4', borderColor: '#E9DDCF' },
});
