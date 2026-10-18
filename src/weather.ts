export type Weather = {
  temperature: number;
  apparentTemperature: number;
  wind: number;
  condition: string;
  icon: 'sunny-outline' | 'partly-sunny-outline' | 'cloudy-outline' | 'rainy-outline' | 'thunderstorm-outline' | 'snow-outline' | 'fog-outline';
  high?: number;
  low?: number;
  timezone?: string;
  forecast: { date: string; high: number; low: number; icon: Weather['icon'] }[];
};

const weatherCode = (code: number): Pick<Weather, 'condition' | 'icon'> => {
  if (code === 0) return { condition: 'Clear', icon: 'sunny-outline' };
  if ([1, 2].includes(code)) return { condition: 'Partly cloudy', icon: 'partly-sunny-outline' };
  if (code === 3) return { condition: 'Overcast', icon: 'cloudy-outline' };
  if ([45, 48].includes(code)) return { condition: 'Fog', icon: 'fog-outline' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', icon: 'snow-outline' };
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', icon: 'thunderstorm-outline' };
  return { condition: 'Rain showers', icon: 'rainy-outline' };
};

async function fetchWithWeatherTimeout(url: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('Weather request timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function fetchWeather(city: string, country: string, signal?: AbortSignal): Promise<Weather> {
  const search = encodeURIComponent([city, country].filter(Boolean).join(', '));
  const geocoding = await fetchWithWeatherTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${search}&count=1&language=en&format=json`, signal);
  if (!geocoding.ok) throw new Error('Could not find destination');
  const place = (await geocoding.json()).results?.[0];
  if (!place) throw new Error('Could not find destination');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
  const response = await fetchWithWeatherTimeout(url, signal);
  if (!response.ok) throw new Error('Could not get weather right now');
  const data = await response.json();
  const forecast = (data.daily?.time || []).map((date: string, index: number) => ({
    date,
    high: Math.round(data.daily?.temperature_2m_max?.[index]),
    low: Math.round(data.daily?.temperature_2m_min?.[index]),
    icon: weatherCode(data.daily?.weather_code?.[index]).icon,
  }));
  return { temperature: Math.round(data.current.temperature_2m), apparentTemperature: Math.round(data.current.apparent_temperature), wind: Math.round(data.current.wind_speed_10m), ...weatherCode(data.current.weather_code), high: Math.round(data.daily?.temperature_2m_max?.[0]), low: Math.round(data.daily?.temperature_2m_min?.[0]), timezone: data.timezone, forecast };
}
