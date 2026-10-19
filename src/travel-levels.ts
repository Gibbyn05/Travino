export type LevelPerk = {
  id: string;
  title: string;
  detail: string;
  icon: string;
  placeholderAsset?: string;
};

export const TRAVEL_LEVELS = [
  { level: 1, title: 'Rookie Traveler', threshold: 0, frames: [{ id: 'classic', title: 'Classic blue', colors: ['#1670EF', '#B8D9FF'] }], perks: [] },
  { level: 2, title: 'Weekend Wanderer', threshold: 3, frames: [{ id: 'ocean', title: 'Ocean blue', colors: ['#1670EF', '#A4D9F5'] }, { id: 'sunset', title: 'Warm sunset', colors: ['#E48653', '#FFD39E'] }], perks: [{ id: 'frame-colours', title: 'Profile frame colours', detail: 'Choose a blue or warm frame colour.', icon: 'color-palette-outline' }] },
  { level: 3, title: 'Trail Finder', threshold: 5, frames: [{ id: 'trail', title: 'Trail green', colors: ['#4C8C67', '#C9E2BB'] }], perks: [{ id: 'stamp-pack-one', title: 'First stamp pack', detail: 'A small collection for your passport.', icon: 'map-outline', placeholderAsset: 'placeholder-passport-stamps-pack-one' }] },
  { level: 4, title: 'Road Tripper', threshold: 8, frames: [{ id: 'road', title: 'Road trip', colors: ['#9363EF', '#D8C5FF'] }], perks: [{ id: 'paper-styles', title: 'Memory book paper styles', detail: 'New quiet paper choices for your pages.', icon: 'document-text-outline', placeholderAsset: 'placeholder-memory-paper-styles' }] },
  { level: 5, title: 'Globe Trotter', threshold: 12, frames: [{ id: 'globe', title: 'Globe blue', colors: ['#0C768D', '#AEE2E7'] }], perks: [{ id: 'traveller-accessory', title: 'Traveller accessory', detail: 'Choose a travel hat or small accessory.', icon: 'bag-handle-outline', placeholderAsset: 'placeholder-traveller-accessories' }] },
  { level: 6, title: 'Passport Collector', threshold: 17, frames: [{ id: 'passport', title: 'Passport stamp', colors: ['#8C5B41', '#F1C79D'] }], perks: [{ id: 'stamp-pack-two', title: 'Second stamp pack', detail: 'More passport stamps for your journeys.', icon: 'map-outline', placeholderAsset: 'placeholder-passport-stamps-pack-two' }] },
  { level: 7, title: 'Horizon Chaser', threshold: 23, frames: [{ id: 'horizon', title: 'Horizon', colors: ['#C86C79', '#F3C7AC'] }], perks: [{ id: 'cover-styles', title: 'Memory book cover styles', detail: 'Extra cover looks for your shelves.', icon: 'book-outline', placeholderAsset: 'placeholder-memory-book-covers' }] },
  { level: 8, title: 'Seasoned Explorer', threshold: 30, frames: [{ id: 'seasoned', title: 'Moving horizon', colors: ['#6974C9', '#B5C8FF'], animated: true }], perks: [{ id: 'animated-frame', title: 'Animated profile frame', detail: 'A gentle moving frame that respects Reduce Motion.', icon: 'sparkles-outline' }] },
  { level: 9, title: 'World Wanderer', threshold: 40, frames: [{ id: 'world', title: 'Gold atlas', colors: ['#B8832E', '#F6DB8B'], gold: true }], perks: [{ id: 'gold-level-accents', title: 'Gold level accents', detail: 'A quiet gold touch around your level.', icon: 'ribbon-outline' }] },
  { level: 10, title: 'Legend of the Road', threshold: 50, frames: [{ id: 'legend', title: 'Legend of the Road', colors: ['#B8832E', '#FFE7A2'], gold: true, legend: true }], perks: [{ id: 'legend-badge', title: 'Legend of the Road badge', detail: 'Shown beside your name, including to friends.', icon: 'ribbon', placeholderAsset: 'placeholder-legend-road-badge' }] },
] as const;

export type TravelLevel = typeof TRAVEL_LEVELS[number];
export type ProfileFrame = (typeof TRAVEL_LEVELS)[number]['frames'][number];
export type LevelProgress = Pick<TravelLevel, 'level' | 'title' | 'threshold'> & { nextTitle: string | null; tripsLeft: number | null };
export type CompletionState = 'completed' | 'cancelled';
export type LevelActivity = { title?: string; date?: string; note?: string; location?: string };
export type LevelMemory = { date?: string; image?: string; caption?: string; text?: string };
export type LevelTrip = {
  id?: string;
  city?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  completedAt?: string;
  completionState?: CompletionState;
  activities?: LevelActivity[];
  memories?: LevelMemory[];
};

export const PROFILE_FRAMES = TRAVEL_LEVELS.flatMap((level) => level.frames.map((frame) => ({ ...frame, unlockLevel: level.level })));
export const LEVEL_PERKS = TRAVEL_LEVELS.flatMap((level) => level.perks.map((perk) => ({ ...perk, unlockLevel: level.level })));
export const TRAVELLER_ACCESSORIES = [
  { id: 'sun-hat', title: 'Sun hat', icon: 'partly-sunny-outline', placeholderAsset: 'placeholder-traveller-sun-hat' },
  { id: 'camera', title: 'Camera strap', icon: 'camera-outline', placeholderAsset: 'placeholder-traveller-camera-strap' },
  { id: 'daypack', title: 'Daypack', icon: 'bag-handle-outline', placeholderAsset: 'placeholder-traveller-daypack' },
] as const;

function localDate(value?: string) {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : dotted ? new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1])) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

const hasText = (value?: string) => Boolean(value?.trim());
const inRange = (date: Date | null, start: Date, end: Date) => Boolean(date && date.getTime() >= start.getTime() && date.getTime() <= end.getTime());
const activityHasContent = (activity: LevelActivity) => hasText(activity.title) || hasText(activity.note) || hasText(activity.location);
const memoryHasContent = (memory: LevelMemory) => hasText(memory.image) || hasText(memory.caption) || hasText(memory.text);
const tripOrder = (trip: LevelTrip) => localDate(trip.createdAt)?.getTime() ?? localDate(trip.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;

/**
 * The single, deterministic qualification rule for travel levels. `countedTrips`
 * is the older set already accepted by the caller, so overlapping journeys only
 * ever award one level credit.
 */
export function countsTowardLevel(trip: LevelTrip, countedTrips: LevelTrip[] = [], today = new Date()) {
  if (trip.completionState === 'cancelled') return false;
  const start = localDate(trip.startDate);
  const end = localDate(trip.endDate);
  if (!start || !end || end.getTime() <= start.getTime()) return false;
  if (!hasText(trip.city) && !hasText(trip.country)) return false;

  const day = new Date(today);
  day.setHours(0, 0, 0, 0);
  const passedEnd = end.getTime() < day.getTime();
  const completedAt = localDate(trip.completedAt);
  const completedAfterStarting = trip.completionState === 'completed' && Boolean(completedAt && completedAt.getTime() > start.getTime());
  if (!passedEnd && !completedAfterStarting) return false;

  const activities = trip.activities ?? [];
  const plannedActivityCount = activities.filter((activity) => hasText(activity.title)).length;
  const plannedDays = new Set(activities.filter(activityHasContent).map((activity) => localDate(activity.date)).filter((date): date is Date => inRange(date, start, end)).map((date) => date.getTime()));
  if (plannedActivityCount < 3 && plannedDays.size < 3) return false;

  const memoriesInTrip = (trip.memories ?? []).filter((memory) => inRange(localDate(memory.date), start, end));
  if (!memoriesInTrip.some(memoryHasContent)) return false;

  const createdAt = localDate(trip.createdAt);
  const photoCount = memoriesInTrip.filter((memory) => hasText(memory.image)).length;
  if (createdAt && createdAt.getTime() > end.getTime() && photoCount < 3) return false;

  return !countedTrips.some((older) => {
    const olderStart = localDate(older.startDate);
    const olderEnd = localDate(older.endDate);
    return olderStart && olderEnd && start.getTime() <= olderEnd.getTime() && olderStart.getTime() <= end.getTime();
  });
}

/** Counts only qualifying trips, oldest first, so overlapping dates are fair and predictable. */
export function completedTripCount(trips: LevelTrip[], today = new Date()) {
  const counted: LevelTrip[] = [];
  trips.map((trip, index) => ({ trip, index })).sort((a, b) => tripOrder(a.trip) - tripOrder(b.trip) || a.index - b.index).forEach(({ trip }) => {
    if (countsTowardLevel(trip, counted, today)) counted.push(trip);
  });
  return counted.length;
}

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
