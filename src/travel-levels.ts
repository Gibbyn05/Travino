export const TRAVEL_LEVELS = [
  { level: 1, title: 'Rookie Traveler', threshold: 0 },
  { level: 2, title: 'Weekend Wanderer', threshold: 3 },
  { level: 3, title: 'Trail Finder', threshold: 5 },
  { level: 4, title: 'Road Tripper', threshold: 8 },
  { level: 5, title: 'Globe Trotter', threshold: 12 },
  { level: 6, title: 'Passport Collector', threshold: 17 },
  { level: 7, title: 'Horizon Chaser', threshold: 23 },
  { level: 8, title: 'Seasoned Explorer', threshold: 30 },
  { level: 9, title: 'World Wanderer', threshold: 40 },
  { level: 10, title: 'Legend of the Road', threshold: 50 },
] as const;

export type TravelLevel = typeof TRAVEL_LEVELS[number];
export type LevelProgress = TravelLevel & { nextTitle: string | null; tripsLeft: number | null };

/** The whole level system is derived from completed trips, never from points. */
export function levelForCompletedTrips(completedTrips: number): LevelProgress {
  const count = Math.max(0, Math.floor(Number.isFinite(completedTrips) ? completedTrips : 0));
  const current = [...TRAVEL_LEVELS].reverse().find((entry) => count >= entry.threshold) ?? TRAVEL_LEVELS[0];
  const next = TRAVEL_LEVELS.find((entry) => entry.level === current.level + 1);
  return { ...current, nextTitle: next?.title ?? null, tripsLeft: next ? Math.max(0, next.threshold - count) : null };
}

export type CompletionState = 'completed' | 'cancelled';
export type CompletionTrip = { endDate?: string; completionState?: CompletionState };

function localDate(value?: string) {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : dotted ? new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1])) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isCompletedTrip(trip: CompletionTrip, today = new Date()) {
  if (trip.completionState === 'cancelled') return false;
  if (trip.completionState === 'completed') return true;
  const end = localDate(trip.endDate);
  if (!end) return false;
  const day = new Date(today);
  day.setHours(0, 0, 0, 0);
  return end.getTime() < day.getTime();
}

export function completedTripCount(trips: CompletionTrip[], today = new Date()) {
  return trips.filter((trip) => isCompletedTrip(trip, today)).length;
}
