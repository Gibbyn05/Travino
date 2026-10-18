import { useState } from 'react';
import { DateField, Sheet } from './forms';
import { Trip, useTravel } from './store';
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
  return <Sheet visible title="Trip dates" onClose={onClose}>
    <DateField value={start} onChangeText={(value) => { setStart(value); if (end && end < value) setEnd(''); }} placeholder="Choose date" label="Departure"/>
    <DateField value={end} onChangeText={setEnd} placeholder="Choose date" label="Return" minDate={start} allowSameDay/>
    <PrimaryButton title="Save dates" icon="checkmark" disabled={!validTripDates(start, end)} onPress={save}/>
  </Sheet>;
}
