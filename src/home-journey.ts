import { isoTripDate } from './trip-planning';
import { destinationToday } from './trip-weather';

type JourneyActivity = { id: string; title: string; date: string; startTime: string; endTime?: string };
type Journey = { id: string; startDate: string; endDate: string; completionState?: string; destinationTimeZone?: string; activities: readonly JourneyActivity[] };

/** Prioritise a journey happening at its destination, even if a future trip is selected. */
export function activeHomeJourney<T extends Journey>(trips: readonly T[], selectedId?: string, now = new Date()): T | undefined {
  const active = trips.filter(trip => {
    if (['completed', 'cancelled', 'canceled'].includes(trip.completionState ?? '')) return false;
    const start = isoTripDate(trip.startDate), end = isoTripDate(trip.endDate);
    const today = destinationToday(trip.destinationTimeZone, now);
    return Boolean(start && end && start <= today && end >= today);
  });
  return active.find(trip => trip.id === selectedId) ?? active[0];
}

function clockMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  return match && +match[1] < 24 && +match[2] < 60 ? +match[1] * 60 + +match[2] : null;
}

function currentMinutes(timeZone: string | undefined, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    return +parts.find(part => part.type === 'hour')!.value * 60 + +parts.find(part => part.type === 'minute')!.value;
  } catch { return now.getHours() * 60 + now.getMinutes(); }
}

export type HomeJourneyGuide = {
  day: string;
  kind: 'next' | 'plan' | 'empty';
  line: string;
  activity?: JourneyActivity;
  time?: string;
};

/** Missing times remain in the plan; past activities never masquerade as upcoming. */
export function homeJourneyGuide(trip: Journey, now = new Date()): HomeJourneyGuide {
  const day = destinationToday(trip.destinationTimeZone, now);
  const minute = currentMinutes(trip.destinationTimeZone, now);
  const today = trip.activities.filter(activity => isoTripDate(activity.date) === day);
  const next = today.map(activity => ({ activity, start: clockMinutes(activity.startTime), end: clockMinutes(activity.endTime ?? '') }))
    .filter(entry => entry.start !== null && (entry.start >= minute || (entry.end !== null && entry.end > minute && entry.end >= entry.start)))
    .sort((a, b) => a.start! - b.start!)[0];
  if (next) return {
    day, kind: 'next', activity: next.activity,
    time: `${String(Math.floor(next.start! / 60)).padStart(2, '0')}:${String(next.start! % 60).padStart(2, '0')}`,
    line: next.start! < minute ? "It's time for your next stop!" : "Here's your next stop!",
  };
  return { day, kind: today.length ? 'plan' : 'empty', line: today.length ? "Let's see today's plan." : 'What shall we do today?' };
}
