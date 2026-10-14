import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureGuestIdentity, supabase } from './lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type TripNotification =
  | { event: 'member_added'; tripId: string; tripTitle: string; recipientId: string }
  | { event: 'packing_assigned'; tripId: string; tripTitle: string; recipientId: string; itemTitle: string };

/** Register this installation with Expo and attach its push token to the signed-in profile. */
export async function registerForPushNotifications() {
  if (!supabase) return { registered: false, reason: 'Supabase is not configured.' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return { registered: false, reason: 'The Expo project ID is not configured.' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Trip updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { registered: false, reason: 'Push notifications are turned off for this app.' };

  const user = await ensureGuestIdentity();
  if (!user) return { registered: false, reason: 'No signed-in profile is available.' };
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.from('push_devices').upsert({
    user_id: user.id,
    expo_push_token: result.data,
    platform: Platform.OS,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'expo_push_token' });
  if (error) throw error;
  return { registered: true as const };
}

export async function sendTripNotification(notification: TripNotification) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('trip-notifications', { body: notification });
  if (error) throw error;
  return data as { ok: boolean; pushSent: boolean; reason?: string };
}
