import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, PageTitle } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { supabase } from '@/src/lib/supabase';

type SharedProfile = { id: string; display_name: string; bio: string; memory_book_public: boolean };
type SharedMemory = { id: string; object_path: string; trip_title: string; city: string; country: string; taken_on: string | null; caption: string; image?: string };

export default function FriendMemoryBook() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const id = Array.isArray(userId) ? userId[0] : userId;
  const [profile, setProfile] = useState<SharedProfile | null>(null);
  const [memories, setMemories] = useState<SharedMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const loadBook = async () => {
      const client = supabase;
      if (!client || !id) { setUnavailable(true); setLoading(false); return; }
      try {
        const { data: person, error: profileError } = await client.from('profiles').select('id,display_name,bio,memory_book_public').eq('id', id).maybeSingle();
        if (profileError) throw profileError;
        if (!person) { setUnavailable(true); return; }
        if (active) setProfile(person as SharedProfile);
        if (!person.memory_book_public) return;
        const { data, error } = await client.from('memory_book_entries').select('id,object_path,trip_title,city,country,taken_on,caption').eq('user_id', id).order('taken_on', { ascending: false });
        if (error) throw error;
        const entries = (data || []) as SharedMemory[];
        const signed = await Promise.all(entries.map(async (entry) => {
          const { data: image, error: imageError } = await client.storage.from('memory-book').createSignedUrl(entry.object_path, 300);
          return imageError || !image ? entry : { ...entry, image: image.signedUrl };
        }));
        if (active) setMemories(signed.filter((entry) => Boolean(entry.image)));
      } catch (error: any) {
        if (active) {
          setUnavailable(true);
          Alert.alert('Memory book unavailable', error?.message || 'Only friends can open a shared memory book.');
        }
      } finally { if (active) setLoading(false); }
    };
    loadBook();
    return () => { active = false; };
  }, [id]);

  const countries = [...new Set(memories.map((memory) => memory.country).filter(Boolean))];
  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color={colors.text}/><Text style={s.backText}>Friends</Text></Pressable>
    {loading ? <ActivityIndicator color={colors.blue} style={{ marginTop: 80 }}/> : unavailable ? <Card style={s.locked}><View style={s.lockIcon}><Ionicons name="lock-closed-outline" size={25} color={colors.blue}/></View><Text style={s.title}>This memory book isn’t available</Text><Text style={s.copy}>Only accepted friends can view a book, and its owner must choose to share it.</Text></Card> : profile ? <>
      <PageTitle eyebrow="A friend’s travel journal">{`${profile.display_name}’s memory book`}</PageTitle>
      {profile.bio ? <Text style={s.copy}>{profile.bio}</Text> : null}
      {!profile.memory_book_public ? <Card style={s.locked}><View style={s.lockIcon}><Ionicons name="lock-closed-outline" size={23} color={colors.muted}/></View><Text style={s.lockedTitle}>This book is private</Text><Text style={s.copy}>Your friend hasn’t shared their memories yet.</Text></Card> : memories.length ? <>
        <Text style={s.subheading}>{memories.length} {memories.length === 1 ? 'memory' : 'memories'}{countries.length ? ` · ${countries.join(', ')}` : ''}</Text>
        <View style={s.gallery}>{memories.map((memory) => <View key={memory.id} style={s.photoCard}>
          <Image source={{ uri: memory.image }} style={s.photo}/>
          <View style={s.caption}><Text style={s.location} numberOfLines={1}>{[memory.city, memory.country].filter(Boolean).join(', ') || memory.trip_title}</Text><Text style={s.date}>{memory.taken_on || memory.trip_title}</Text>{memory.caption ? <Text style={s.copy}>{memory.caption}</Text> : null}</View>
        </View>)}</View>
      </> : <Card style={s.locked}><View style={s.lockIcon}><Ionicons name="images-outline" size={23} color={colors.purple}/></View><Text style={s.lockedTitle}>The pages are ready</Text><Text style={s.copy}>There aren’t any shared photos in this memory book yet.</Text></Card>}
    </> : null}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 48 },
  back: { alignSelf: 'flex-start', minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 }, backText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 29, lineHeight: 37, fontWeight: '700', letterSpacing: -.6, marginTop: 7 }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  subheading: { color: colors.muted, fontSize: 13, marginTop: 19, marginBottom: 14 }, gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }, photoCard: { width: '48.3%', overflow: 'hidden', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, photo: { width: '100%', height: 170, backgroundColor: colors.blueSoft }, caption: { padding: 11, minHeight: 62 }, location: { color: colors.text, fontSize: 13, fontWeight: '700' }, date: { color: colors.muted, fontSize: 11, marginTop: 4 },
  locked: { alignItems: 'center', padding: 24, marginTop: 25, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' }, lockIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', marginBottom: 10 }, lockedTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, fontWeight: '700', marginTop: 3 },
});
