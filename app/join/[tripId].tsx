import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Field } from '@/src/forms';
import { readInvite } from '@/src/invites';
import { ensureGuestIdentity } from '@/src/lib/supabase';
import { colors } from '@/src/theme';
import { PrimaryButton } from '@/src/ui';
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
    <Text style={s.title}>{trip ? `Bli med på ${trip.title}` : 'Denne invitasjonen er ikke tilgjengelig'}</Text>
    {trip && <><Text style={s.copy}>{trip.city}, {trip.country} · {trip.startDate} – {trip.endDate}</Text><Text style={s.copy}>Skriv navnet ditt for å bli med på turen.</Text><Field value={name} onChangeText={setName} placeholder="Ditt navn"/><PrimaryButton title="Bli med på turen" icon="person-add-outline" onPress={join}/></>}
  </View>;
}

const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 96, gap: 18 }, eyebrow: { color: colors.teal, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' }, title: { color: colors.navy, fontSize: 40, fontWeight: '900', letterSpacing: -1.6, lineHeight: 45 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 25, marginBottom: 8 } });
