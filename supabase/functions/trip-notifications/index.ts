import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in is required.' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Supabase function secrets are not configured.' }, 500);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: userResult, error: authError } = await authClient.auth.getUser();
  if (authError || !userResult.user) return json({ error: 'Your session is no longer valid.' }, 401);
  const actorId = userResult.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  const event = body.event;
  const tripId = typeof body.tripId === 'string' ? body.tripId.trim().slice(0, 120) : '';
  const tripTitle = typeof body.tripTitle === 'string' ? body.tripTitle.trim().slice(0, 100) : '';
  const recipientId = typeof body.recipientId === 'string' ? body.recipientId.trim() : '';
  if (!['member_added', 'packing_assigned'].includes(String(event)) || !tripId || !tripTitle || !recipientId || recipientId === actorId) {
    return json({ error: 'A valid trip and another recipient are required.' }, 400);
  }

  const { data: friendship, error: friendshipError } = await admin.from('friendships').select('id').eq('status', 'accepted')
    .or(`and(requester_id.eq.${actorId},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${actorId})`).maybeSingle();
  if (friendshipError) return json({ error: friendshipError.message }, 500);
  if (!friendship) return json({ error: 'Notifications can only be sent to an accepted friend.' }, 403);

  if (event === 'member_added') {
    const profile = await admin.from('profiles').select('display_name').eq('id', recipientId).maybeSingle();
    if (profile.error) return json({ error: profile.error.message }, 500);
    const { error } = await admin.from('travel_trip_memberships').upsert({
      trip_id: tripId,
      owner_id: actorId,
      member_id: recipientId,
      display_name: profile.data?.display_name || 'Friend',
    }, { onConflict: 'trip_id,owner_id,member_id' });
    if (error) return json({ error: error.message }, 500);
  } else {
    const { data: membership, error } = await admin.from('travel_trip_memberships').select('trip_id')
      .eq('trip_id', tripId).eq('owner_id', actorId).eq('member_id', recipientId).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!membership) return json({ error: 'Add this friend to the trip before assigning them an item.' }, 403);
  }

  const itemTitle = typeof body.itemTitle === 'string' ? body.itemTitle.trim().slice(0, 100) : '';
  if (event === 'packing_assigned' && !itemTitle) return json({ error: 'An item name is required.' }, 400);
  const { data: devices, error: devicesError } = await admin.from('push_devices').select('expo_push_token').eq('user_id', recipientId);
  if (devicesError) return json({ error: devicesError.message }, 500);
  const tokens = (devices || []).map((device) => device.expo_push_token as string);
  if (!tokens.length) return json({ ok: true, pushSent: false, reason: 'no_registered_device' });

  const title = event === 'member_added' ? 'A new trip together' : 'Something to pack';
  const message = event === 'member_added'
    ? `You have been added to ${tripTitle}.`
    : `You have been assigned ${itemTitle} for ${tripTitle}.`;
  const messages = tokens.map((to) => ({ to, title, body: message, sound: 'default', data: { tripId, event } }));
  let pushSent = false;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!response.ok) return json({ error: `Expo push service returned ${response.status}.` }, 502);
    const result = await response.json();
    pushSent = Array.isArray(result.data) && result.data.some((ticket: { status?: string }) => ticket.status === 'ok');
  } catch { return json({ error: 'Could not reach the Expo push service.' }, 502); }
  return json({ ok: true, pushSent, reason: pushSent ? undefined : 'expo_rejected_token' });
});
