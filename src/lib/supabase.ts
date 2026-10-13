import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// UI uses local demo data until these public client values are supplied.
export const supabase = url && key ? createClient(url, key) : null;
