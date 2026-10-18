import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, Sheet } from './forms';
import { Trip, useTravel } from './store';
import { colors } from './theme';
import { tripColors, tripIcons, tripPresentation } from './trip-presentation';
import { PrimaryButton } from './ui';

/** Keep personalisation available after creation, without adding setup steps. */
export function TripDetailsSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { updateTrip } = useTravel();
  const presentation = tripPresentation(trip);
  const [title, setTitle] = useState(trip.title);
  const [color, setColor] = useState<string>(presentation.color);
  const [icon, setIcon] = useState<string>(presentation.icon);
  return <Sheet visible title="Make it yours" onClose={onClose}>
    <Field value={title} onChangeText={setTitle} placeholder="Trip name"/>
    <Text style={s.label}>Trip colour</Text>
    <View style={s.choices}>{tripColors.map(choice => <Pressable key={choice} accessibilityRole="button" accessibilityLabel={`Choose colour ${choice}`} accessibilityState={{ selected: color === choice }} onPress={() => setColor(choice)} style={[s.choice, { backgroundColor: choice }]}>{color === choice && <Ionicons name="checkmark" size={20} color="#FFFFFF"/>}</Pressable>)}</View>
    <Text style={s.label}>Trip icon</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choices}>{tripIcons.map(choice => <Pressable key={choice} accessibilityRole="button" accessibilityLabel={`Choose ${choice} icon`} accessibilityState={{ selected: icon === choice }} onPress={() => setIcon(choice)} style={[s.choice, { backgroundColor: icon === choice ? color : colors.blueSoft }]}><Ionicons name={choice} size={22} color={icon === choice ? '#FFFFFF' : colors.muted}/></Pressable>)}</ScrollView>
    <PrimaryButton title="Save trip details" icon="checkmark" disabled={!title.trim()} onPress={() => { if (!title.trim()) return; updateTrip(trip.id, { title: title.trim(), color, icon }); onClose(); }}/>
  </Sheet>;
}

const s = StyleSheet.create({ label: { color: colors.muted, fontSize: 13, fontWeight: '600', marginBottom: 10 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 }, choice: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' } });
