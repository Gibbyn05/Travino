import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { Card, PageTitle, PrimaryButton, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';

export default function ProfileScreen() {
  const { profileName, saveProfile, trips, selectedTrip, deleteTrip } = useTravel();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profileName);
  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow="Account">Profile</PageTitle>
    <Card style={s.profile}>
      <View style={s.avatar}><Text style={s.initial}>{(profileName || '?').slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.name}>{profileName || 'Your name'}</Text><Text style={s.copy}>Trips are saved on this device.</Text></View>
    </Card>
    <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [s.editRow, pressed && s.pressed]}><View style={s.editIcon}><Ionicons name="pencil-outline" size={20} color={colors.blue}/></View><Text style={s.editText}>Edit profile</Text><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable>
    <Section title="Data">
      <Card style={s.detailCard}><View style={s.detailIcon}><Ionicons name="airplane-outline" size={23} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.detailTitle}>{trips.length} {trips.length === 1 ? 'trip' : 'trips'} saved</Text><Text style={s.copy}>Add Supabase when you want to sync with others.</Text></View></Card>
      {selectedTrip && <Pressable onPress={() => deleteTrip(selectedTrip.id)} style={({ pressed }) => [s.deleteRow, pressed && s.pressed]}><Ionicons name="trash-outline" size={19} color={colors.pink}/><Text style={s.deleteText}>Delete “{selectedTrip.title}”</Text></Pressable>}
    </Section>
    <Section title="Premium"><Card style={s.detailCard}><View style={s.premiumIcon}><Ionicons name="sparkles-outline" size={22} color={colors.purple}/></View><View style={{ flex: 1 }}><Text style={s.detailTitle}>Purchases are not configured</Text><Text style={s.copy}>Map and app features are open while App Store and RevenueCat are set up.</Text></View></Card></Section>
    <Sheet visible={open} title="Profile" onClose={() => setOpen(false)}><Field value={name} onChangeText={setName} placeholder="Your name"/><PrimaryButton title="Save" icon="checkmark" onPress={() => { saveProfile(name.trim()); setOpen(false); }}/></Sheet>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 72, paddingBottom: 42 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 22, backgroundColor: colors.blueSoft, borderColor: '#D9EAFF' },
  avatar: { height: 58, width: 58, borderRadius: 21, backgroundColor: colors.blueBright, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' }, name: { color: colors.text, fontSize: 19, fontWeight: '700', letterSpacing: -.4 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  editRow: { marginTop: 12, minHeight: 62, paddingHorizontal: 17, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  editIcon: { height: 37, width: 37, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  editText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' }, pressed: { opacity: .7 },
  detailCard: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  detailIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  premiumIcon: { height: 42, width: 42, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -.3 },
  deleteRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginTop: 3 },
  deleteText: { color: colors.pink, fontSize: 14, fontWeight: '600' },
});
