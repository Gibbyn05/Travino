import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { AccentText, CapybaraMoment, Card, PrimaryButton } from '@/src/ui';
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
  const [inviteSent, setInviteSent] = useState(false);
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
    setInviteSent(false);
    setInputIdentifier(invite.replace(/^@/, ''));
    setOpen(true);
  }, [invite]);

  const openAddFriend = () => { setInviteSent(false); setOpen(true); };

  const shareInvite = async () => {
    if (!profile?.username) return;
    const link = Linking.createURL('/friends', { queryParams: { invite: profile.username } });
    await Share.share({ message: `Add me on Travino as @${profile.username}: ${link}` });
  };

  const addFriend = async () => {
    if (busyId === 'add' || !inputIdentifier.trim()) return;
    if (!supabase) { Alert.alert('Friends are taking a moment', 'Try again a little later.'); return; }
    setBusyId('add');
    try {
      const { error } = await supabase.rpc('add_friend_by_identifier', { p_identifier: inputIdentifier.trim() });
      if (error) throw error;
      Keyboard.dismiss();
      setInputIdentifier('');
      setInviteSent(true);
      await refresh();
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
      <View style={s.headingCopy}><Text style={s.eyebrow}>Your travel circle</Text><Text accessibilityRole="header" style={s.pageTitle}>Friends</Text></View>
      {!(open && inviteSent) && <CapybaraMoment size={96} variant="friends"/>}
    </View>
    <Card style={s.inviteCard}>
      <Text accessibilityRole="header" style={s.cardTitle}>Bring a friend</Text>
      <PrimaryButton title="Add a friend" icon="person-add-outline" onPress={openAddFriend}/>
      <View style={s.shareSection}>
        <View style={s.handleGroup}><Text style={s.handleLabel}>Your username</Text><Text selectable style={s.handle}>{profile?.username ? `@${profile.username}` : 'Setting up…'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Share your friend invite" disabled={!profile?.username} onPress={shareInvite} style={({ pressed }) => [s.shareButton, (pressed || !profile?.username) && s.pressed]}><Ionicons name="share-outline" size={21} color={colors.blue}/><Text style={s.shareText}>Share invite link</Text></Pressable>
      </View>
    </Card>

    {loading && <ActivityIndicator color={colors.blue} style={{ marginTop: 24 }}/>}
    {!loading && incoming.length > 0 && <View style={s.section}><AccentText text="Friend requests" style={s.sectionTitle}/>{incoming.map((friend) => <RequestRow key={friend.friendship_id} friend={friend} busy={busyId === friend.friendship_id} onAccept={() => respond(friend.friendship_id, true)} onReject={() => respond(friend.friendship_id, false)}/>)}</View>}
    {!loading && outgoing.length > 0 && <View style={s.section}><AccentText text="Sent requests" style={s.sectionTitle}/>{outgoing.map((friend) => <View key={friend.friendship_id} style={s.pendingRow}><FriendAvatar name={friend.display_name} uri={friend.avatar_url}/><View style={s.friendIdentity}><Text style={s.friendName}>{friend.display_name}</Text><Text style={s.friendDetail}>Waiting for a reply</Text></View><Ionicons name="time-outline" size={19} color={colors.muted}/></View>)}</View>}
    {!loading && <View style={s.section}><AccentText text="Your friends" style={s.sectionTitle}/>{accepted.length ? accepted.map((friend) => <FriendRow key={friend.friendship_id} friend={friend} onChat={() => router.push({ pathname: '/friends/chat/[userId]', params: { userId: friend.profile_id, friendshipId: friend.friendship_id, name: friend.display_name } } as never)} onOpenBooks={() => router.push({ pathname: '/friends/[userId]', params: { userId: friend.profile_id, name: friend.display_name } } as never)} onRemove={() => removeFriend(friend)}/>) : <View style={s.empty}><Text style={s.emptyCopy}>Your friends appear here after they accept.</Text></View>}</View>}
    <Text style={s.privacyNote}>Friends accept your request. You choose which books to share.</Text>
    <Sheet visible={open} title={inviteSent ? 'Invite sent!' : 'Add a friend'} onClose={() => setOpen(false)}>
      {inviteSent ? <View style={s.confirmation}>
        <CapybaraMoment size={152} variant="invite"/>
        <Text accessibilityLiveRegion="polite" style={s.confirmationCopy}>They'll appear here when they accept.</Text>
      </View> : <View><Text style={s.sheetCopy}>Enter a username or friend code.</Text><Field value={inputIdentifier} onChangeText={setInputIdentifier} placeholder="Username or friend code"/></View>}
      {inviteSent
        ? <PrimaryButton title="Back to friends" icon="people-outline" onPress={() => setOpen(false)}/>
        : <PrimaryButton title={busyId === 'add' ? 'Sending…' : 'Send request'} icon="paper-plane-outline" onPress={addFriend} disabled={!inputIdentifier.trim() || busyId === 'add'}/>}
    </Sheet>
  </ScrollView>;
}

function FriendAvatar({ name, uri }: { name: string; uri?: string | null }) {
  return <View style={s.avatar}>{uri ? <Image source={{ uri }} style={s.avatarImage}/> : <Text style={s.avatarText}>{name.slice(0, 1).toLocaleUpperCase()}</Text>}</View>;
}

function RequestRow({ friend, busy, onAccept, onReject }: { friend: SocialProfile; busy: boolean; onAccept: () => void; onReject: () => void }) {
  return <View style={s.friendCard} testID={`friend-request-${friend.friendship_id}`}>
    <View style={s.friendHeader}><FriendAvatar name={friend.display_name} uri={friend.avatar_url}/><View style={s.friendIdentity}><Text style={s.friendName}>{friend.display_name}</Text><Text style={s.friendDetail}>Wants to connect</Text></View></View>
    <View style={s.friendActions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Accept ${friend.display_name}'s request`} disabled={busy} onPress={onAccept} style={({ pressed }) => [s.friendAction, s.accept, (pressed || busy) && s.pressed]}><Text style={s.acceptText}>{busy ? 'Updating…' : 'Accept'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decline ${friend.display_name}'s request`} disabled={busy} onPress={onReject} style={({ pressed }) => [s.friendAction, s.secondaryAction, (pressed || busy) && s.pressed]}><Text style={s.secondaryText}>Decline</Text></Pressable>
    </View>
  </View>;
}

function FriendRow({ friend, onChat, onOpenBooks, onRemove }: { friend: SocialProfile; onChat: () => void; onOpenBooks: () => void; onRemove: () => void }) {
  return <View style={s.friendCard} testID={`friend-card-${friend.friendship_id}`}>
    <View style={s.friendHeader}>
      <FriendAvatar name={friend.display_name} uri={friend.avatar_url}/>
      <View style={s.friendIdentity}><View style={s.friendNameRow}><Text style={s.friendName}>{friend.display_name}</Text>{friend.legend_badge && <Ionicons accessibilityLabel="Legend of the Road" name="ribbon" size={18} color="#B8832E"/>}</View></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${friend.display_name}`} onPress={onRemove} style={({ pressed }) => [s.moreButton, pressed && s.pressed]}><Ionicons name="ellipsis-horizontal" size={23} color={colors.text}/></Pressable>
    </View>
    {Boolean(friend.username) && <Text style={[s.friendDetail, s.friendHandle]}>@{friend.username}</Text>}
    <View style={s.friendActions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Chat with ${friend.display_name}`} onPress={onChat} style={({ pressed }) => [s.friendAction, s.messageAction, pressed && s.pressed]}><Text style={s.messageText}>Message</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${friend.display_name}'s public memory books`} onPress={onOpenBooks} style={({ pressed }) => [s.friendAction, s.secondaryAction, pressed && s.pressed]}><Text style={s.secondaryText}>Memory book</Text></Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 132 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  headingCopy: { flex: 1, minWidth: 0, gap: 5 },
  eyebrow: { color: colors.muted, fontSize: 18, lineHeight: 26 },
  pageTitle: { color: colors.blue, fontFamily: fonts.heading, fontSize: 42, lineHeight: 50 },
  inviteCard: { padding: 20, gap: 16, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' },
  cardTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, lineHeight: 34 },
  shareSection: { gap: 8, borderTopWidth: 1, borderTopColor: '#D4E6FA', paddingTop: 16 },
  handleGroup: { gap: 3 },
  handleLabel: { color: colors.muted, fontSize: 17, lineHeight: 24 },
  handle: { color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  shareButton: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  shareText: { flexShrink: 1, color: colors.blue, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  section: { marginTop: 28, gap: 12 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, marginBottom: 2 },
  friendCard: { padding: 16, gap: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  friendHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  friendIdentity: { flex: 1, minWidth: 0, gap: 3 },
  pendingRow: { padding: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { height: 48, width: 48, flexShrink: 0, borderRadius: 17, overflow: 'hidden', backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.purple, fontSize: 22, fontWeight: '700' },
  friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  friendName: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, lineHeight: 30, flexShrink: 1 },
  friendDetail: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  friendHandle: { marginTop: -8 },
  moreButton: { width: 44, minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#F7F3ED' },
  friendActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  friendAction: { flexGrow: 1, flexBasis: 140, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: 'transparent' },
  messageAction: { backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' },
  messageText: { flexShrink: 1, color: colors.blue, fontSize: 18, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  secondaryAction: { backgroundColor: colors.surface, borderColor: colors.border },
  secondaryText: { flexShrink: 1, color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  accept: { backgroundColor: colors.blue },
  acceptText: { flexShrink: 1, color: '#FFFFFF', fontSize: 18, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  confirmation: { alignItems: 'center', gap: 14, paddingBottom: 12 },
  confirmationCopy: { color: colors.text, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  empty: { padding: 20, borderRadius: 22, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: '#E8DFFF' },
  emptyCopy: { color: colors.text, fontSize: 18, lineHeight: 27 },
  privacyNote: { color: colors.muted, fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 24 },
  sheetCopy: { color: colors.text, fontSize: 18, lineHeight: 26, marginBottom: 16 },
  pressed: { opacity: .65 },
});
