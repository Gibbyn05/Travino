import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { AccentText, CapybaraMoment, Card, EmptyMoment, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { useTravel } from '@/src/store';

type SocialProfile = {
  friendship_id: string;
  profile_id: string;
  display_name: string;
  username: string;
  friend_code: string;
  avatar_url?: string | null;
  bio: string;
  memory_book_public: boolean;
  legend_badge?: boolean;
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
};

export default function FriendsTab() {
  const { profileName } = useTravel();
  const params = useLocalSearchParams<{ invite?: string }>();
  const invite = Array.isArray(params.invite) ? params.invite[0] : params.invite;
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null);
  const [inputIdentifier, setInputIdentifier] = useState('');
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
      const { data: ownProfile, error: profileError } = await supabase.rpc('ensure_my_profile', { p_display_name: profileName || 'Traveler' });
      if (profileError) throw profileError;
      setProfile({ username: String(ownProfile?.username || ''), friend_code: String(ownProfile?.friend_code || '') });
      const { data, error } = await supabase.rpc('my_friendships');
      if (error) throw error;
      setRelationships((data || []) as SocialProfile[]);
    } catch {
      Alert.alert('Friends are taking a moment', 'Try again when you are online.');
    } finally { setLoading(false); }
  }, [profileName]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!invite) return;
    setInputIdentifier(invite.replace(/^@/, ''));
    setOpen(true);
  }, [invite]);

  const shareInvite = async () => {
    if (!profile?.username) return;
    const link = Linking.createURL('/friends', { queryParams: { invite: profile.username } });
    await Share.share({ message: `Add me on Travino as @${profile.username}: ${link}` });
  };

  const addFriend = async () => {
    if (!supabase) { Alert.alert('Friends are taking a moment', 'Try again a little later.'); return; }
    setBusyId('add');
    try {
      const { error } = await supabase.rpc('add_friend_by_identifier', { p_identifier: inputIdentifier.trim() });
      if (error) throw error;
      setOpen(false); setInputIdentifier(''); await refresh();
      Alert.alert('Friend request sent', 'They will appear here after they accept.');
    } catch (error: any) {
      Alert.alert('Could not send request', error?.message || 'Check the username and try again.');
    } finally { setBusyId(''); }
  };

  const respond = async (friendshipId: string, accept: boolean) => {
    if (!supabase) return;
    setBusyId(friendshipId);
    try {
      const { error } = await supabase.rpc('respond_to_friend_request', { p_friendship_id: friendshipId, p_accept: accept });
      if (error) throw error;
      await refresh();
    } catch { Alert.alert('Could not update request', 'Please try again.'); }
    finally { setBusyId(''); }
  };

  const removeFriend = (friend: SocialProfile) => Alert.alert('Remove friend?', `${friend.display_name} will no longer see books you share with friends.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      const { error } = await supabase!.rpc('remove_friend', { p_profile_id: friend.profile_id });
      if (error) Alert.alert('Could not remove friend', 'Please try again.'); else refresh();
    } },
  ]);

  const accepted = relationships.filter((item) => item.status === 'accepted');
  const incoming = relationships.filter((item) => item.status === 'pending' && item.direction === 'incoming');
  const outgoing = relationships.filter((item) => item.status === 'pending' && item.direction === 'outgoing');

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={s.pageHeading}>
      <View style={s.headingCopy}><Text style={s.eyebrow}>The people you travel with</Text><Text accessibilityRole="header" style={s.pageTitle}>Friends</Text></View>
      <CapybaraMoment size={96} variant="friends"/>
    </View>
    <Card style={s.inviteCard}>
      <View style={s.inviteTop}><View style={s.inviteIcon}><Ionicons name="person-add-outline" size={22} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.cardTitle}>Your Travino username</Text><Text style={s.cardCopy}>Share a link or let a friend add you by username.</Text></View></View>
      <View style={s.handleRow}><Text selectable style={s.handle}>{profile?.username ? `@${profile.username}` : 'Setting up…'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Share your friend invite" disabled={!profile?.username} onPress={shareInvite} style={({ pressed }) => [s.shareButton, (pressed || !profile?.username) && s.pressed]}><Ionicons name="share-outline" size={19} color={colors.blue}/></Pressable></View>
      <PrimaryButton title="Add a friend" icon="person-add-outline" onPress={() => setOpen(true)}/>
    </Card>

    {loading && <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }}/>}
    {!loading && incoming.length > 0 && <View style={s.section}><AccentText text="Friend requests" style={s.sectionTitle}/>{incoming.map((friend) => <RequestRow key={friend.friendship_id} friend={friend} busy={busyId === friend.friendship_id} onAccept={() => respond(friend.friendship_id, true)} onReject={() => respond(friend.friendship_id, false)}/>)}</View>}
    {!loading && outgoing.length > 0 && <View style={s.section}><AccentText text="Sent requests" style={s.sectionTitle}/>{outgoing.map((friend) => <View key={friend.friendship_id} style={s.pendingRow}><FriendAvatar name={friend.display_name} uri={friend.avatar_url}/><View style={{ flex: 1 }}><Text style={s.friendName}>{friend.display_name}</Text><Text style={s.friendDetail}>Waiting for a reply</Text></View><Ionicons name="time-outline" size={19} color={colors.muted}/></View>)}</View>}
    {!loading && <View style={s.section}><AccentText text="Your friends" style={s.sectionTitle}/>{accepted.length ? accepted.map((friend) => <FriendRow key={friend.friendship_id} friend={friend} onChat={() => router.push({ pathname: '/friends/chat/[userId]', params: { userId: friend.profile_id, friendshipId: friend.friendship_id, name: friend.display_name } } as never)} onOpenBooks={() => router.push({ pathname: '/friends/[userId]', params: { userId: friend.profile_id, name: friend.display_name } } as never)} onRemove={() => removeFriend(friend)}/>) : <EmptyMoment compact mascot={null} style={s.empty} title="Your travel circle starts here" copy="Add someone you trust when you want to share memories and messages." actionTitle="Add a friend" icon="person-add-outline" onPress={() => setOpen(true)}/>}</View>}
    <Text style={s.privacyNote}><Ionicons name="lock-closed-outline" size={13} color={colors.muted}/> Requests need acceptance. Only public books from accepted friends can be opened.</Text>
    <Sheet visible={open} title="Add a friend" onClose={() => setOpen(false)}><Text style={s.sheetCopy}>Enter their Travino username, with or without @. Friend codes still work too.</Text><Field value={inputIdentifier} onChangeText={setInputIdentifier} placeholder="Username or friend code"/><PrimaryButton title={busyId === 'add' ? 'Sending…' : 'Send request'} icon="paper-plane-outline" onPress={addFriend} disabled={!inputIdentifier.trim() || busyId === 'add'}/></Sheet>
  </ScrollView>;
}

function FriendAvatar({ name, uri }: { name: string; uri?: string | null }) {
  return <View style={s.avatar}>{uri ? <Image source={{ uri }} style={s.avatarImage}/> : <Text style={s.avatarText}>{name.slice(0, 1).toLocaleUpperCase()}</Text>}</View>;
}

function RequestRow({ friend, busy, onAccept, onReject }: { friend: SocialProfile; busy: boolean; onAccept: () => void; onReject: () => void }) {
  return <View style={s.friendRow}><FriendAvatar name={friend.display_name} uri={friend.avatar_url}/><View style={{ flex: 1 }}><Text style={s.friendName}>{friend.display_name}</Text><Text style={s.friendDetail}>Wants to connect</Text></View><View style={s.requestActions}><Pressable accessibilityRole="button" onPress={onReject} disabled={busy} style={s.reject}><Text style={s.rejectText}>Decline</Text></Pressable><Pressable accessibilityRole="button" onPress={onAccept} disabled={busy} style={s.accept}><Text style={s.acceptText}>{busy ? '…' : 'Accept'}</Text></Pressable></View></View>;
}

function FriendRow({ friend, onChat, onOpenBooks, onRemove }: { friend: SocialProfile; onChat: () => void; onOpenBooks: () => void; onRemove: () => void }) {
  return <View style={s.friendRow}><FriendAvatar name={friend.display_name} uri={friend.avatar_url}/><View style={{ flex: 1, minWidth: 0 }}><View style={s.friendNameRow}><Text style={s.friendName} numberOfLines={1}>{friend.display_name}</Text>{friend.legend_badge && <Ionicons accessibilityLabel="Legend of the Road" name="ribbon" size={14} color="#B8832E"/>}</View><Text style={s.friendDetail} numberOfLines={1}>{friend.username ? `@${friend.username}` : 'Accepted friend'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Chat with ${friend.display_name}`} onPress={onChat} style={s.chatButton}><Ionicons name="chatbubble-outline" size={17} color="#FFFFFF"/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Open ${friend.display_name}'s public memory books`} onPress={onOpenBooks} style={s.bookButton}><Ionicons name="book-outline" size={18} color={colors.blue}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${friend.display_name}`} onPress={onRemove} style={s.moreButton}><Ionicons name="ellipsis-horizontal" size={18} color={colors.muted}/></Pressable></View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 132 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }, headingCopy: { flex: 1, minWidth: 0, gap: 5 }, eyebrow: { color: colors.muted, fontSize: 18, lineHeight: 26 }, pageTitle: { color: colors.blue, fontFamily: fonts.heading, fontSize: 42, lineHeight: 50 },
  inviteCard: { padding: 20, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' }, inviteTop: { flexDirection: 'row', gap: 12, alignItems: 'center' }, inviteIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, cardTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, fontWeight: '700' }, cardCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 }, handleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16, paddingLeft: 2 }, handle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: .2 }, shareButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  section: { marginTop: 28, gap: 10 }, sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', letterSpacing: -.2, marginBottom: 2 }, friendRow: { minHeight: 72, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 9 }, pendingRow: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { height: 43, width: 43, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: colors.purple, fontSize: 17, fontWeight: '700' }, friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, friendName: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 }, friendDetail: { color: colors.muted, fontSize: 11, marginTop: 3 }, chatButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue }, bookButton: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, moreButton: { width: 24, height: 36, alignItems: 'center', justifyContent: 'center' }, requestActions: { flexDirection: 'row', gap: 6, alignItems: 'center' }, accept: { borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.blue }, acceptText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, reject: { borderRadius: 13, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#F3F4F7' }, rejectText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'stretch', backgroundColor: colors.purpleSoft, borderColor: '#E8DFFF' }, privacyNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 }, sheetCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: -9, marginBottom: 15 }, pressed: { opacity: .72, transform: [{ scale: .98 }] },
});
