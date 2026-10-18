import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureGuestIdentity, supabase } from './lib/supabase';
import { parseTravelDate } from './dates';

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

export type ReminderTrip = {
  title: string;
  city: string;
  startDate: string;
  endDate: string;
  activities: { title: string; date: string; startTime: string }[];
  reminderNotificationIds?: string[];
};
export type LocalTripReminder = { title: string; body: string; when: Date };

function atLocalTime(day: Date, daysOffset: number, hour: number) {
  const reminder = new Date(day);
  reminder.setDate(reminder.getDate() + daysOffset);
  reminder.setHours(hour, 0, 0, 0);
  return reminder;
}

/** A quiet, local reminder set derived from the trip and its planned activities. */
export function remindersForTrip(trip: ReminderTrip): LocalTripReminder[] {
  const departure = parseTravelDate(trip.startDate);
  const returnDate = parseTravelDate(trip.endDate);
  if (!departure || !returnDate) return [];
  const reminders: LocalTripReminder[] = [
    { title: `${trip.title} is a week away`, body: `A small look at your plans for ${trip.city} can make the week feel easier.`, when: atLocalTime(departure, -7, 9) },
    { title: `Leaving for ${trip.city} tomorrow`, body: 'Your essentials are worth one calm final check tonight.', when: atLocalTime(departure, -1, 18) },
    { title: 'Heading home tomorrow', body: `Take a moment to check your journey home from ${trip.city}.`, when: atLocalTime(returnDate, -1, 18) },
  ];
  trip.activities.forEach((activity) => {
    const activityDate = parseTravelDate(activity.date);
    if (!activityDate || !/div|swim|snorkel|beach/i.test(activity.title)) return;
    reminders.push({ title: `A little prep for ${activity.title}`, body: 'Pack swimwear and a towel this evening so tomorrow starts easily.', when: atLocalTime(activityDate, -1, 18) });
  });
  return reminders.filter((reminder) => reminder.when.getTime() > Date.now()).sort((left, right) => left.when.getTime() - right.when.getTime());
}

/** Requests permission only after a traveller asks to turn on trip reminders. */
export async function scheduleTripReminders(trip: ReminderTrip) {
  const permission = await Notifications.getPermissionsAsync();
  const status = permission.status === 'granted' ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { status: 'denied' as const, ids: [], reminders: remindersForTrip(trip) };
  await Promise.all((trip.reminderNotificationIds || []).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  const reminders = remindersForTrip(trip);
  const ids = await Promise.all(reminders.map((reminder) => Notifications.scheduleNotificationAsync({ content: { title: reminder.title, body: reminder.body, sound: 'default' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.when } })));
  return { status: 'scheduled' as const, ids, reminders };
}

/** Register this installation with Expo and attach its push token to the signed-in profile. */
export async function registerForPushNotifications() {
  if (!supabase) return { registered: false, reason: 'Notifications are unavailable right now.' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return { registered: false, reason: 'Notifications are unavailable right now.' };

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
  if (!supabase) throw new Error('Notifications are unavailable right now.');
  const { data, error } = await supabase.functions.invoke('trip-notifications', { body: notification });
  if (error) throw error;
  return data as { ok: boolean; pushSent: boolean; reason?: string };
}
