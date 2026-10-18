type CountryEssentials = { currency: string; currencyName: string; plugs: string; voltage: string };

const countryEssentials: Record<string, CountryEssentials> = {
  australia: { currency: 'AUD', currencyName: 'Australian dollar', plugs: 'I', voltage: '230V / 50Hz' },
  denmark: { currency: 'DKK', currencyName: 'Danish krone', plugs: 'C, E, K', voltage: '230V / 50Hz' },
  france: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, E', voltage: '230V / 50Hz' },
  germany: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, F', voltage: '230V / 50Hz' },
  greece: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, F', voltage: '230V / 50Hz' },
  indonesia: { currency: 'IDR', currencyName: 'Indonesian rupiah', plugs: 'C, F', voltage: '230V / 50Hz' },
  italy: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, F, L', voltage: '230V / 50Hz' },
  japan: { currency: 'JPY', currencyName: 'Japanese yen', plugs: 'A, B', voltage: '100V / 50–60Hz' },
  morocco: { currency: 'MAD', currencyName: 'Moroccan dirham', plugs: 'C, E', voltage: '220V / 50Hz' },
  netherlands: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, F', voltage: '230V / 50Hz' },
  norway: { currency: 'NOK', currencyName: 'Norwegian krone', plugs: 'C, F', voltage: '230V / 50Hz' },
  portugal: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, F', voltage: '230V / 50Hz' },
  spain: { currency: 'EUR', currencyName: 'Euro', plugs: 'C, F', voltage: '230V / 50Hz' },
  thailand: { currency: 'THB', currencyName: 'Thai baht', plugs: 'A, B, C', voltage: '220V / 50Hz' },
  'united kingdom': { currency: 'GBP', currencyName: 'Pound sterling', plugs: 'G', voltage: '230V / 50Hz' },
  uk: { currency: 'GBP', currencyName: 'Pound sterling', plugs: 'G', voltage: '230V / 50Hz' },
  usa: { currency: 'USD', currencyName: 'US dollar', plugs: 'A, B', voltage: '120V / 60Hz' },
  'united states': { currency: 'USD', currencyName: 'US dollar', plugs: 'A, B', voltage: '120V / 60Hz' },
};

export const countryInfoFor = (country: string) => countryEssentials[country.trim().toLocaleLowerCase('en-US')];

function zoneOffsetMinutes(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'shortOffset', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  const match = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] || 0));
}

export function timeDifferenceFromHome(destinationTimeZone?: string) {
  if (!destinationTimeZone || typeof Intl === 'undefined') return null;
  const homeTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!homeTimeZone) return null;
  const difference = zoneOffsetMinutes(destinationTimeZone) - zoneOffsetMinutes(homeTimeZone);
  if (!difference) return 'Same time as home';
  const hours = Math.abs(difference / 60);
  return `${difference > 0 ? '+' : '−'}${Number.isInteger(hours) ? hours : hours.toFixed(1)}h from home`;
}
