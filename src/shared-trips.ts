import { supabase } from './lib/supabase';
import type { Activity, PackingItem, Trip } from './store';

export type SharedTripSnapshot = {
  trip: Record<string, unknown>;
  activities: Array<Record<string, unknown>>;
  packing: Array<Record<string, unknown>>;
  members: Array<{ user_id: string; display_name: string; avatar_url?: string | null; role: string; status: 'active' }>;
};
export type SharedTripMember = { user_id: string; display_name: string; avatar_url?: string | null; role: 'owner' | 'member'; status: 'active' };
export type SharedTripInvite = { id: string; expires_at: string; revoked_at?: string | null; accepted_by?: string | null };
export type SharedTripInviteStatus = Pick<SharedTripInvite, 'expires_at' | 'revoked_at' | 'accepted_by'>;
export type TargetedTripInvite = { id: string; trip_id: string; trip_title: string; inviter_id: string; inviter_name: string; expires_at: string };

function safeMember(row: any): SharedTripMember | null {
  const userId = typeof row?.user_id === 'string' && row.user_id.trim() ? row.user_id : null;
  if (!userId) return null;
  const displayName = String(row?.display_name ?? '').trim() || 'Traveler';
  const avatarUrl = typeof row?.avatar_url === 'string' && row.avatar_url.trim() ? row.avatar_url : null;
  return { user_id: userId, display_name: displayName, avatar_url: avatarUrl, role: row?.role === 'owner' ? 'owner' : 'member', status: 'active' };
}

export async function syncCanonicalTrip(trip: Trip, userId: string) {
  if (!supabase) return;
  const canonicalId = trip.sharedTripId || trip.id;
  const isLocalOwnerTrip = !trip.sharedTripId;
  if (isLocalOwnerTrip) {
    const { error: tripError } = await supabase.from('shared_trips').upsert({
      id: canonicalId, owner_id: userId, title: trip.title, city: trip.city, country: trip.country,
      start_date: trip.startDate, end_date: trip.endDate, payload: trip,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (tripError) throw tripError;
    const { error: memberError } = await supabase.from('shared_trip_members').upsert({ trip_id: canonicalId, user_id: userId, role: 'owner', status: 'active' }, { onConflict: 'trip_id,user_id' });
    if (memberError) throw memberError;
  }
  const activities = (trip.activities ?? [])
    .filter((activity: Activity) => isLocalOwnerTrip || activity.createdBy === userId)
    .map((activity: Activity) => ({ id: activity.id, trip_id: canonicalId, payload: activity, created_by: activity.createdBy || userId, updated_at: new Date().toISOString(), deleted_at: null }));
  if (activities.length) {
    const { error } = await supabase.from('shared_trip_activities').upsert(activities, { onConflict: 'id' });
    if (error) throw error;
  }
  const packing = (trip.packing ?? [])
    .filter((item: PackingItem) => isLocalOwnerTrip || item.createdBy === userId || item.visibility === 'shared')
    .map((item: PackingItem) => ({ id: item.id, trip_id: canonicalId, title: item.title, category: item.category, completed: item.done, visibility: item.visibility || 'private', assigned_to: item.assignedTo || null, created_by: item.createdBy || userId, updated_at: new Date().toISOString(), deleted_at: null }));
  if (packing.length) {
    const { error } = await supabase.from('shared_trip_packing_items').upsert(packing, { onConflict: 'id' });
    if (error) throw error;
  }
  const { data: existingPacking, error: existingPackingError } = await supabase.from('shared_trip_packing_items').select('id,created_by').eq('trip_id', canonicalId).is('deleted_at', null);
  if (existingPackingError) throw existingPackingError;
  const currentPackingIds = new Set((trip.packing ?? []).map((item) => item.id));
  const removedOwnedIds = (existingPacking ?? []).filter((row) => !currentPackingIds.has(String(row.id)) && row.created_by === userId).map((row) => String(row.id));
  if (removedOwnedIds.length) {
    const { error } = await supabase.from('shared_trip_packing_items').delete().in('id', removedOwnedIds);
    if (error) throw error;
  }
}

export async function readCanonicalTrip(tripId: string): Promise<SharedTripSnapshot | null> {
  if (!supabase) return null;
  const [tripResult, activityResult, packingResult, memberResult] = await Promise.all([
    supabase.from('shared_trips').select('*').eq('id', tripId).maybeSingle(),
    supabase.from('shared_trip_activities').select('id,payload').eq('trip_id', tripId).is('deleted_at', null).order('updated_at', { ascending: true }),
    supabase.from('shared_trip_packing_items').select('id,title,category,completed,visibility,assigned_to,created_by').eq('trip_id', tripId).is('deleted_at', null).order('updated_at', { ascending: true }),
    supabase.rpc('list_shared_trip_members', { p_trip_id: tripId }),
  ]);
  if (tripResult.error || activityResult.error || packingResult.error || memberResult.error || !tripResult.data) return null;
  return { trip: tripResult.data, activities: (activityResult.data ?? []).map((row) => row.payload as Record<string, unknown>), packing: (packingResult.data ?? []) as Array<Record<string, unknown>>, members: (memberResult.data ?? []).map((row: any) => safeMember(row)).filter((member: SharedTripMember | null): member is SharedTripMember => Boolean(member)) };
}

export async function createSharedTripInvite(tripId: string, token: string, expiresAt: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('create_shared_trip_invite', { p_trip_id: tripId, p_token: token, p_expires_at: expiresAt });
  if (error) throw error;
  return data as { trip_id: string; expires_at: string };
}

export async function acceptSharedTripInvite(token: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('accept_shared_trip_invite', { p_token: token });
  if (error) throw error;
  return data as { trip_id: string };
}

export async function revokeSharedTripInvite(inviteId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('revoke_shared_trip_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

export async function removeSharedTripMember(tripId: string, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('remove_shared_trip_member', { p_trip_id: tripId, p_user_id: userId });
  if (error) throw error;
}

export async function respondToSharedTripMemberInvite(inviteId: string, accept: boolean) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('respond_to_shared_trip_member_invite', { p_invite_id: inviteId, p_accept: accept });
  if (error) throw error;
  return data as { trip_id: string; status: 'accepted' | 'declined' };
}

export async function revokeSharedTripMemberInvite(inviteId: string) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('revoke_shared_trip_member_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

export async function listMySharedTripMemberInvites(): Promise<TargetedTripInvite[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('list_my_shared_trip_member_invites');
  if (error) throw error;
  return (data || []) as TargetedTripInvite[];
}

export async function listSharedTripMembers(tripId: string): Promise<SharedTripMember[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('list_shared_trip_members', { p_trip_id: tripId });
  if (error) throw error;
  return (data || []).map((row: any) => safeMember(row)).filter((member: SharedTripMember | null): member is SharedTripMember => Boolean(member));
}

export async function listSharedTripInvites(tripId: string): Promise<SharedTripInvite[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('shared_trip_invites').select('id,expires_at,revoked_at,accepted_by').eq('trip_id', tripId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as SharedTripInvite[];
}

