import { createClient } from '@supabase/supabase-js';
import storage from './persistent-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Native builds use SQLite while web uses localStorage. Keeping this platform
// adapter outside the shared module prevents Metro from bundling SQLite WASM for web.
export const supabase = url && key ? createClient(url, key, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;

/** Creates a scoped anonymous Supabase identity for a guest who joins by invite link. */
export async function ensureGuestIdentity() {
  if (!supabase) return null;
  const { data: current } = await supabase.auth.getSession();
  if (current.session) return current.session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}
