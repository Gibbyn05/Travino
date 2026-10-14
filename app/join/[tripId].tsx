import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Field } from '@/src/forms';
import { readInvite } from '@/src/invites';
import { ensureGuestIdentity } from '@/src/lib/supabase';
import { colors } from '@/src/theme';
import { AccentText, PrimaryButton } from '@/src/ui';
import { useTravel } from '@/src/store';

export default function JoinTrip() {
  const { tripId, invite: rawInvite } = useLocalSearchParams<{ tripId: string; invite?: string }>();
  const { trips, addMember, createTrip, setSelectedTripId } = useTravel();
  const [name, setName] = useState('');
  const localTrip = trips.find((item) => item.id === tripId);
  const sharedTrip = useMemo(() => readInvite(rawInvite), [rawInvite]);
  const trip = localTrip ?? sharedTrip;
  const join = async () => {
    if (!trip || !name.trim()) return;
    await ensureGuestIdentity().catch(() => null);
    if (localTrip) {
      addMember(localTrip.id, name.trim());
      setSelectedTripId(localTrip.id);
    } else {
      const id = createTrip({ ...sharedTrip!, members: [...sharedTrip!.members, name.trim()] });
      setSelectedTripId(id);
    }
    router.replace('/trip');
  };
  return <View style={s.page}>
    <Text style={s.eyebrow}>Reisefølge</Text>
    <AccentText text={trip ? `Join ${trip.title}` : 'This invite is unavailable'} style={s.title}/>
    {trip && <><Text style={s.copy}>{trip.city}, {trip.country} · {trip.startDate} – {trip.endDate}</Text><Text style={s.copy}>Enter your name to join the trip.</Text><Field value={name} onChangeText={setName} placeholder="Your name"/><PrimaryButton title="Join trip" icon="person-add-outline" onPress={join}/></>}
  </View>;
}

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 96, gap: 18 }, eyebrow: { color: colors.blue, fontSize: 13, fontWeight: '600' }, title: { color: colors.text, fontSize: 36, fontWeight: '700', letterSpacing: -1.6, lineHeight: 42 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 25, marginBottom: 8 } });
