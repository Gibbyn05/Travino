export type Weather = {
  temperature: number;
  apparentTemperature: number;
  wind: number;
  condition: string;
  icon: 'sunny-outline' | 'partly-sunny-outline' | 'cloudy-outline' | 'rainy-outline' | 'thunderstorm-outline' | 'snow-outline' | 'fog-outline';
  high?: number;
  low?: number;
};

const weatherCode = (code: number): Pick<Weather, 'condition' | 'icon'> => {
  if (code === 0) return { condition: 'Klart', icon: 'sunny-outline' };
  if ([1, 2].includes(code)) return { condition: 'Lettskyet', icon: 'partly-sunny-outline' };
  if (code === 3) return { condition: 'Overskyet', icon: 'cloudy-outline' };
  if ([45, 48].includes(code)) return { condition: 'Tåke', icon: 'fog-outline' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snø', icon: 'snow-outline' };
  if ([95, 96, 99].includes(code)) return { condition: 'Tordenvær', icon: 'thunderstorm-outline' };
  return { condition: 'Regnbyger', icon: 'rainy-outline' };
};

export async function fetchWeather(city: string, country: string, signal?: AbortSignal): Promise<Weather> {
  const search = encodeURIComponent([city, country].filter(Boolean).join(', '));
  const geocoding = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${search}&count=1&language=no&format=json`, { signal });
  if (!geocoding.ok) throw new Error('Kunne ikke finne reisemålet');
  const place = (await geocoding.json()).results?.[0];
  if (!place) throw new Error('Kunne ikke finne reisemålet');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Kunne ikke hente vær akkurat nå');
  const data = await response.json();
  return { temperature: Math.round(data.current.temperature_2m), apparentTemperature: Math.round(data.current.apparent_temperature), wind: Math.round(data.current.wind_speed_10m), ...weatherCode(data.current.weather_code), high: Math.round(data.daily?.temperature_2m_max?.[0]), low: Math.round(data.daily?.temperature_2m_min?.[0]) };
}
