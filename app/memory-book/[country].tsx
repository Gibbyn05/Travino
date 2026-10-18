import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { EmptyMoment } from '@/src/ui';
import { colors } from '@/src/theme';
import { Trip, useTravel } from '@/src/store';
import { MemoryJournal } from '@/src/memory-journal';

const normalise = (value: string) => value.trim().toLocaleLowerCase('en-US');

export default function CountryMemoryBook() {
  const params = useLocalSearchParams<{ country: string; tripId?: string }>();
  const { trips, setMemoryCaption, setSelectedTripId } = useTravel();
  const country = Array.isArray(params.country) ? params.country[0] : params.country;
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  // Keep the existing country URL working for old links. New shelf entries
  // provide a trip id, so every trip has its own journal.
  const trip = tripId ? trips.find((item) => item.id === tripId) : trips.find((item) => normalise(item.country) === normalise(country || ''));
  const journalIndex = trip ? Math.max(trips.filter((item) => Boolean(item.city.trim() || item.country.trim())).findIndex((item) => item.id === trip.id), 0) : 0;
  const addPhotosTo = (selected: Trip) => {
    setSelectedTripId(selected.id);
    router.push('/trip?tab=Memories');
  };

  if (!trip) return <View style={s.page}><EmptyMoment style={s.empty} title="This journal is waiting for its trip" copy="Return to the shelf and choose another travel journal." actionTitle="Back to journals" icon="arrow-back" onPress={() => router.replace('/memory-book' as never)}/></View>;
  return <MemoryJournal trip={trip} coverIndex={journalIndex} onAddMemory={() => addPhotosTo(trip)} onSaveCaption={(memoryId, caption) => setMemoryCaption(trip.id, memoryId, caption)}/>;
}

const s = StyleSheet.create({ page: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: colors.background }, empty: { backgroundColor: '#F7F0E4', borderColor: '#E9DDCF' } });
