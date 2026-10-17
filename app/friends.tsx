import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { AccentText, Card, PageTitle, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { useTravel } from '@/src/store';

type SocialProfile = { friendship_id: string; profile_id: string; display_name: string; friend_code: string; bio: string; memory_book_public: boolean; status: 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' };

export default function FriendsScreen() {
  const { profileName } = useTravel();
  const [friendCode, setFriendCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [relationships, setRelationships] = useState<SocialProfile[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    try {
      const user = await ensureGuestIdentity();
      if (!user) throw new Error('Sign in to connect with friends.');
      const { data: profile, error: profileError } = await supabase.rpc('ensure_my_profile', { p_display_name: profileName || 'Traveler' });
      if (profileError) throw profileError;
      setFriendCode(String(profile?.friend_code || ''));
      const { data, error } = await supabase.rpc('my_friendships');
      if (error) throw error;
      setRelationships((data || []) as SocialProfile[]);
    } catch (error: any) {
      Alert.alert('Friends are not ready yet', error?.message || 'Apply the latest Supabase migration and try again.');
    } finally { setLoading(false); }
  }, [profileName]);

  useEffect(() => { refresh(); }, [refresh]);

  const addFriend = async () => {
    if (!supabase) { Alert.alert('Supabase is not configured', 'Connect the app to Supabase to add friends.'); return; }
    setBusyId('add');
    try {
      const { error } = await supabase.rpc('add_friend_by_code', { p_friend_code: inputCode.trim() });
      if (error) throw error;
      setOpen(false); setInputCode(''); await refresh();
      Alert.alert('Friend request sent', 'They’ll appear here when the request is accepted.');
    } catch (error: any) { Alert.alert('Could not add friend', error?.message || 'Check the code and try again.'); }
    finally { setBusyId(''); }
  };

  const respond = async (friendshipId: string, accept: boolean) => {
    if (!supabase) return;
    setBusyId(friendshipId);
    try {
      const { error } = await supabase.rpc('respond_to_friend_request', { p_friendship_id: friendshipId, p_accept: accept });
      if (error) throw error;
      await refresh();
    } catch (error: any) { Alert.alert('Could not update request', error?.message || 'Please try again.'); }
    finally { setBusyId(''); }
  };

  const removeFriend = (friend: SocialProfile) => Alert.alert('Remove friend?', `${friend.display_name} will no longer be able to see your shared memory book.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      const { error } = await supabase!.rpc('remove_friend', { p_profile_id: friend.profile_id });
      if (error) Alert.alert('Could not remove friend', error.message); else refresh();
    } },
  ]);

  const accepted = relationships.filter((item) => item.status === 'accepted');
  const incoming = relationships.filter((item) => item.status === 'pending' && item.direction === 'incoming');
  const outgoing = relationships.filter((item) => item.status === 'pending' && item.direction === 'outgoing');

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={21} color={colors.text}/><Text style={s.backText}>Profile</Text></Pressable>
    <PageTitle eyebrow="Travel is better shared">Friends</PageTitle>
    <Card style={s.codeCard}>
      <View style={s.codeIcon}><Ionicons name="person-add-outline" size={22} color={colors.blue}/></View>
      <Text style={s.cardTitle}>Your friend code</Text>
      <Text style={s.cardCopy}>Share this code with someone you know so they can send you a request.</Text>
      <View style={s.codeRow}><Text selectable style={s.code}>{friendCode || '••••••••••'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Share friend code" onPress={() => friendCode && Share.share({ message: `Add me on Reisefølge with friend code ${friendCode}` })} style={s.shareButton}><Ionicons name="share-outline" size={20} color={colors.blue}/></Pressable></View>
      <PrimaryButton title="Add a friend" icon="person-add-outline" onPress={() => setOpen(true)}/>
    </Card>

    {loading && <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }}/>}
    {!loading && incoming.length > 0 && <View style={s.section}><AccentText text="Friend requests" style={s.sectionTitle}/>{incoming.map((friend) => <FriendRow key={friend.friendship_id} friend={friend} busy={busyId === friend.friendship_id} onAccept={() => respond(friend.friendship_id, true)} onReject={() => respond(friend.friendship_id, false)}/>)}</View>}
    {!loading && outgoing.length > 0 && <View style={s.section}><AccentText text="Sent requests" style={s.sectionTitle}/>{outgoing.map((friend) => <View key={friend.friendship_id} style={s.row}><Avatar name={friend.display_name}/><View style={{ flex: 1 }}><Text style={s.friendName}>{friend.display_name}</Text><Text style={s.friendDetail}>Waiting for a reply</Text></View><Ionicons name="time-outline" size={19} color={colors.muted}/></View>)}</View>}
    {!loading && <View style={s.section}><AccentText text="Your friends" style={s.sectionTitle}/>{accepted.length ? accepted.map((friend) => <FriendRow key={friend.friendship_id} friend={friend} onOpen={() => router.push({ pathname: '/friends/[userId]', params: { userId: friend.profile_id } } as any)} onRemove={() => removeFriend(friend)}/>) : <Card style={s.empty}><View style={s.emptyIcon}><Ionicons name="people-outline" size={24} color={colors.purple}/></View><Text style={s.emptyTitle}>Your travel circle starts here</Text><Text style={s.cardCopy}>Add a friend with their code. When both of you are connected, you can share your memory books.</Text></Card>}</View>}
    <Text style={s.privacyNote}><Ionicons name="lock-closed-outline" size={13} color={colors.muted}/> Memory books are private by default. Even public books are visible only to accepted friends.</Text>
    <Sheet visible={open} title="Add a friend" onClose={() => setOpen(false)}><Text style={s.sheetCopy}>Enter their Reisefølge friend code. You can find it on their Friends page.</Text><Field value={inputCode} onChangeText={setInputCode} placeholder="Friend code"/><PrimaryButton title={busyId === 'add' ? 'Sending…' : 'Send request'} icon="paper-plane-outline" onPress={addFriend}/></Sheet>
  </ScrollView>;
}

function Avatar({ name }: { name: string }) { return <View style={s.avatar}><Text style={s.avatarText}>{name.slice(0, 1).toLocaleUpperCase()}</Text></View>; }
function FriendRow({ friend, busy, onAccept, onReject, onOpen, onRemove }: { friend: SocialProfile; busy?: boolean; onAccept?: () => void; onReject?: () => void; onOpen?: () => void; onRemove?: () => void }) {
  return <View style={s.row}><Avatar name={friend.display_name}/><View style={{ flex: 1 }}><Text style={s.friendName}>{friend.display_name}</Text><Text style={s.friendDetail}>{friend.status === 'accepted' ? (friend.memory_book_public ? 'Memory book shared with friends' : 'Memory book is private') : 'Wants to connect with you'}</Text></View>
    {onAccept ? <View style={s.requestActions}><Pressable onPress={onReject} disabled={busy} style={s.reject}><Text style={s.rejectText}>Decline</Text></Pressable><Pressable onPress={onAccept} disabled={busy} style={s.accept}><Text style={s.acceptText}>{busy ? '…' : 'Accept'}</Text></Pressable></View> : onOpen ? <><Pressable accessibilityRole="button" accessibilityLabel={`Open ${friend.display_name}'s memory book`} onPress={onOpen} style={s.bookButton}><Ionicons name="book-outline" size={18} color={colors.blue}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${friend.display_name}`} onPress={onRemove} style={s.moreButton}><Ionicons name="ellipsis-horizontal" size={18} color={colors.muted}/></Pressable></> : null}
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 50 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', minHeight: 38, gap: 8, marginBottom: 14 }, backText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  codeCard: { alignItems: 'center', padding: 20, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' }, codeIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', marginBottom: 10 }, cardTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, fontWeight: '700' }, cardCopy: { color: colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 5 },
  codeRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 15 }, code: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 2.5 }, shareButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  section: { marginTop: 27, gap: 10 }, sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', letterSpacing: -.2, marginBottom: 2 },
  row: { minHeight: 69, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.purple, fontSize: 17, fontWeight: '700' }, friendName: { color: colors.text, fontSize: 14, fontWeight: '700' }, friendDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  bookButton: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, moreButton: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' }, requestActions: { flexDirection: 'row', gap: 6, alignItems: 'center' }, accept: { borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.blue }, acceptText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, reject: { borderRadius: 13, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#F3F4F7' }, rejectText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 20, backgroundColor: colors.purpleSoft, borderColor: '#E8DFFF' }, emptyIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 9 }, emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700' },
  privacyNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 }, sheetCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -9, marginBottom: 15 },
});
