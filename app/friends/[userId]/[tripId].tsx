import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { MemoryJournal } from '@/src/memory-journal';
import { EmptyMoment } from '@/src/ui';
import { colors } from '@/src/theme';
import { supabase } from '@/src/lib/supabase';
import { Memory, Trip } from '@/src/store';

type SharedMemory = { id: string; object_path: string; trip_id: string; trip_title: string; city: string; country: string; taken_on: string | null; caption: string | null };

export default function FriendBookReader() {
  const { userId, tripId } = useLocalSearchParams<{ userId: string; tripId: string }>();
  const friendId = Array.isArray(userId) ? userId[0] : userId;
  const bookId = Array.isArray(tripId) ? tripId[0] : tripId;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const client = supabase;
      if (!client || !friendId || !bookId) { if (active) setLoading(false); return; }
      try {
        const { data, error } = await client.from('memory_book_entries').select('id,object_path,trip_id,trip_title,city,country,taken_on,caption').eq('user_id', friendId).eq('trip_id', bookId).eq('book_public', true).order('taken_on', { ascending: true });
        if (error) throw error;
        const records = (data || []) as SharedMemory[];
        const memories = (await Promise.all(records.map(async (entry): Promise<Memory | null> => {
          const { data: signed, error: signedError } = await client.storage.from('memory-book').createSignedUrl(entry.object_path, 300);
          if (signedError || !signed) return null;
          return { id: entry.id, image: signed.signedUrl, date: entry.taken_on || '', location: entry.city, caption: entry.caption || '' };
        }))).filter((memory): memory is Memory => Boolean(memory));
        if (active && records[0] && memories.length) setTrip({ id: bookId, title: records[0].trip_title || 'Travel journal', city: records[0].city || '', country: records[0].country || '', startDate: records[0].taken_on || '', endDate: records.at(-1)?.taken_on || records[0].taken_on || '', members: [], activities: [], packing: [], wishes: [], memories, memoryBookVisibility: 'public' });
      } catch {
        // Row-level security deliberately leaves private books unavailable.
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [bookId, friendId]);

  if (loading) return <View style={s.page}><ActivityIndicator color={colors.blue}/></View>;
  if (!trip) return <View style={s.page}><EmptyMoment title="This book is private" copy="Only public books from accepted friends can be opened." actionTitle="Back to books" onPress={() => router.back()} icon="arrow-back"/></View>;
  return <MemoryJournal trip={trip} coverIndex={0} isPublic readOnly/>;
}

const s = StyleSheet.create({ page: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: colors.background } });
