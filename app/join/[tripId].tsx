import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Field } from '@/src/forms';
import { PrimaryButton } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';
import { ensureGuestIdentity } from '@/src/lib/supabase';
export default function JoinTrip() { const { tripId } = useLocalSearchParams<{ tripId: string }>(); const { trips, addMember, setSelectedTripId } = useTravel(); const [name, setName] = useState(''); const trip = trips.find((item) => item.id === tripId); const join = async () => { if (!trip || !name.trim()) return; await ensureGuestIdentity().catch(() => null); addMember(trip.id, name.trim()); setSelectedTripId(trip.id); router.replace('/trip'); }; return <View style={s.page}><Text style={s.eyebrow}>Reisefølge</Text><Text style={s.title}>{trip ? `Join ${trip.title}` : 'This invite is no longer available'}</Text>{trip && <><Text style={s.copy}>Enter your name to join this trip. You can create an account later.</Text><Field value={name} onChangeText={setName} placeholder="Your display name"/><PrimaryButton title="Join trip" icon="person-add-outline" onPress={join}/></>}</View>; }
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 96, gap: 15 }, eyebrow: { color: colors.teal, fontWeight: '800' }, title: { color: colors.navy, fontSize: 30, fontWeight: '800', letterSpacing: -1 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: 4 } });
