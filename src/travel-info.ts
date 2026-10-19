export type PlugType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O';

export type CountryEssentials = {
  currency: string;
  currencyName: string;
  plugs: PlugType[];
  voltage: number;
  frequency: string;
};

// Electrical data is maintained from World Standards' country plug and voltage
// guide (https://www.worldstandards.eu/electricity/plug-voltage-by-country/).
// Thailand's Type O listing is also checked against Thai Industrial Standard
// TIS 166-2549. Review this small local table when adding a country.
const countryEssentialsByCode: Record<string, CountryEssentials> = {
  AU: { currency: 'AUD', currencyName: 'Australian dollar', plugs: ['I'], voltage: 230, frequency: '50 Hz' },
  DK: { currency: 'DKK', currencyName: 'Danish krone', plugs: ['C', 'E', 'K'], voltage: 230, frequency: '50 Hz' },
  FR: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'E'], voltage: 230, frequency: '50 Hz' },
  DE: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  GR: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  IN: { currency: 'INR', currencyName: 'Indian rupee', plugs: ['C', 'D', 'M'], voltage: 230, frequency: '50 Hz' },
  ID: { currency: 'IDR', currencyName: 'Indonesian rupiah', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  IT: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'F', 'L'], voltage: 230, frequency: '50 Hz' },
  JP: { currency: 'JPY', currencyName: 'Japanese yen', plugs: ['A', 'B'], voltage: 100, frequency: '50–60 Hz' },
  MA: { currency: 'MAD', currencyName: 'Moroccan dirham', plugs: ['C', 'E'], voltage: 220, frequency: '50 Hz' },
  NL: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  NO: { currency: 'NOK', currencyName: 'Norwegian krone', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  PT: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  ES: { currency: 'EUR', currencyName: 'Euro', plugs: ['C', 'F'], voltage: 230, frequency: '50 Hz' },
  TH: { currency: 'THB', currencyName: 'Thai baht', plugs: ['A', 'B', 'C', 'F', 'O'], voltage: 230, frequency: '50 Hz' },
  GB: { currency: 'GBP', currencyName: 'Pound sterling', plugs: ['G'], voltage: 230, frequency: '50 Hz' },
  US: { currency: 'USD', currencyName: 'US dollar', plugs: ['A', 'B'], voltage: 120, frequency: '60 Hz' },
};

const countryCodeByName: Record<string, string> = {
  australia: 'AU', denmark: 'DK', france: 'FR', germany: 'DE', greece: 'GR', india: 'IN', indonesia: 'ID', italy: 'IT', japan: 'JP', morocco: 'MA', netherlands: 'NL', norway: 'NO', portugal: 'PT', spain: 'ES', thailand: 'TH', 'united kingdom': 'GB', uk: 'GB', usa: 'US', 'united states': 'US',
};

const countryTimeZones: Record<string, string> = {
  australia: 'Australia/Sydney', denmark: 'Europe/Copenhagen', france: 'Europe/Paris', germany: 'Europe/Berlin', greece: 'Europe/Athens', india: 'Asia/Kolkata', indonesia: 'Asia/Jakarta', italy: 'Europe/Rome', japan: 'Asia/Tokyo', morocco: 'Africa/Casablanca', netherlands: 'Europe/Amsterdam', norway: 'Europe/Oslo', portugal: 'Europe/Lisbon', spain: 'Europe/Madrid', thailand: 'Asia/Bangkok', 'united kingdom': 'Europe/London', uk: 'Europe/London',
};

const cityTimeZones: Record<string, string> = {
  'new york': 'America/New_York', miami: 'America/New_York', chicago: 'America/Chicago', denver: 'America/Denver', 'los angeles': 'America/Los_Angeles', honolulu: 'Pacific/Honolulu', phoenix: 'America/Phoenix',
};

export const plugDescriptions: Record<PlugType, string> = {
  A: 'two flat pins', B: 'two flat pins and earth', C: 'two round pins', D: 'three round pins in a triangle', E: 'two round pins and earth pin',
  F: 'two round pins with side earth', G: 'three flat pins', H: 'three flat pins in a Y', I: 'three flat pins in a V', J: 'three round pins in a triangle',
  K: 'two round pins and earth pin', L: 'three round pins in a line', M: 'three large round pins', N: 'three round pins in a circle', O: 'three round pins in a triangle',
};

const normaliseCountry = (country: string) => country.trim().toLocaleLowerCase('en-US');
const normaliseCity = (city: string) => city.trim().toLocaleLowerCase('en-US');

export const countryInfoFor = (country: string) => countryEssentialsByCode[countryCodeByName[normaliseCountry(country)] ?? country.trim().toUpperCase()];
export const destinationTimeZoneFor = (city: string, country: string) => cityTimeZones[normaliseCity(city)] ?? countryTimeZones[normaliseCountry(country)];
export const countryForTimeZone = (timeZone?: string) => Object.entries(countryTimeZones).find(([, value]) => value === timeZone)?.[0];

export function deviceTimeZone() {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone && isValidTimeZone(timeZone) ? timeZone : undefined;
  } catch { return undefined; }
}

export function isValidTimeZone(timeZone: string) {
  try { new Intl.DateTimeFormat('en-GB', { timeZone }).format(); return true; } catch { return false; }
}

// A picked place is the destination authority. A persisted zone is kept when it
// came from a precise geocoder result, except for an older bad value that was
// copied from the home zone. That legacy value made Norway and Thailand compare
// as Europe/Oslo and incorrectly show the same time.
export function resolvedDestinationTimeZone(city: string, country: string, persistedTimeZone?: string, homeTimeZone?: string) {
  const placeTimeZone = destinationTimeZoneFor(city, country);
  const savedTimeZone = persistedTimeZone && isValidTimeZone(persistedTimeZone) ? persistedTimeZone : undefined;
  if (placeTimeZone && (!savedTimeZone || (savedTimeZone === homeTimeZone && placeTimeZone !== homeTimeZone))) return placeTimeZone;
  return savedTimeZone ?? placeTimeZone;
}

// Use an explicit home country when one exists. Otherwise keep the stored
// device zone, falling back to the current device zone only when it is valid.
export function resolvedHomeTimeZone(persistedTimeZone?: string, homeCountry?: string, currentDeviceTimeZone = deviceTimeZone()) {
  const countryTimeZone = homeCountry ? destinationTimeZoneFor('', homeCountry) : undefined;
  if (countryTimeZone) return countryTimeZone;
  if (persistedTimeZone && isValidTimeZone(persistedTimeZone)) return persistedTimeZone;
  return currentDeviceTimeZone && isValidTimeZone(currentDeviceTimeZone) ? currentDeviceTimeZone : undefined;
}

function dateAtTripStart(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function zoneOffsetMinutes(timeZone: string, date: Date) {
  if (!isValidTimeZone(timeZone)) return null;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'longOffset', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = parts.find((part) => part.type === 'timeZoneName')?.value;
  if (value === 'GMT') return 0;
  const match = value?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) return null;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

export type TimeDifference = { title: string; differenceMinutes: number; localTime: string };

export function timeDifferenceForTrip(destinationTimeZone?: string, homeTimeZone?: string, tripStartDate?: string, now = new Date()): TimeDifference | null {
  if (!destinationTimeZone || !homeTimeZone || !tripStartDate) return null;
  const tripStart = dateAtTripStart(tripStartDate);
  if (!tripStart) return null;
  const destinationOffset = zoneOffsetMinutes(destinationTimeZone, tripStart);
  const homeOffset = zoneOffsetMinutes(homeTimeZone, tripStart);
  if (destinationOffset === null || homeOffset === null) return null;
  const differenceMinutes = destinationOffset - homeOffset;
  const amount = Math.abs(differenceMinutes) / 60;
  const quantity = Number.isInteger(amount) ? String(amount) : String(amount).replace('.5', '½');
  const title = differenceMinutes === 0 ? 'Same time as home' : `${quantity} ${amount === 1 ? 'hour' : 'hours'} ${differenceMinutes > 0 ? 'ahead' : 'behind'}`;
  const localTime = new Intl.DateTimeFormat('en-GB', { timeZone: destinationTimeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return { title, differenceMinutes, localTime };
}

export type PlugCompatibility = { matching: PlugType[]; needsAdapter: boolean; adapterTip?: string; voltageWarning: boolean };

export function plugCompatibility(destination?: CountryEssentials, home?: CountryEssentials): PlugCompatibility | null {
  if (!destination || !home) return null;
  const matching = destination.plugs.filter((type) => home.plugs.includes(type));
  return { matching, needsAdapter: matching.length === 0, adapterTip: matching.length ? undefined : `Buy a Type ${home.plugs[0]} to Type ${destination.plugs[0]} travel adapter`, voltageWarning: Math.abs(destination.voltage - home.voltage) > 20 };
}

export const voltageLabel = (info: CountryEssentials) => `${info.voltage} V, ${info.frequency}`;
