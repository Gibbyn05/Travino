export const primaryTripTabs = ['Overview', 'Plan', 'Packing', 'More'] as const;
export const extraTripTabs = ['Activities', 'Wishlist', 'Memories'] as const;
export type TripSection = typeof primaryTripTabs[number] | typeof extraTripTabs[number];
export type TripSections = Record<string, TripSection>;

/** Retain existing links to the sections now grouped under More. */
export function tripSection(value?: string): TripSection {
  return [...primaryTripTabs, ...extraTripTabs].some(tab => tab === value) ? value as TripSection : 'Overview';
}

export function primaryTripTab(section: TripSection): typeof primaryTripTabs[number] {
  return extraTripTabs.some(tab => tab === section) ? 'More' : section as typeof primaryTripTabs[number];
}

/** Ignore damaged or obsolete preferences without changing any trip data. */
export function savedTripSections(value: unknown): TripSections {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, section]) =>
    id && typeof section === 'string' && tripSection(section) === section));
}
