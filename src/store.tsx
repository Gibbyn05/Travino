import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { stockCoverForCountry } from './country-images';
import { ensureGuestIdentity, supabase } from './lib/supabase';
import storage from './lib/persistent-storage';
import { countryForTimeZone, destinationTimeZoneFor, deviceTimeZone } from './travel-info';

export type Activity = { id: string; title: string; date: string; startTime: string; endTime?: string; location?: string; note?: string; participants?: string[] };
export type PackingItem = { id: string; title: string; person?: string; category: string; done: boolean };
export type WishReaction = 'like' | 'meh' | 'dislike';
export type Wish = { id: string; name: string; category: string; location?: string; note?: string; link?: string; voted: boolean; reactions?: Record<string, { displayName: string; reaction: WishReaction }> };
// `caption` is deliberately separate from the older trip-note `text`: every
// photo can carry its own short scrapbook caption.
export type MemoryLayout = { x: number; y: number; scale: number; rotation: number };
// `bookPage` is a zero-based scrapbook page. Older memories without it keep
// their original two-photos-per-page layout until the owner moves or adds one.
export type Memory = { id: string; image: string; date: string; location?: string; text?: string; caption?: string; bookPage?: number; layout?: MemoryLayout };
export type MemoryBookVisibility = 'public' | 'private';
export type Trip = { id: string; sharedTripId?: string; title: string; city: string; country: string; destinationTimeZone?: string; startDate: string; endDate: string; members: string[]; memberAccountIds?: Record<string, string>; coverImage?: string; icon?: string; color?: string; reminderNotificationIds?: string[]; memoryBookVisibility?: MemoryBookVisibility; activities: Activity[]; packing: PackingItem[]; wishes: Wish[]; memories: Memory[] };
export type DraftTrip = Pick<Trip, 'title' | 'city' | 'country' | 'startDate' | 'endDate' | 'members' | 'coverImage'> & Partial<Pick<Trip, 'sharedTripId' | 'icon' | 'color' | 'destinationTimeZone'>>;
type StoredState = { profileName: string; profileBio?: string; homeTimeZone?: string; homeCountry?: string; premium: boolean; memoryBooksPublicByDefault: boolean; trips: Trip[]; selectedTripId?: string; onboarded: boolean };

const key = '@travino/state-v2';
const legacyKey = ['@reise', 'folge/state-v2'].join('');
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const memoryBookIsPublic = (trip: Pick<Trip, 'memoryBookVisibility'>, publicByDefault: boolean) => trip.memoryBookVisibility ? trip.memoryBookVisibility === 'public' : publicByDefault;
const memoryObjectPath = (memory: Memory, userId: string) => {
  const cleanUri = memory.image.split(/[?#]/)[0];
  const extension = (cleanUri.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  return `${userId}/${memory.id.replace(/[^a-z0-9_-]/gi, '_')}.${extension}`;
};
const defaultHomeTimeZone = deviceTimeZone();
const initial: StoredState = { profileName: '', homeTimeZone: defaultHomeTimeZone, homeCountry: countryForTimeZone(defaultHomeTimeZone), premium: false, memoryBooksPublicByDefault: false, trips: [], onboarded: true };
const stateFrom = (value: unknown): StoredState | null => {
  if (!value || typeof value !== 'object' || !Array.isArray((value as StoredState).trips)) return null;
  const state = value as StoredState;
  const homeTimeZone = state.homeTimeZone ?? defaultHomeTimeZone;
  return {
    ...initial,
    ...state,
    homeTimeZone,
    homeCountry: state.homeCountry ?? countryForTimeZone(homeTimeZone),
    trips: state.trips.map((trip) => ({ ...trip, destinationTimeZone: trip.destinationTimeZone ?? destinationTimeZoneFor(trip.city, trip.country), coverImage: stockCoverForCountry(trip.country) })),
  };
};
type Store = StoredState & { ready: boolean; selectedTrip?: Trip; setSelectedTripId: (id?: string) => void; saveProfile: (name: string, bio?: string) => void; createTrip: (draft: DraftTrip) => string; updateTrip: (id: string, patch: Partial<Trip>) => void; deleteTrip: (id: string) => void; addMember: (tripId: string, name: string, accountId?: string) => void; addActivity: (tripId: string, item: Omit<Activity, 'id'>) => void; updateActivity: (tripId: string, activityId: string, patch: Partial<Activity>) => void; removeActivity: (tripId: string, activityId: string) => void; addPacking: (tripId: string, item: Omit<PackingItem, 'id' | 'done'>) => void; togglePacking: (tripId: string, itemId: string) => void; removePacking: (tripId: string, itemId: string) => void; copyPacking: (fromTripId: string, toTripId: string, categories: string[]) => void; addWish: (tripId: string, item: Omit<Wish, 'id' | 'voted' | 'reactions'>) => void; toggleWish: (tripId: string, wishId: string) => void; setWishReaction: (tripId: string, wishId: string, voterId: string, displayName: string, reaction?: WishReaction) => void; removeWish: (tripId: string, wishId: string) => void; moveWishToPlan: (tripId: string, wishId: string) => void; addPhoto: (tripId: string, page?: number) => Promise<void>; setMemoryCaption: (tripId: string, memoryId: string, caption: string) => void; setMemoryLayout: (tripId: string, memoryId: string, layout: MemoryLayout) => void; removeMemory: (tripId: string, memoryId: string) => void; setMemoryBooksPublicByDefault: (isPublic: boolean) => void; setTripMemoryBookVisibility: (tripId: string, visibility?: MemoryBookVisibility) => void; syncMemoryBookPhotos: () => Promise<number>; setPremium: (premium: boolean) => void; markOnboarded: () => void };
const TravelContext = createContext<Store | null>(null);

async function syncMemoryPhoto(trip: Trip, memory: Memory, userId: string, bookPublic: boolean, contentType?: string) {
  if (!supabase) return false;
  const cleanUri = memory.image.split(/[?#]/)[0];
  const extension = (cleanUri.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const path = memoryObjectPath(memory, userId);
  try {
    const blob = await (await fetch(memory.image)).blob();
    const mime = contentType || (extension === 'jpg' ? 'image/jpeg' : `image/${extension}`);
    const { error: uploadError } = await supabase.storage.from('memory-book').upload(path, blob, { contentType: mime, upsert: true });
    if (uploadError) return false;
    const { error } = await supabase.from('memory_book_entries').upsert({ user_id: userId, object_path: path, trip_id: trip.id, trip_title: trip.title, city: memory.location || trip.city, country: trip.country, taken_on: memory.date, caption: memory.caption ?? memory.text ?? '', book_public: bookPublic }, { onConflict: 'object_path' });
    return !error;
  } catch { return false; }
}

async function syncMemoryBooks(trips: Trip[], publicByDefault: boolean) {
  if (!supabase) return 0;
  const user = await ensureGuestIdentity().catch(() => null);
  if (!user) return trips.reduce((total, trip) => total + trip.memories.length, 0);
  let failures = 0;
  for (const trip of trips) for (const memory of trip.memories) if (!await syncMemoryPhoto(trip, memory, user.id, memoryBookIsPublic(trip, publicByDefault))) failures += 1;
  return failures;
}

async function syncMemoryBookDefault(userId: string, isPublic: boolean) {
  if (!supabase) return;
  await supabase.from('profiles').update({ memory_book_public: isPublic }).eq('id', userId);
}

async function syncMemoryCaption(memory: Memory, userId: string) {
  if (!supabase) return;
  const path = memoryObjectPath(memory, userId);
  await supabase.from('memory_book_entries').update({ caption: memory.caption ?? '' }).eq('user_id', userId).eq('object_path', path);
}

async function removeMemoryFromCloud(memory: Memory, userId: string) {
  if (!supabase) return;
  const path = memoryObjectPath(memory, userId);
  await Promise.all([
    supabase.from('memory_book_entries').delete().eq('user_id', userId).eq('object_path', path),
    supabase.storage.from('memory-book').remove([path]),
  ]);
}

export function TravelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(initial); const [ready, setReady] = useState(false);
  const remoteWrites = useRef(Promise.resolve());
  useEffect(() => { let active = true; const load = async () => { let next = initial; try { const raw = await storage.getItem(key) || await storage.getItem(legacyKey); const local = raw ? stateFrom(JSON.parse(raw)) : null; if (local) next = local; } catch { /* Start with an empty state if the local cache is unreadable. */ } try { const client = supabase; if (client) { const user = await ensureGuestIdentity().catch(() => null); if (user) { const { data } = await client.from('travel_states').select('payload').eq('user_id', user.id).maybeSingle(); const remote = stateFrom(data?.payload); if (remote) next = remote; else await client.from('travel_states').upsert({ user_id: user.id, payload: next, updated_at: new Date().toISOString() }); } } } catch { /* The local state remains usable if the database is temporarily unavailable. */ } if (active) { setState(next); await storage.setItem(key, JSON.stringify(next)).catch(() => undefined); setReady(true); } }; load().catch(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  const persistRemote = (next: StoredState) => { const client = supabase; if (!client || !ready) return; remoteWrites.current = remoteWrites.current.catch(() => undefined).then(async () => { const user = await ensureGuestIdentity(); if (!user) return; const { error } = await client.from('travel_states').upsert({ user_id: user.id, payload: next, updated_at: new Date().toISOString() }); if (error) throw error; }).catch(() => undefined); };
  const change = (update: (current: StoredState) => StoredState) => setState((current) => { const next = update(current); storage.setItem(key, JSON.stringify(next)).catch(() => undefined); persistRemote(next); return next; });
  const updateTrip = (id: string, patch: Partial<Trip>) => change((s) => ({ ...s, trips: s.trips.map((trip) => trip.id === id ? { ...trip, ...patch } : trip) }));
  const selectedTrip = state.trips.find((trip) => trip.id === state.selectedTripId) ?? state.trips[0];
  const value = useMemo<Store>(() => ({ ...state, ready, selectedTrip,
    setSelectedTripId: (id) => change((s) => ({ ...s, selectedTripId: id })), saveProfile: (profileName, profileBio) => change((s) => ({ ...s, profileName, profileBio: profileBio ?? s.profileBio ?? '' })), setPremium: (premium) => change((s) => ({ ...s, premium })), markOnboarded: () => change((s) => ({ ...s, onboarded: true })),
    createTrip: (draft) => { const id = uid(); change((s) => { const trip: Trip = { ...draft, id, coverImage: stockCoverForCountry(draft.country), members: draft.members.filter(Boolean), activities: [], packing: [], wishes: [], memories: [] }; return { ...s, trips: [trip, ...s.trips], selectedTripId: id }; }); return id; },
    updateTrip, deleteTrip: (id) => change((s) => { const trips = s.trips.filter((trip) => trip.id !== id); return { ...s, trips, selectedTripId: s.selectedTripId === id ? trips[0]?.id : s.selectedTripId }; }), addMember: (tripId, name, accountId) => { const trip = state.trips.find((item) => item.id === tripId); if (trip && name.trim()) updateTrip(tripId, { members: trip.members.includes(name.trim()) ? trip.members : [...trip.members, name.trim()], memberAccountIds: accountId ? { ...trip.memberAccountIds, [name.trim()]: accountId } : trip.memberAccountIds }); },
    addActivity: (tripId, item) => updateTrip(tripId, { activities: [...(state.trips.find((trip) => trip.id === tripId)?.activities ?? []), { ...item, id: uid() }].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)) }), updateActivity: (tripId, activityId, patch) => updateTrip(tripId, { activities: (state.trips.find((trip) => trip.id === tripId)?.activities ?? []).map((item) => item.id === activityId ? { ...item, ...patch } : item) }), removeActivity: (tripId, activityId) => updateTrip(tripId, { activities: (state.trips.find((trip) => trip.id === tripId)?.activities ?? []).filter((item) => item.id !== activityId) }),
    addPacking: (tripId, item) => updateTrip(tripId, { packing: [...(state.trips.find((trip) => trip.id === tripId)?.packing ?? []), { ...item, id: uid(), done: false }] }), togglePacking: (tripId, itemId) => updateTrip(tripId, { packing: (state.trips.find((trip) => trip.id === tripId)?.packing ?? []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item) }), removePacking: (tripId, itemId) => updateTrip(tripId, { packing: (state.trips.find((trip) => trip.id === tripId)?.packing ?? []).filter((item) => item.id !== itemId) }),
    copyPacking: (fromTripId, toTripId, categories) => { const source = state.trips.find((trip) => trip.id === fromTripId); const target = state.trips.find((trip) => trip.id === toTripId); if (source && target) updateTrip(toTripId, { packing: [...target.packing, ...source.packing.filter((item) => categories.includes(item.category)).map((item) => ({ ...item, id: uid(), done: false }))] }); },
    addWish: (tripId, item) => updateTrip(tripId, { wishes: [...(state.trips.find((trip) => trip.id === tripId)?.wishes ?? []), { ...item, id: uid(), voted: false, reactions: {} }] }), toggleWish: (tripId, wishId) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).map((item) => item.id === wishId ? { ...item, voted: !item.voted } : item) }), setWishReaction: (tripId, wishId, voterId, displayName, reaction) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).map((item) => { if (item.id !== wishId) return item; const reactions = { ...(item.reactions ?? {}) }; if (reaction) reactions[voterId] = { displayName, reaction }; else delete reactions[voterId]; return { ...item, reactions }; }) }), removeWish: (tripId, wishId) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).filter((item) => item.id !== wishId) }), moveWishToPlan: (tripId, wishId) => { const wish = state.trips.find((trip) => trip.id === tripId)?.wishes.find((item) => item.id === wishId); if (wish) updateTrip(tripId, { activities: [...(state.trips.find((trip) => trip.id === tripId)?.activities ?? []), { id: uid(), title: wish.name, date: '', startTime: '', location: wish.location, note: wish.note }], wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).filter((item) => item.id !== wishId) }); },
    setMemoryCaption: (tripId, memoryId, caption) => {
      const trimmed = caption.slice(0, 180);
      const trip = state.trips.find((item) => item.id === tripId);
      const memory = trip?.memories.find((item) => item.id === memoryId);
      if (!trip || !memory || memory.caption === trimmed) return;
      const updated = { ...memory, caption: trimmed };
      updateTrip(tripId, { memories: trip.memories.map((item) => item.id === memoryId ? updated : item) });
      void ensureGuestIdentity().then((user) => user ? syncMemoryCaption(updated, user.id) : undefined).catch(() => undefined);
    },
    setMemoryLayout: (tripId, memoryId, layout) => {
      const trip = state.trips.find((item) => item.id === tripId);
      if (!trip) return;
      updateTrip(tripId, { memories: trip.memories.map((item) => item.id === memoryId ? { ...item, layout } : item) });
    },
    removeMemory: (tripId, memoryId) => {
      const trip = state.trips.find((item) => item.id === tripId);
      const memory = trip?.memories.find((item) => item.id === memoryId);
      if (!trip || !memory) return;
      updateTrip(tripId, { memories: trip.memories.filter((item) => item.id !== memoryId) });
      void ensureGuestIdentity().then((user) => user ? removeMemoryFromCloud(memory, user.id) : undefined).catch(() => undefined);
    },
    setMemoryBooksPublicByDefault: (isPublic) => {
      change((current) => ({ ...current, memoryBooksPublicByDefault: isPublic }));
      void ensureGuestIdentity().then(async (user) => {
        if (!user) return;
        await syncMemoryBookDefault(user.id, isPublic);
        await syncMemoryBooks(state.trips, isPublic);
      }).catch(() => undefined);
    },
    setTripMemoryBookVisibility: (tripId, visibility) => {
      const nextTrips = state.trips.map((trip) => trip.id === tripId ? { ...trip, memoryBookVisibility: visibility } : trip);
      change((current) => ({ ...current, trips: current.trips.map((trip) => trip.id === tripId ? { ...trip, memoryBookVisibility: visibility } : trip) }));
      void syncMemoryBooks(nextTrips, state.memoryBooksPublicByDefault).catch(() => undefined);
    },
    syncMemoryBookPhotos: () => syncMemoryBooks(state.trips, state.memoryBooksPublicByDefault),
    addPhoto: async (tripId, page = 0) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .8, allowsMultipleSelection: true, selectionLimit: 0 });
      if (result.canceled) return;
      const trip = state.trips.find((item) => item.id === tripId);
      const user = await ensureGuestIdentity().catch(() => null);
      let sharingFailures = 0;
      const addedMemories = await Promise.all(result.assets.map(async (asset) => {
        const memory: Memory = { id: uid(), image: asset.uri, date: new Date().toISOString().slice(0, 10), location: trip?.city, bookPage: page };
        // Keep the local copy usable offline and store a private cloud copy for
        // the owner's friends-only memory book when Supabase is enabled.
        if (supabase && user && trip) {
          if (!await syncMemoryPhoto(trip, memory, user.id, memoryBookIsPublic(trip, state.memoryBooksPublicByDefault), asset.mimeType || undefined)) sharingFailures += 1;
        }
        return memory;
      }));
      updateTrip(tripId, { memories: [...addedMemories, ...(state.trips.find((trip) => trip.id === tripId)?.memories ?? [])] });
      if (sharingFailures > 0) Alert.alert('Photos saved on this device', `${sharingFailures} ${sharingFailures === 1 ? 'photo could not' : 'photos could not'} be shared just yet. Try again when you are online.`);
    },
  }), [state, ready, selectedTrip]);
  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}
export const useTravel = () => { const value = useContext(TravelContext); if (!value) throw new Error('useTravel must be used inside TravelProvider'); return value; };
