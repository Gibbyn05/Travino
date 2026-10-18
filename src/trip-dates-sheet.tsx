import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { DateField, Sheet } from './forms';
import { Trip, useTravel } from './store';
import { colors } from './theme';
import { isoTripDate, validTripDates } from './trip-planning';
import { PrimaryButton } from './ui';

export function TripDatesSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { updateTrip } = useTravel();
  const [start, setStart] = useState(isoTripDate(trip.startDate));
  const [end, setEnd] = useState(isoTripDate(trip.endDate));
  const save = () => {
    if (!validTripDates(start, end)) return;
    updateTrip(trip.id, { startDate: start, endDate: end });
    onClose();
  };
  return <Sheet visible title="Your travel dates" onClose={onClose}>
    <Text style={s.copy}>When are you heading to {trip.city}?</Text>
    <DateField value={start} onChangeText={(value) => { setStart(value); if (end && end < value) setEnd(''); }} placeholder="Departure date"/>
    <DateField value={end} onChangeText={setEnd} placeholder="Return date" minDate={start} allowSameDay/>
    <PrimaryButton title="Save dates" icon="checkmark" disabled={!validTripDates(start, end)} onPress={save}/>
  </Sheet>;
}

const s = StyleSheet.create({ copy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 18 } });
