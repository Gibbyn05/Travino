import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CapybaraMoment } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { DirectMessage, enqueueMessage, flushQueuedMessages, mergeMessages, newMessageId } from '@/src/friend-chat';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';

const localTime = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

export default function FriendChat() {
  const params = useLocalSearchParams<{ userId: string; friendshipId: string; name?: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const friendshipId = Array.isArray(params.friendshipId) ? params.friendshipId[0] : params.friendshipId;
  const name = Array.isArray(params.name) ? params.name[0] : params.name || 'Friend';
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [me, setMe] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const addMessage = useCallback((message: DirectMessage) => setMessages((current) => mergeMessages(current, message)), []);

  const loadMessages = useCallback(async () => {
    if (!supabase || !friendshipId) return;
    const { data, error } = await supabase.from('direct_messages').select('id,friendship_id,sender_id,recipient_id,client_id,body,created_at').eq('friendship_id', friendshipId).order('created_at', { ascending: true });
    if (error) throw error;
    setMessages((data || []) as DirectMessage[]);
  }, [friendshipId]);

  const flushOutbox = useCallback(async (senderId: string) => {
    const client = supabase;
    if (!client || !senderId) return;
    await flushQueuedMessages(senderId, async (message) => {
      const { data, error } = await client.rpc('send_direct_message', {
        p_friendship_id: message.friendship_id,
        p_recipient_id: message.recipient_id,
        p_client_id: message.client_id,
        p_body: message.body,
      });
      return error || !data ? null : data as DirectMessage;
    }, (message) => {
      if (message.friendship_id === friendshipId) addMessage(message);
    });
  }, [addMessage, friendshipId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !friendshipId || !userId) { setLoading(false); return; }
    let active = true;
    let channel: ReturnType<typeof client.channel> | undefined;
    let userIdForSession = '';
    const setup = async () => {
      try {
        const user = await ensureGuestIdentity();
        if (!user) throw new Error('Sign in to chat.');
        userIdForSession = user.id;
        if (active) setMe(user.id);
        await loadMessages();
        await flushOutbox(user.id);
        channel = client.channel(`direct-messages:${friendshipId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `friendship_id=eq.${friendshipId}` }, (payload) => addMessage(payload.new as DirectMessage))
          .subscribe();
      } catch {
        if (active) Alert.alert('Chat is taking a moment', 'Messages will be ready when you are online.');
      } finally { if (active) setLoading(false); }
    };
    void setup();
    const retry = setInterval(() => { if (userIdForSession) void flushOutbox(userIdForSession); }, 15_000);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active' && userIdForSession) void flushOutbox(userIdForSession); });
    return () => { active = false; clearInterval(retry); appState.remove(); if (channel) void client.removeChannel(channel); };
  }, [addMessage, flushOutbox, friendshipId, loadMessages, userId]);

  useEffect(() => {
    if (!messages.length) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !me || !friendshipId || !userId) return;
    const clientId = newMessageId();
    const message = { friendship_id: friendshipId, sender_id: me, recipient_id: userId, client_id: clientId, body, created_at: new Date().toISOString() };
    setDraft('');
    setSending(true);
    addMessage({ ...message, id: clientId, pending: true });
    try {
      await enqueueMessage(message);
      await flushOutbox(me);
    } catch {
      // The message remains in the durable outbox and retries when the app is active again.
    } finally { setSending(false); }
  };

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to friends" onPress={() => router.back()} style={s.back}><Ionicons name="chevron-back" size={23} color={colors.text}/></Pressable><View style={{ flex: 1 }}><Text style={s.headerTitle} numberOfLines={1}>{name}</Text><Text style={s.headerCopy}>A private conversation</Text></View><View style={s.headerAvatar}><Text style={s.headerAvatarText}>{name.slice(0, 1).toLocaleUpperCase()}</Text></View></View>
    {loading ? <ActivityIndicator color={colors.blue} style={{ marginTop: 72 }}/> : <ScrollView ref={scroll} contentContainerStyle={[s.messages, !messages.length && s.messagesEmpty]} keyboardShouldPersistTaps="handled">
      {!messages.length ? <View style={s.empty}><CapybaraMoment size={66}/><Text style={s.emptyTitle}>Say hello when it feels right</Text><Text style={s.emptyCopy}>Messages here are only between you and {name}.</Text></View> : messages.map((message) => <View key={`${message.sender_id}:${message.client_id}`} style={[s.messageRow, message.sender_id === me ? s.mineRow : s.theirsRow]}><View style={[s.bubble, message.sender_id === me ? s.mineBubble : s.theirsBubble]}><Text style={[s.messageText, message.sender_id === me && s.mineText]}>{message.body}</Text><Text style={[s.messageTime, message.sender_id === me && s.mineTime]}>{localTime.format(new Date(message.created_at))}{message.pending ? ' · Sending' : ''}</Text></View></View>)}
    </ScrollView>}
    <View style={s.composer}><TextInput accessibilityLabel="Message" value={draft} onChangeText={setDraft} placeholder={`Message ${name}`} placeholderTextColor={colors.muted} multiline maxLength={1000} style={s.input}/><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || sending || !me} onPress={send} style={({ pressed }) => [s.send, (!draft.trim() || sending || !me) && s.sendDisabled, pressed && s.pressed]}><Ionicons name="arrow-up" size={21} color="#FFFFFF"/></Pressable></View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 92, paddingTop: 42, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: 'rgba(255,254,251,.96)' }, back: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, headerTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 17, fontWeight: '700' }, headerCopy: { color: colors.muted, fontSize: 11, marginTop: 2 }, headerAvatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }, headerAvatarText: { color: colors.purple, fontWeight: '800' },
  messages: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 20, gap: 9 }, messagesEmpty: { justifyContent: 'center' }, empty: { alignItems: 'center', paddingHorizontal: 35, paddingBottom: 58 }, emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, fontWeight: '700', marginTop: 14 }, emptyCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5, textAlign: 'center' }, messageRow: { flexDirection: 'row' }, mineRow: { justifyContent: 'flex-end' }, theirsRow: { justifyContent: 'flex-start' }, bubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }, mineBubble: { backgroundColor: colors.blue, borderBottomRightRadius: 6 }, theirsBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 }, messageText: { color: colors.text, fontSize: 15, lineHeight: 21 }, mineText: { color: '#FFFFFF' }, messageTime: { color: colors.muted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' }, mineTime: { color: 'rgba(255,255,255,.78)' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 25, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'rgba(255,254,251,.98)' }, input: { flex: 1, maxHeight: 108, minHeight: 46, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 18, backgroundColor: '#F2F2F4', color: colors.text, fontSize: 15, textAlignVertical: 'center' }, send: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue }, sendDisabled: { opacity: .42 }, pressed: { transform: [{ scale: .97 }] },
});
