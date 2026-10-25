import * as Linking from 'expo-linking';
import storage from './lib/persistent-storage';

const PENDING_INVITE_KEY = '@travino/pending-invite-v1';
const DEFAULT_WEB_BASE = 'https://travino.site';

export function inviteWebBase() {
  // Invitation URLs intentionally use the public invitation host, not the
  // app's general web URL. This keeps share links stable when the app shell
  // is hosted on a different Vercel URL.
  return (process.env.EXPO_PUBLIC_INVITE_BASE_URL || DEFAULT_WEB_BASE).replace(/\/$/, '');
}

export function inviteWebUrl(token: string, browserOnly = false) {
  const path = browserOnly ? '/web/invite' : '/invite';
  return `${inviteWebBase()}${path}/${encodeURIComponent(token)}`;
}

export function inviteAppUrl(token: string) {
  return Linking.createURL(`/invite/${encodeURIComponent(token)}`);
}

export function isInviteToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,200}$/.test(value);
}

export async function savePendingInvite(token: string) {
  if (isInviteToken(token)) await storage.setItem(PENDING_INVITE_KEY, token);
}

export async function readPendingInvite() {
  const token = await storage.getItem(PENDING_INVITE_KEY);
  return isInviteToken(token) ? token : null;
}

export async function clearPendingInvite() {
  await storage.removeItem(PENDING_INVITE_KEY);
}
