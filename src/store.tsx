import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Activity = { id: string; title: string; date: string; startTime: string; endTime?: string; location?: string; note?: string };
export type PackingItem = { id: string; title: string; person?: string; category: string; done: boolean };
export type Wish = { id: string; name: string; category: string; location?: string; note?: string; voted: boolean };
export type Memory = { id: string; image: string; date: string; location?: string; text?: string };
export type Trip = { id: string; title: string; city: string; country: string; startDate: string; endDate: string; members: string[]; coverImage?: string; activities: Activity[]; packing: PackingItem[]; wishes: Wish[]; memories: Memory[] };
export type DraftTrip = Pick<Trip, 'title' | 'city' | 'country' | 'startDate' | 'endDate' | 'members'>;
type StoredState = { profileName: string; premium: boolean; trips: Trip[]; selectedTripId?: string; onboarded: boolean };

const key = '@reisefolge/state-v1'; const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const initial: StoredState = { profileName: '', premium: false, trips: [], onboarded: false };
type Store = StoredState & { ready: boolean; selectedTrip?: Trip; setSelectedTripId: (id?: string) => void; saveProfile: (name: string) => void; createTrip: (draft: DraftTrip) => void; updateTrip: (id: string, patch: Partial<Trip>) => void; deleteTrip: (id: string) => void; addActivity: (tripId: string, item: Omit<Activity, 'id'>) => void; removeActivity: (tripId: string, activityId: string) => void; addPacking: (tripId: string, item: Omit<PackingItem, 'id' | 'done'>) => void; togglePacking: (tripId: string, itemId: string) => void; removePacking: (tripId: string, itemId: string) => void; addWish: (tripId: string, item: Omit<Wish, 'id' | 'voted'>) => void; toggleWish: (tripId: string, wishId: string) => void; removeWish: (tripId: string, wishId: string) => void; addPhoto: (tripId: string) => Promise<void>; setPremium: (premium: boolean) => void; markOnboarded: () => void };
const TravelContext = createContext<Store | null>(null);

export function TravelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(initial); const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(key).then((raw) => { if (raw) setState({ ...initial, ...JSON.parse(raw) }); }).catch(() => undefined).finally(() => setReady(true)); }, []);
  const change = (update: (current: StoredState) => StoredState) => setState((current) => { const next = update(current); AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => undefined); return next; });
  const updateTrip = (id: string, patch: Partial<Trip>) => change((s) => ({ ...s, trips: s.trips.map((trip) => trip.id === id ? { ...trip, ...patch } : trip) }));
  const selectedTrip = state.trips.find((trip) => trip.id === state.selectedTripId) ?? state.trips[0];
  const value = useMemo<Store>(() => ({ ...state, ready, selectedTrip,
    setSelectedTripId: (id) => change((s) => ({ ...s, selectedTripId: id })), saveProfile: (profileName) => change((s) => ({ ...s, profileName })), setPremium: (premium) => change((s) => ({ ...s, premium })), markOnboarded: () => change((s) => ({ ...s, onboarded: true })),
    createTrip: (draft) => change((s) => { const id = uid(); const trip: Trip = { ...draft, id, members: draft.members.filter(Boolean), activities: [], packing: [], wishes: [], memories: [] }; return { ...s, trips: [trip, ...s.trips], selectedTripId: id }; }),
    updateTrip, deleteTrip: (id) => change((s) => { const trips = s.trips.filter((trip) => trip.id !== id); return { ...s, trips, selectedTripId: s.selectedTripId === id ? trips[0]?.id : s.selectedTripId }; }),
    addActivity: (tripId, item) => updateTrip(tripId, { activities: [...(state.trips.find((trip) => trip.id === tripId)?.activities ?? []), { ...item, id: uid() }] }), removeActivity: (tripId, activityId) => updateTrip(tripId, { activities: (state.trips.find((trip) => trip.id === tripId)?.activities ?? []).filter((item) => item.id !== activityId) }),
    addPacking: (tripId, item) => updateTrip(tripId, { packing: [...(state.trips.find((trip) => trip.id === tripId)?.packing ?? []), { ...item, id: uid(), done: false }] }), togglePacking: (tripId, itemId) => updateTrip(tripId, { packing: (state.trips.find((trip) => trip.id === tripId)?.packing ?? []).map((item) => item.id === itemId ? { ...item, done: !item.done } : item) }), removePacking: (tripId, itemId) => updateTrip(tripId, { packing: (state.trips.find((trip) => trip.id === tripId)?.packing ?? []).filter((item) => item.id !== itemId) }),
    addWish: (tripId, item) => updateTrip(tripId, { wishes: [...(state.trips.find((trip) => trip.id === tripId)?.wishes ?? []), { ...item, id: uid(), voted: false }] }), toggleWish: (tripId, wishId) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).map((item) => item.id === wishId ? { ...item, voted: !item.voted } : item) }), removeWish: (tripId, wishId) => updateTrip(tripId, { wishes: (state.trips.find((trip) => trip.id === tripId)?.wishes ?? []).filter((item) => item.id !== wishId) }),
    addPhoto: async (tripId) => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return; const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .8 }); if (!result.canceled) updateTrip(tripId, { memories: [{ id: uid(), image: result.assets[0].uri, date: new Date().toISOString().slice(0, 10) }, ...(state.trips.find((trip) => trip.id === tripId)?.memories ?? [])] }); },
  }), [state, ready, selectedTrip]);
  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}
export const useTravel = () => { const value = useContext(TravelContext); if (!value) throw new Error('useTravel must be used inside TravelProvider'); return value; };
