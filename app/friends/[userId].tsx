import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JournalBook } from '@/src/memory-journal';
import { EmptyMoment, PageTitle } from '@/src/ui';
import { colors } from '@/src/theme';
import { supabase } from '@/src/lib/supabase';
import { Trip } from '@/src/store';

type SharedBook = { trip_id: string; trip_title: string; city: string; country: string; taken_on: string | null };

export default function FriendBooksShelf() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const id = Array.isArray(userId) ? userId[0] : userId;
  const [name, setName] = useState('Friend');
  const [books, setBooks] = useState<SharedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const client = supabase;
      if (!client || !id) { setUnavailable(true); setLoading(false); return; }
      try {
        const { data: profile, error: profileError } = await client.from('profiles').select('display_name').eq('id', id).maybeSingle();
        if (profileError || !profile) throw profileError || new Error('Profile unavailable');
        const { data, error } = await client.from('memory_book_entries').select('trip_id,trip_title,city,country,taken_on').eq('user_id', id).eq('book_public', true).order('taken_on', { ascending: false });
        if (error) throw error;
        if (!active) return;
        setName(profile.display_name || 'Friend');
        const unique = new Map<string, SharedBook>();
        for (const entry of (data || []) as SharedBook[]) unique.set(entry.trip_id || entry.trip_title, entry);
        setBooks([...unique.values()]);
      } catch {
        if (active) setUnavailable(true);
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  const trips = useMemo(() => books.map((book): Trip => ({
    id: book.trip_id || book.trip_title,
    title: book.trip_title || 'Travel journal', city: book.city || '', country: book.country || '',
    startDate: book.taken_on || '', endDate: book.taken_on || '', members: [], activities: [], packing: [], wishes: [], memories: [],
    memoryBookVisibility: 'public',
  })), [books]);

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to friends" onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text}/><Text style={s.backText}>Friends</Text></Pressable>
    {loading ? <ActivityIndicator color={colors.blue} style={{ marginTop: 72 }}/> : unavailable ? <EmptyMoment title="This book is private" copy="Only public books from accepted friends can be opened." actionTitle="Back to friends" onPress={() => router.back()} icon="arrow-back"/> : <>
      <PageTitle eyebrow="A friend's travel journal">{`${name}'s books`}</PageTitle>
      {trips.length ? <View style={s.shelf}>{trips.map((trip, index) => <JournalBook key={trip.id} trip={trip} index={index} isPublic readOnly onPress={() => router.push({ pathname: '/friends/[userId]/[tripId]', params: { userId: id, tripId: trip.id } } as never)}/>)}</View> : <EmptyMoment title="No shared books yet" copy={`${name} has not shared a memory book with friends yet.`} actionTitle="Back to friends" onPress={() => router.back()} icon="arrow-back"/>}
    </>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 50 },
  back: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 }, backText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 25, paddingTop: 3 },
});
