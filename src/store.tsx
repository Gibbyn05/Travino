import AsyncStorage from 'expo-sqlite/kv-store';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { stockCoverForCountry } from './country-images';
import { ensureGuestIdentity, supabase } from './lib/supabase';
import { registerForPushNotifications } from './notifications';

export type Activity = { id: string; title: string; date: string; startTime: string; endTime?: string; location?: string; note?: string; participants?: string[] };
export type PackingItem = { id: string; title: string; person?: string; category: string; done: boolean };
export type Wish = { id: string; name: string; category: string; location?: string; note?: string; link?: string; voted: boolean };
export type Memory = { id: string; image: string; date: string; location?: string; text?: string };
export type Trip = { id: string; title: string; city: string; country: string; startDate: string; endDate: string; members: string[]; memberAccountIds?: Record<string, string>; coverImage?: string; activities: Activity[]; packing: PackingItem[]; wishes: Wish[]; memories: Memory[] };
export type DraftTrip = Pick<Trip, 'title' | 'city' | 'country' | 'startDate' | 'endDate' | 'members' | 'coverImage'>;
type StoredState = { profileName: string; profileBio?: string; premium: boolean; trips: Trip[]; selectedTripId?: string; onboarded: boolean };

const key = '@reisefolge/state-v2'; const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const demoTrip: Trip = { id: 'spain-2026', title: 'Spain 2026', city: 'Alicante', country: 'Spain', startDate: '18 June 2026', endDate: '26 June 2026', members: ['Fredrik', 'Mia'], activities: [{ id: 'diving', title: 'Diving', date: '19 June 2026', startTime: '10:00', endTime: '12:00', location: 'Cala del Moraig', note: 'Bring swimwear and a towel', participants: ['Fredrik', 'Mia'] }, { id: 'dinner', title: 'Dinner by the harbour', date: '19 June 2026', startTime: '20:00', endTime: '22:00', location: 'Alicante Marina', note: 'Table for two' }], packing: [{ id: 'charger', title: 'Charger', person: 'Fredrik', category: 'Electronics', done: false }, { id: 'sunscreen', title: 'Sunscreen', person: 'Mia', category: 'Toiletries', done: false }, { id: 'passport', title: 'Passport', person: 'Fredrik', category: 'Before leaving home', done: true }], wishes: [{ id: 'tapas', name: 'Tapas at El Portal', category: 'Restaurant', location: 'Alicante', note: 'Ask for an outdoor table', voted: true }], memories: [] };
const initial: StoredState = { profileName: 'Fredrik', premium: false, trips: [demoTrip], selectedTripId: demoTrip.id, onboarded: true };
const stateFrom = (value: unknown): StoredState | null => { if (!value || typeof value !== 'object' || !Array.isArray((value as StoredState).trips)) return null; return { ...initial, ...(value as StoredState) }; };
type Store = StoredState & { ready: boolean; selectedTrip?: Trip; setSelectedTripId: (id?: string) => void; saveProfile: (name: string, bio?: string) => void; createTrip: (draft: DraftTrip) => string; updateTrip: (id: string, patch: Partial<Trip>) => void; deleteTrip: (id: string) => void; addMember: (tripId: string, name: string, accountId?: string) => void; addActivity: (tripId: string, item: Omit<Activity, 'id'>) => void; updateActivity: (tripId: string, activityId: string, patch: Partial<Activity>) => void; removeActivity: (tripId: string, activityId: string) => void; addPacking: (tripId: string, item: Omit<PackingItem, 'id' | 'done'>) => void; togglePacking: (tripId: string, itemId: string) => void; removePacking: (tripId: string, itemId: string) => void; copyPacking: (fromTripId: string, toTripId: string, categories: string[]) => void; addWish: (tripId: string, item: Omit<Wish, 'id' | 'voted'>) => void; toggleWish: (tripId: string, wishId: string) => void; removeWish: (tripId: string, wishId: string) => void; moveWishToPlan: (tripId: string, wishId: string) => void; addPhoto: (tripId: string) => Promise<void>; syncMemoryBookPhotos: () => Promise<number>; setPremium: (premium: boolean) => void; markOnboarded: () => void };
const TravelContext = createContext<Store | null>(null);

async function syncMemoryPhoto(trip: Trip, memory: Memory, userId: string, contentType?: string) {
  if (!supabase) return false;
  const cleanUri = memory.image.split(/[?#]/)[0];
  const extension = (cleanUri.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const path = `${userId}/${memory.id.replace(/[^a-z0-9_-]/gi, '_')}.${extension}`;
  try {
    const blob = await (await fetch(memory.image)).blob();
    const mime = contentType || (extension === 'jpg' ? 'image/jpeg' : `image/${extension}`);
    const { error: uploadError } = await supabase.storage.from('memory-book').upload(path, blob, { contentType: mime, upsert: true });
    if (uploadError) return false;
    const { error } = await supabase.from('memory_book_entries').upsert({ user_id: userId, object_path: path, trip_title: trip.title, city: memory.location || trip.city, country: trip.country, taken_on: memory.date, caption: memory.text || '' }, { onConflict: 'object_path' });
    return !error;
  } catch { return false; }
}

export function TravelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(initial); const [ready, setReady] = useState(false);
  const remoteWrites = useRef(Promise.resolve());
  useEffect(() => { let active = true; const load = async () => { let next = initial; try { const raw = await AsyncStorage.getItem(key); const local = raw ? stateFrom(JSON.parse(raw)) : null; if (local) next = local; } catch { /* Start with an empty state if the local cache is unreadable. */ } try { const client = supabase; if (client) { const user = await ensureGuestIdentity().catch(() => null); if (user) { const { data } = await client.from('travel_states').select('payload').eq('user_id', user.id).maybeSingle(); const remote = stateFrom(data?.payload); if (remote) next = remote; else await client.from('travel_states').upsert({ user_id: user.id, payload: next, updated_at: new Date().toISOString() }); } } } catch { /* The local state remains usable if the database is temporarily unavailable. */ } if (active) { setState(next); await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined); setReady(true); } }; load().catch(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!ready || !state.onboarded || !supabase) return;
    registerForPushNotifications().catch(() => undefined);
  }, [ready, state.onboarded]);
  const persistRemote = (next: StoredState) => { const client = supabase; if (!client || !ready) return; remoteWrites.current = remoteWrites.current.catch(() => undefined).then(async () => { const user = await ensureGuestIdentity(); if (!user) return; const { error } = await client.from('travel_states').upsert({ user_id: user.id, payload: next, updated_at: new Date().toISOString() }); if (error) throw error; }).catch(() => undefined); };
  const change = (update: (current: StoredState) => StoredState) => setState((current) => { const next = update(current); AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined); persistRemote(next); return next; });
  const updateTrip = (id: string, patch: Partial<Trip>) => change((s) => ({ ...s, trips: s.trips.map((trip) => trip.id === id ? { ...trip, ...patch } : trip) }));
  const selectedTrip = state.trips.find((trip) => trip.id === state.selectedTripId) ?? state.trips[0];
  const value = useMemo<Store>(() => ({ ...state, ready, selectedTrip,
    setSelectedTripId: (id) => change((s) => ({ ...s, selectedTripId: id })), saveProfile: (profileName, profileBio) => change((s) => ({ ...s, profileName, profileBio: profileBio ?? s.profileBio ?? '' })), setPremium: (premium) => change((s) => ({ ...s, premium })), markOnboarded: () => change((s) => ({ ...s, onboarded: true })),
    createTrip: (draft) => { const id = uid(); change((s) => { const trip: Trip = { ...draft, id, coverImage: draft.coverImage || stockCoverForCountry(draft.country), members: draft.members.filter(Boolean), activities: [], packing: [], wishes: [], memories: [] }; return { ...s, trips: [trip, ...s.trips], selectedTripId: id }; }); return id; },
    updateTrip, deleteTrip: (id) => change((s) => { const trips = s.trips.filter((trip) => trip.id !== id); return { ...s, trips, selectedTripId: s.selectedTripId === id ? trips[0]?.id : s.selectedTripId }; }), addMember: (tripId, name, accountId) => { const trip = state.trips.find((item) => item.id === tripId); if (trip && name.trim()) updateTrip(tripId, { members: trip.members.includes(name.trim()) ? trip.members : [...trip.members, name.trim()], memberAccountIds: accountId ? { ...trip.memberAccountIds, [name.trim()]: accountId } : trip.memberAccountIds }); },
    addActivity: (tripId, item) => updateTrip(tripId, { activities: [...(state.trips.find((trip) => trip.id === tripId)?.activities ?? []), { ...item, id: uid() }].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)) }), updateActivity: (tripId, activityId, patch) => updateTrip(tripId, { activities: (state.trips.find((trip) => trip.id === tripId)?.activities ?? []).map((item) => item.id === activityId ? { ...item, ...patch } : item) }), removeActivity: (tripId, activityId) => updateTrip(tripId, { activities: (state.trips.find((trip) => trip.id === tripId)?.activities ?? []).filter((item) => item.id !== activityId) }),
    addPacking: (tripId, item) => updateTrip(tripId, { packing: [...(state.trips.find((trip) => trip.id === tripId)?.packing ?? []), { ...item, id: uid(), done: false }] }), togglePacking: (tripId, itemId) => updateTrip(tripId, { packing: (state.trips.find((trip) => trip.id === tripId)?.packing ?? []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item) }), removePacking: (tripId, itemId) => updateTrip(tripId, { packing: (state.trips.find((trip) => trip.id === tripId)?.packing ?? []).filter((item) => item.id !== itemId) }),
    copyPacking: (fromTripId, toTripId, categories) => { const source = state.trips.find((trip) => trip.id === fromTripId); const target = state.trips.find((trip) => trip.id === toTripId); if (source && target) updateTrip(toTripId, { packing: [...target.packing, ...source.packing.filter((item) => categories.includes(item.category)).map((item) => ({ ...item, id: uid(), done: false }))] }); },
    addWish: (tripId, item) => updateTrip(tripId, { wishes: [...(state.trips.find((trip) => trip.id === tripId)?.wishes ?? []), { ...item, id: uid(), voted: false }] }), toggleWish: (tripId, wishId) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).map((item) => item.id === wishId ? { ...item, voted: !item.voted } : item) }), removeWish: (tripId, wishId) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).filter((item) => item.id !== wishId) }), moveWishToPlan: (tripId, wishId) => { const wish = state.trips.find((trip) => trip.id === tripId)?.wishes.find((item) => item.id === wishId); if (wish) updateTrip(tripId, { activities: [...(state.trips.find((trip) => trip.id === tripId)?.activities ?? []), { id: uid(), title: wish.name, date: '', startTime: '', location: wish.location, note: wish.note }], wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).filter((item) => item.id !== wishId) }); },
    syncMemoryBookPhotos: async () => {
      const client = supabase;
      if (!client) return 0;
      const user = await ensureGuestIdentity().catch(() => null);
      if (!user) return state.trips.reduce((total, trip) => total + trip.memories.length, 0);
      let failures = 0;
      for (const trip of state.trips) for (const memory of trip.memories) if (!await syncMemoryPhoto(trip, memory, user.id)) failures += 1;
      return failures;
    },
    addPhoto: async (tripId) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .8, allowsMultipleSelection: true, selectionLimit: 0 });
      if (result.canceled) return;
      const trip = state.trips.find((item) => item.id === tripId);
      const user = await ensureGuestIdentity().catch(() => null);
      let sharingFailures = 0;
      const addedMemories = await Promise.all(result.assets.map(async (asset) => {
        const memory = { id: uid(), image: asset.uri, date: new Date().toISOString().slice(0, 10), location: trip?.city };
        // Keep the local copy usable offline and store a private cloud copy for
        // the owner's friends-only memory book when Supabase is enabled.
        if (supabase && user && trip) {
          if (!await syncMemoryPhoto(trip, memory, user.id, asset.mimeType || undefined)) sharingFailures += 1;
        }
        return memory;
      }));
      updateTrip(tripId, { memories: [...addedMemories, ...(state.trips.find((trip) => trip.id === tripId)?.memories ?? [])] });
      if (sharingFailures > 0) Alert.alert('Photos saved on this device', `${sharingFailures} ${sharingFailures === 1 ? 'photo could not' : 'photos could not'} be added to your shared memory book. Check your connection and that the latest Supabase migration has been applied.`);
    },
  }), [state, ready, selectedTrip]);
  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}
export const useTravel = () => { const value = useContext(TravelContext); if (!value) throw new Error('useTravel must be used inside TravelProvider'); return value; };
