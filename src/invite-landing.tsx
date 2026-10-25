import Head from 'expo-router/head';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ensureGuestIdentity, getCurrentUser, supabase } from './lib/supabase';
import { acceptSharedTripInvite, readCanonicalTrip } from './shared-trips';
import { clearPendingInvite, inviteAppUrl, inviteWebUrl, isInviteToken, savePendingInvite } from './invite-links';
import { colors, fonts } from './theme';
import { useTravel } from './store';

type LandingState = 'loading' | 'unauthenticated' | 'ready' | 'accepting' | 'accepted' | 'error';
type InviteErrorKind = 'invalid' | 'trip-load' | 'other';

export function InviteLanding({ token: rawToken, browserOnly = false }: { token?: string | string[]; browserOnly?: boolean }) {
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const { trips, createTrip, updateTrip, setSelectedTripId } = useTravel();
  const [state, setState] = useState<LandingState>('loading');
  const [message, setMessage] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  const [appOpenFailed, setAppOpenFailed] = useState(false);
  const [errorKind, setErrorKind] = useState<InviteErrorKind>('other');

  const appUrl = useMemo(() => token && isInviteToken(token) ? inviteAppUrl(token) : '', [token]);

  useEffect(() => {
    let active = true;
    if (!isInviteToken(token)) { setState('error'); setErrorKind('invalid'); setMessage('This invitation token is invalid.'); return () => { active = false; }; }
    void getCurrentUser().then(async (user) => {
      if (!active) return;
      if (!user) { await savePendingInvite(token); if (active) setState('unauthenticated'); return; }
      setState('ready');
    }).catch((error) => { if (active) { setState('error'); setErrorKind('other'); setMessage(error?.message || 'Could not check this invitation.'); } });
    return () => { active = false; };
  }, [token]);

  const openApp = async () => {
    if (!appUrl) return;
    setAppOpenFailed(false);
    try { await Linking.openURL(appUrl); } catch {
      setAppOpenFailed(true);
      setMessage('Travino is not installed or could not be opened. Install the Travino app from the App Store, then try again.');
    }
  };

  const openBrowser = async () => {
    if (!token || !isInviteToken(token)) return;
    try { await Linking.openURL(inviteWebUrl(token, true)); } catch { setMessage('Could not open the browser version.'); }
  };

  const continueWithAccount = () => {
    if (!token) return;
    void savePendingInvite(token);
    router.replace('/auth' as never);
  };

  const cancel = async () => {
    await clearPendingInvite();
    router.replace('/' as never);
  };

  const accept = async () => {
    if (!token || !isInviteToken(token) || !supabase) { setState('error'); setErrorKind('invalid'); setMessage('This invitation token is invalid or unavailable.'); return; }
    setState('accepting'); setErrorKind('other'); setMessage('');
    try {
      const user = await ensureGuestIdentity();
      if (!user) { await savePendingInvite(token); setState('unauthenticated'); return; }
      const result = await acceptSharedTripInvite(token);
      const snapshot = await readCanonicalTrip(result.trip_id);
      if (!snapshot?.trip) {
        setState('error');
        setErrorKind('trip-load');
        setMessage('The invitation was accepted, but the trip could not be loaded. Try again to refresh the trip.');
        return;
      }
      const tripRow = snapshot.trip as Record<string, any>;
      const payload = tripRow.payload as Record<string, any>;
      const sharedMembers = snapshot.members.filter((member) => member.status === 'active').map((member) => ({ accountId: member.user_id, displayName: member.display_name, avatarUrl: member.avatar_url, role: member.role === 'owner' ? ('owner' as const) : ('member' as const) }));
      const canonical: Record<string, any> = { ...payload, sharedTripId: result.trip_id, sharedMembers, members: sharedMembers.map((member) => member.displayName) };
      const existing = trips.find((trip) => trip.sharedTripId === result.trip_id || trip.id === result.trip_id);
      const localId = existing?.id || createTrip({ title: String(canonical.title || tripRow.title || 'Shared trip'), city: String(canonical.city || tripRow.city || ''), country: String(canonical.country || tripRow.country || ''), startDate: String(canonical.startDate || tripRow.start_date), endDate: String(canonical.endDate || tripRow.end_date), members: canonical.members, sharedMembers, sharedTripId: result.trip_id });
      if (existing) updateTrip(localId, { ...canonical, sharedTripId: result.trip_id });
      setSelectedTripId(localId);
      await clearPendingInvite();
      setTripTitle(String(tripRow.title || canonical.title || 'your shared trip'));
      setState('accepted');
    } catch (error: any) {
      setState('error');
      setErrorKind(/invalid|expired|revoked|removed|no longer available/i.test(String(error?.message || '')) ? 'invalid' : 'other');
      const raw = String(error?.message || 'This invitation is unavailable.');
      if (/expired|revoked|removed|no longer available|invalid/i.test(raw)) {
        await clearPendingInvite();
        setMessage(/invalid/i.test(raw) ? 'This invitation token is invalid.' : 'This invitation has expired, been revoked, or can no longer be used.');
      } else setMessage(raw);
    }
  };

  if (Platform.OS === 'web') {
    // Token-bearing pages must not be indexed or retained by intermediary caches.
    // The route never accepts or reads trip data during GET/render.
  }

  return <View style={styles.page}>
    {Platform.OS === 'web' && <Head><meta name="robots" content="noindex,nofollow,noarchive"/><meta name="referrer" content="no-referrer"/><meta httpEquiv="Cache-Control" content="no-store"/></Head>}
    <Text style={styles.eyebrow}>Travino invitation</Text>
    {state === 'loading' && <><ActivityIndicator color={colors.blue}/><Text style={styles.copy}>Checking this invitation…</Text></>}
    {state === 'unauthenticated' && <><Text style={styles.title}>You have been invited to a trip</Text><Text style={styles.copy}>Sign in or create your Travino account to view the invitation. Nothing is accepted until you choose to continue.</Text><Pressable accessibilityRole="button" onPress={continueWithAccount} style={styles.primary}><Text style={styles.primaryText}>{browserOnly ? 'Continue in browser' : 'Continue in Travino'}</Text></Pressable>{Platform.OS === 'web' && <Pressable accessibilityRole="button" onPress={openApp} style={styles.secondary}><Text style={styles.secondaryText}>Open in Travino</Text></Pressable>}{Platform.OS !== 'web' && <Pressable accessibilityRole="button" onPress={openBrowser} style={styles.secondary}><Text style={styles.secondaryText}>Continue in browser</Text></Pressable>}{appOpenFailed && <Text style={styles.webNote}>{message}</Text>}{Platform.OS === 'web' && !appOpenFailed && <Text style={styles.webNote}>You are viewing the browser version. Install Travino to open this invite in the app, or continue here to sign in.</Text>}</>}
    {state === 'ready' && <><Text style={styles.title}>A Travino trip is waiting for you</Text><Text style={styles.copy}>Only the intended authenticated action can accept this invitation. You can review it before joining.</Text><Pressable accessibilityRole="button" onPress={accept} style={styles.primary}><Text style={styles.primaryText}>Accept invitation</Text></Pressable>{Platform.OS === 'web' && <Pressable accessibilityRole="button" onPress={openApp} style={styles.secondary}><Text style={styles.secondaryText}>Open in Travino</Text></Pressable>}{Platform.OS !== 'web' && <Pressable accessibilityRole="button" onPress={openBrowser} style={styles.secondary}><Text style={styles.secondaryText}>Continue in browser</Text></Pressable>}{appOpenFailed && <Text style={styles.webNote}>{message}</Text>}{browserOnly && !appOpenFailed && <Text style={styles.webNote}>Browser mode was chosen explicitly. Use Open in Travino after installing the app, or accept here in the browser.</Text>}</>}
    {state === 'accepting' && <><ActivityIndicator color={colors.blue}/><Text style={styles.copy}>Joining securely…</Text></>}
    {state === 'accepted' && <><Text style={styles.title}>You joined {tripTitle || 'the trip'}</Text><Text style={styles.copy}>The shared trip is ready in Travino.</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/trip' as never)} style={styles.primary}><Text style={styles.primaryText}>Open trip</Text></Pressable></>}
    {state === 'error' && <><Text style={styles.title}>{errorKind === 'trip-load' ? 'Trip could not be loaded' : 'Invitation unavailable'}</Text><Text style={styles.copy}>{message}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/' as never)} style={styles.secondary}><Text style={styles.secondaryText}>Back to Travino</Text></Pressable></>}
    {state !== 'loading' && state !== 'accepted' && state !== 'error' && <Pressable accessibilityRole="button" onPress={() => void cancel()} style={styles.link}><Text style={styles.linkText}>Cancel</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 96, justifyContent: 'center', gap: 18 },
  eyebrow: { color: colors.blue, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 32, lineHeight: 39, textAlign: 'center', fontWeight: '800' },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  primary: { backgroundColor: colors.blue, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondary: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#C7D9F4', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondaryText: { color: colors.blue, fontSize: 16, fontWeight: '800' },
  link: { alignItems: 'center', padding: 8 },
  linkText: { color: colors.blue, fontWeight: '700' },
  webNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
