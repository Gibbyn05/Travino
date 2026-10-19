import test from 'node:test';
import assert from 'node:assert/strict';
import { tripWeatherPlan } from '../src/trip-weather.ts';

const forecast = (dates) => ({
  timezone: 'Europe/Oslo',
  forecast: dates.map((date, index) => ({
    date,
    high: 18 + index,
    low: 9 + index,
    icon: index % 2 ? 'partly-sunny-outline' : 'rainy-outline',
    condition: 'Rain showers',
  })),
});

const now = new Date('2026-10-19T10:00:00.000Z');

test('a trip this week shows only its arrival through departure dates', () => {
  const weather = forecast(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']);
  const plan = tripWeatherPlan(weather, '2026-10-21', '2026-10-23', now);
  assert.equal(plan.kind, 'upcoming');
  assert.equal(plan.showCurrent, false);
  assert.deepEqual(plan.days.map((day) => day.date), ['2026-10-21', '2026-10-22', '2026-10-23']);
});

test('a trip beyond the forecast window never presents today as the trip weather', () => {
  const weather = forecast(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
  const plan = tripWeatherPlan(weather, '2026-12-19', '2026-12-26', now);
  assert.equal(plan.kind, 'future');
  assert.equal(plan.showCurrent, false);
  assert.deepEqual(plan.days, []);
  assert.equal(plan.message, 'Forecast for your dates is ready 10 days before you leave.');
});

test('an active trip keeps today first and then shows only its remaining dates', () => {
  const weather = forecast(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  const plan = tripWeatherPlan(weather, '2026-10-17', '2026-10-21', now);
  assert.equal(plan.kind, 'active');
  assert.equal(plan.showCurrent, true);
  assert.deepEqual(plan.days.map((day) => day.date), ['2026-10-19', '2026-10-20', '2026-10-21']);
});

test('forecast advice calls out repeated rain and warm nights', () => {
  const rain = forecast(['2026-10-19', '2026-10-20', '2026-10-21']);
  const rainyPlan = tripWeatherPlan(rain, '2026-10-20', '2026-10-21', now);
  assert.equal(rainyPlan.packingTip, 'Rain most days, pack a jacket.');

  const warm = { timezone: 'Europe/Oslo', forecast: [{ date: '2026-10-20', high: 32, low: 27, icon: 'sunny-outline', condition: 'Clear' }] };
  const warmPlan = tripWeatherPlan(warm, '2026-10-20', '2026-10-20', now);
  assert.equal(warmPlan.packingTip, 'Warm nights around 27°, pack light layers.');
});
