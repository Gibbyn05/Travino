/**
 * Human date labels for the app UI. Dates are stored as ISO strings when they
 * come from the picker, but the storage format should never leak into a view.
 */
export function parseTravelDate(value?: string): Date | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const parsed = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : dotted
      ? new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]))
      : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

const short = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });
const long = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const journal = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(value?: string, fallback = 'Date to be confirmed') {
  const date = parseTravelDate(value);
  return date ? short.format(date) : fallback;
}

export function formatLongDate(value?: string, fallback = 'Date to be confirmed') {
  const date = parseTravelDate(value);
  return date ? long.format(date) : fallback;
}

export function formatJournalDate(value?: string, fallback = 'Date to be confirmed') {
  const date = parseTravelDate(value);
  return date ? journal.format(date) : fallback;
}

export function tripLength(start?: string, end?: string) {
  const departure = parseTravelDate(start);
  const returnDate = parseTravelDate(end);
  if (!departure || !returnDate || returnDate.getTime() < departure.getTime()) return '';
  const nights = Math.round((returnDate.getTime() - departure.getTime()) / 86_400_000);
  const days = nights + 1;
  return `${days} ${days === 1 ? 'day' : 'days'}, ${nights} ${nights === 1 ? 'night' : 'nights'}`;
}

export function formatTripDates(start?: string, end?: string) {
  const departure = parseTravelDate(start);
  const returnDate = parseTravelDate(end);
  if (!departure && !returnDate) return 'Dates to be confirmed';
  if (!departure) return `Returning ${formatDate(end)}`;
  if (!returnDate) return `Leaving ${formatDate(start)}`;
  const length = tripLength(start, end);
  return `${short.format(departure)} to ${short.format(returnDate)}${length ? `, ${length.split(', ')[1]}` : ''}`;
}

export function isGroupTrip(members: string[]) {
  return members.filter(Boolean).length > 0;
}

export function tripCompanionCopy(members: string[]) {
  const people = members.filter(Boolean);
  if (!people.length) return 'A trip at your own pace';
  if (people.length === 1) return `Travelling with ${people[0]}`;
  if (people.length === 2) return `Travelling with ${people[0]} and ${people[1]}`;
  return `Travelling with ${people.slice(0, -1).join(', ')} and ${people.at(-1)}`;
}
