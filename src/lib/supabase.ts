import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// The app keeps user-created data on-device until these public client values are supplied.
export const supabase = url && key ? createClient(url, key) : null;

/** Creates a scoped anonymous Supabase identity for a guest who joins by invite link. */
export async function ensureGuestIdentity() {
  if (!supabase) return null;
  const { data: current } = await supabase.auth.getSession();
  if (current.session) return current.session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}
