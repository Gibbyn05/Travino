export const TRAVEL_LEVELS = [
  { level: 1, title: 'Rookie Traveler', threshold: 0, frames: [{ id: 'classic', title: 'Classic blue', colors: ['#1670EF', '#B8D9FF'] }] },
  { level: 2, title: 'Weekend Wanderer', threshold: 3, frames: [{ id: 'ocean', title: 'Ocean blue', colors: ['#1670EF', '#A4D9F5'] }, { id: 'sunset', title: 'Warm sunset', colors: ['#E48653', '#FFD39E'] }] },
  { level: 3, title: 'Trail Finder', threshold: 5, frames: [{ id: 'trail', title: 'Trail green', colors: ['#4C8C67', '#C9E2BB'] }] },
  { level: 4, title: 'Road Tripper', threshold: 8, frames: [{ id: 'road', title: 'Road trip', colors: ['#9363EF', '#D8C5FF'] }] },
  { level: 5, title: 'Globe Trotter', threshold: 12, frames: [{ id: 'globe', title: 'Globe blue', colors: ['#0C768D', '#AEE2E7'] }] },
  { level: 6, title: 'Passport Collector', threshold: 17, frames: [{ id: 'passport', title: 'Passport stamp', colors: ['#8C5B41', '#F1C79D'] }] },
  { level: 7, title: 'Horizon Chaser', threshold: 23, frames: [{ id: 'horizon', title: 'Horizon', colors: ['#C86C79', '#F3C7AC'] }] },
  { level: 8, title: 'Seasoned Explorer', threshold: 30, frames: [{ id: 'seasoned', title: 'Moving horizon', colors: ['#6974C9', '#B5C8FF'], animated: true }] },
  { level: 9, title: 'World Wanderer', threshold: 40, frames: [{ id: 'world', title: 'Gold atlas', colors: ['#B8832E', '#F6DB8B'], gold: true }] },
  { level: 10, title: 'Legend of the Road', threshold: 50, frames: [{ id: 'legend', title: 'Legend of the Road', colors: ['#B8832E', '#FFE7A2'], gold: true, legend: true }] },
] as const;

export type TravelLevel = typeof TRAVEL_LEVELS[number];
export type ProfileFrame = (typeof TRAVEL_LEVELS)[number]['frames'][number];
export type LevelProgress = Pick<TravelLevel, 'level' | 'title' | 'threshold'> & { nextTitle: string | null; tripsLeft: number | null };

export const PROFILE_FRAMES = TRAVEL_LEVELS.flatMap((level) => level.frames.map((frame) => ({ ...frame, unlockLevel: level.level })));

/** The whole level system is derived from completed trips, never from points. */
export function levelForCompletedTrips(completedTrips: number): LevelProgress {
  const count = Math.max(0, Math.floor(Number.isFinite(completedTrips) ? completedTrips : 0));
  const current = [...TRAVEL_LEVELS].reverse().find((entry) => count >= entry.threshold) ?? TRAVEL_LEVELS[0];
  const next = TRAVEL_LEVELS.find((entry) => entry.level === current.level + 1);
  return { level: current.level, title: current.title, threshold: current.threshold, nextTitle: next?.title ?? null, tripsLeft: next ? Math.max(0, next.threshold - count) : null };
}

/** Keeps an earlier unlocked frame if someone picked it, otherwise uses the current level's frame. */
export function frameForProfile(level: number, selectedFrameId?: string) {
  const unlocked = PROFILE_FRAMES.filter((frame) => frame.unlockLevel <= level);
  return unlocked.find((frame) => frame.id === selectedFrameId) ?? unlocked[unlocked.length - 1] ?? PROFILE_FRAMES[0];
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
