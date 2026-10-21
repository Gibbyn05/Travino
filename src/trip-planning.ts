type DatedTrip = { id: string; startDate: string; endDate: string };
type CountdownTrip = DatedTrip & { completionState?: string };

/** Keep the current journey in view before counting down to a later one. */
export function daysTrip<T extends CountdownTrip>(trips: T[], selectedId?: string, now = new Date()): T | undefined {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const available = trips.filter(trip => !['completed', 'cancelled', 'canceled'].includes(trip.completionState ?? ''));
  const active = available.filter(trip => {
    const start = tripDate(trip.startDate), end = tripDate(trip.endDate);
    return start && end && start <= today && end >= today;
  });
  return active.find(trip => trip.id === selectedId) ?? active[0] ?? available.filter(trip => {
    const start = tripDate(trip.startDate), end = tripDate(trip.endDate);
    return start && start >= today && (!end || end >= start);
  }).sort((a, b) => tripDate(a.startDate)!.getTime() - tripDate(b.startDate)!.getTime())[0];
}

export function tripDayStatus(trip: Pick<DatedTrip, 'startDate' | 'endDate'>, now = new Date()): string {
  const start = tripDate(trip.startDate), end = tripDate(trip.endDate);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (!start) return 'Dates not set';
  const days = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (days > 0) return days === 1 ? '1 day to go' : `${days} days to go`;
  if (days === 0) return 'You leave today';
  if (!end || end < start) return 'Trip in progress';
  if (end < today) return 'Trip complete';
  const day = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1;
  const total = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return `Day ${day} of ${total}`;
}

/** Read stored dates as local calendar days, including older display formats. */
export function tripDate(value: string): Date | null {
  if (!value.trim()) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const parts = iso ? [+iso[1], +iso[2] - 1, +iso[3]] : dotted ? [+dotted[3], +dotted[2] - 1, +dotted[1]] : null;
  const parsed = parts ? new Date(parts[0], parts[1], parts[2]) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parts && (parsed.getFullYear() !== parts[0] || parsed.getMonth() !== parts[1] || parsed.getDate() !== parts[2])) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function isoTripDate(value: string): string {
  const date = tripDate(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
}

export function validTripDates(start: string, end: string): boolean {
  const departure = tripDate(start);
  const returning = tripDate(end);
  return Boolean(departure && returning && returning >= departure);
}

export function tripDateLabel(trip: Pick<DatedTrip, 'startDate' | 'endDate'>): string {
  const start = tripDate(trip.startDate);
  const end = tripDate(trip.endDate);
  if (!start || !end) return 'Dates not set yet';
  const format = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });
  return start.getTime() === end.getTime() ? format.format(start) : `${format.format(start)} – ${format.format(end)}`;
}

/** Keep completed trips in the library; guide the user to a trip still in planning. */
export function planningTrip<T extends DatedTrip>(trips: T[], selectedId?: string, now = new Date()): T | undefined {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const available = trips.filter(trip => !tripDate(trip.endDate) || tripDate(trip.endDate)! >= today);
  const selected = available.find(trip => trip.id === selectedId);
  if (selected) return selected;
  return available.slice().sort((a, b) => (tripDate(a.startDate)?.getTime() ?? Infinity) - (tripDate(b.startDate)?.getTime() ?? Infinity))[0];
}
