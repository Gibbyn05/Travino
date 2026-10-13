import * as ImagePicker from 'expo-image-picker';
import { createContext, ReactNode, useContext, useState } from 'react';

export type Activity = { id: string; title: string; time: string; duration: string; location: string; note: string; day: string };
export type PackingItem = { id: string; title: string; person: string; category: string; done: boolean };
export type Memory = { id: string; image: string; date: string; location: string; text: string };

const activitiesSeed: Activity[] = [
  { id: '1', title: 'Dykking', time: '10:00', duration: '10:00–12:00', location: 'Cala del Moraig', note: 'Ta med badetøy og håndkle', day: 'Torsdag 28. mai' },
  { id: '2', title: 'Stranddag', time: '13:30', duration: '13:30–16:30', location: 'Playa del Postiguet', note: 'Parasoll er bestilt', day: 'Torsdag 28. mai' },
  { id: '3', title: 'Middag ved havnen', time: '20:00', duration: '20:00–22:00', location: 'La Taberna del Gourmet', note: 'Bord for fire', day: 'Torsdag 28. mai' },
];

const packingSeed: PackingItem[] = [
  { id: '1', title: 'Lader', person: 'Fredrik', category: 'Elektronikk', done: false },
  { id: '2', title: 'Solkrem', person: 'Ingrid', category: 'Toalettmappe', done: false },
  { id: '3', title: 'Reisedokumenter', person: 'Fredrik', category: 'Før avreise', done: true },
  { id: '4', title: 'Badetøy', person: 'Alle', category: 'Klær', done: true },
];

const memorySeed: Memory[] = [
  { id: '1', image: 'https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=900&q=85', date: '28. mai 2026', location: 'Alicante', text: 'Første dukkert.' },
  { id: '2', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=85', date: '29. mai 2026', location: 'Altea', text: 'En lang lunsj i solen.' },
];

type Store = {
  premium: boolean; setPremium: (value: boolean) => void; activities: Activity[]; packing: PackingItem[];
  togglePacking: (id: string) => void; removeActivity: (id: string) => void; memories: Memory[]; addPhoto: () => Promise<void>;
  wishes: Record<string, boolean>; toggleWish: (id: string) => void;
};
const TravelContext = createContext<Store | null>(null);

export function TravelProvider({ children }: { children: ReactNode }) {
  const [premium, setPremium] = useState(false);
  const [activities, setActivities] = useState(activitiesSeed);
  const [packing, setPacking] = useState(packingSeed);
  const [memories, setMemories] = useState(memorySeed);
  const [wishes, setWishes] = useState<Record<string, boolean>>({ tapas: true, albir: false, tabarca: true });
  const togglePacking = (id: string) => setPacking((list) => list.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  const removeActivity = (id: string) => setActivities((list) => list.filter((item) => item.id !== id));
  const toggleWish = (id: string) => setWishes((current) => ({ ...current, [id]: !current[id] }));
  const addPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setMemories((list) => [{ id: String(Date.now()), image: result.assets[0].uri, date: 'I dag', location: 'Spania', text: 'Et nytt øyeblikk.' }, ...list]);
  };
  return <TravelContext.Provider value={{ premium, setPremium, activities, packing, togglePacking, removeActivity, memories, addPhoto, wishes, toggleWish }}>{children}</TravelContext.Provider>;
}
export const useTravel = () => {
  const context = useContext(TravelContext);
  if (!context) throw new Error('useTravel must be used inside TravelProvider');
  return context;
};
