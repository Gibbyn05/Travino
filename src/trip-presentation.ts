import { Trip } from './store';

export const tripColors = ['#1670EF', '#9363EF', '#E97054', '#B48225', '#25885C', '#BD5C8A'] as const;
export const tripIcons = ['airplane', 'sunny', 'camera', 'restaurant', 'map', 'boat'] as const;

export type TripIcon = typeof tripIcons[number];

const iconFor = (trip: Pick<Trip, 'title' | 'city' | 'country'>): TripIcon => {
  const words = `${trip.title} ${trip.city} ${trip.country}`.toLocaleLowerCase('en-US');
  if (/beach|island|coast|amalfi|bali|phuket|mallorca|sea/.test(words)) return 'sunny';
  if (/food|wine|tapas|dinner|restaurant/.test(words)) return 'restaurant';
  if (/photo|camera|memory/.test(words)) return 'camera';
  if (/road|hike|explor|map/.test(words)) return 'map';
  return 'airplane';
};

const stableIndex = (value: string) => [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % tripColors.length;

export function tripPresentation(trip: Pick<Trip, 'title' | 'city' | 'country' | 'icon' | 'color'>) {
  return {
    icon: (trip.icon && tripIcons.includes(trip.icon as TripIcon) ? trip.icon : iconFor(trip)) as TripIcon,
    color: trip.color && tripColors.includes(trip.color as typeof tripColors[number]) ? trip.color : tripColors[stableIndex(`${trip.city}${trip.country}`)],
  };
}
