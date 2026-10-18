type DatedTrip = { id: string; startDate: string; endDate: string };

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
