import { createClient } from '@supabase/supabase-js';
import AsyncStorage from 'expo-sqlite/kv-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Expo's SQLite-backed key-value store works inside Expo Go and keeps the
// anonymous session when the app is restarted.
export const supabase = url && key ? createClient(url, key, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;

/** Creates a scoped anonymous Supabase identity for a guest who joins by invite link. */
export async function ensureGuestIdentity() {
  if (!supabase) return null;
  const { data: current } = await supabase.auth.getSession();
  if (current.session) return current.session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}
