import type { Trip } from './store';

export type InviteTrip = Pick<Trip, 'title' | 'city' | 'country' | 'startDate' | 'endDate' | 'members' | 'coverImage' | 'wishes'>;

export function invitePayload(trip: Trip) {
  const data: InviteTrip & { version: 1 } = {
    version: 1,
    title: trip.title,
    city: trip.city,
    country: trip.country,
    startDate: trip.startDate,
    endDate: trip.endDate,
    members: trip.members,
    coverImage: trip.coverImage,
    wishes: trip.wishes,
  };
  return encodeURIComponent(JSON.stringify(data));
}

export function readInvite(raw?: string | string[]) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  try {
    const data = JSON.parse(value.includes('%') ? decodeURIComponent(value) : value) as Partial<InviteTrip & { version: number }>;
    if (data.version !== 1 || !data.title || !data.city || !data.country || !data.startDate || !data.endDate) return null;
    return { title: data.title, city: data.city, country: data.country, startDate: data.startDate, endDate: data.endDate, members: Array.isArray(data.members) ? data.members.filter(Boolean) : [], coverImage: data.coverImage, wishes: Array.isArray(data.wishes) ? data.wishes : [] } as InviteTrip;
  } catch { return null; }
}

export function inviteUrl(trip: Trip, base: string) {
  return `${base.replace(/\/$/, '')}/join/${encodeURIComponent(trip.id)}?invite=${invitePayload(trip)}`;
}
