import type { Weather } from './weather';

export type TripWeatherPlan = {
  kind: 'active' | 'upcoming' | 'future' | 'past' | 'missing-dates';
  days: Weather['forecast'];
  showCurrent: boolean;
  message?: string;
  packingTip?: string;
};

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DOTTED_DAY = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

function isoDay(value?: string) {
  if (!value) return null;
  const iso = value.match(ISO_DAY);
  if (iso) return value;
  const dotted = value.match(DOTTED_DAY);
  if (!dotted) return null;
  return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`;
}

function dayAtDestination(now: Date, timeZone?: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    const year = value('year');
    const month = value('month');
    const day = value('day');
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // A missing provider timezone should not prevent a forecast that has dates.
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function weatherTip(days: Weather['forecast']) {
  if (!days.length) return undefined;
  const wetDays = days.filter((day) => day.icon === 'rainy-outline' || day.icon === 'thunderstorm-outline').length;
  if (wetDays >= Math.ceil(days.length / 2)) return 'Rain most days, pack a jacket.';
  const warmNight = Math.round(days.reduce((sum, day) => sum + day.low, 0) / days.length);
  if (warmNight >= 25) return `Warm nights around ${warmNight}°, pack light layers.`;
  const hottestDay = Math.max(...days.map((day) => day.high));
  if (hottestDay >= 30) return 'Hot days ahead, pack sun protection.';
  return undefined;
}

/**
 * Limits weather to the dates the traveller will actually be away. Forecast
 * dates arrive already local to the destination from the weather provider.
 */
export function tripWeatherPlan(
  weather: Pick<Weather, 'forecast' | 'timezone'> | null,
  startDate: string,
  endDate: string,
  now = new Date(),
): TripWeatherPlan {
  const start = isoDay(startDate);
  const end = isoDay(endDate);
  if (!start || !end || end < start) {
    return { kind: 'missing-dates', days: [], showCurrent: false, message: 'Add travel dates to see the forecast for your stay.' };
  }

  const today = dayAtDestination(now, weather?.timezone);
  if (end < today) return { kind: 'past', days: [], showCurrent: false, message: 'This trip has passed, so there is no live forecast.' };

  const forecast = weather?.forecast ?? [];
  const lastForecastDay = forecast.at(-1)?.date;
  if (!lastForecastDay || start > lastForecastDay) {
    return { kind: 'future', days: [], showCurrent: false, message: 'Forecast for your dates is ready 10 days before you leave.' };
  }

  const active = start <= today && end >= today;
  const firstVisibleDay = active ? today : start;
  const days = forecast.filter((day) => day.date >= firstVisibleDay && day.date <= end);
  if (!days.length) {
    return { kind: active ? 'active' : 'future', days: [], showCurrent: active, message: active ? 'The remaining forecast will be back soon.' : 'Forecast for your dates is ready 10 days before you leave.' };
  }

  const coverage = end > lastForecastDay
    ? `Forecast currently covers the first ${days.length} ${days.length === 1 ? 'day' : 'days'} of your trip.`
    : undefined;

  return {
    kind: active ? 'active' : 'upcoming',
    days,
    showCurrent: active,
    message: coverage,
    packingTip: weatherTip(days),
  };
}

export function tripForecastDayLabel(value: string, today: string) {
  if (value === today) return 'Today';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric' }).format(date);
}

export function destinationToday(timeZone?: string, now = new Date()) {
  return dayAtDestination(now, timeZone);
}
