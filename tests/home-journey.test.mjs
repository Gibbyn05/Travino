import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Keep the app's Metro-style extensionless imports while running its pure logic in Node.
const source = new URL('../src/home-journey.ts', import.meta.url);
const require = createRequire(import.meta.url);
const api = {};
const { outputText } = ts.transpileModule(readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
new Function('require', 'exports', outputText)(name => require(fileURLToPath(new URL(`${name}.ts`, source))), api);
const { activeHomeJourney, homeJourneyGuide } = api;
const now = new Date('2026-10-30T11:00:00Z'); // 12:00 in Barcelona
const trip = (patch = {}) => ({ id: 'active', startDate: '2026-10-29', endDate: '2026-11-02', destinationTimeZone: 'Europe/Madrid', activities: [], ...patch });
const activity = (id, startTime, patch = {}) => ({ id, title: id, date: '2026-10-30', startTime, ...patch });

test('an active journey takes priority over selected future and finished trips', () => {
  const active = trip();
  assert.equal(activeHomeJourney([trip({ id: 'future', startDate: '2026-11-10', endDate: '2026-11-15' }), active], 'future', now), active);
  for (const completionState of ['completed', 'cancelled', 'canceled']) assert.equal(activeHomeJourney([trip({ completionState })], undefined, now), undefined);
  assert.equal(activeHomeJourney([trip({ startDate: '', endDate: '' })], undefined, now), undefined);
  assert.equal(activeHomeJourney([trip({ startDate: '2026-02-30' })], undefined, now), undefined);
  const second = trip({ id: 'second' });
  assert.equal(activeHomeJourney([active, second], 'second', now), second);
});

test('next activity is chronological, excludes other days and never resurfaces passed events', () => {
  const original = trip({ activities: [activity('late', '16:00'), activity('past', '09:00'), activity('lunch', '13.00'), activity('tomorrow', '08:00', { date: '2026-10-31' })] });
  const before = JSON.stringify(original);
  const result = homeJourneyGuide(original, now);
  assert.equal(result.activity.id, 'lunch');
  assert.equal(result.time, '13:00');
  assert.equal(result.day, '2026-10-30');
  assert.equal(JSON.stringify(original), before);
  assert.equal(homeJourneyGuide(original, new Date('2026-10-30T14:30:00Z')).activity.id, 'late');
});

test('an activity with a remaining end time is shown as happening now', () => {
  const result = homeJourneyGuide(trip({ activities: [activity('walk', '11:30', { endTime: '12:30' }), activity('lunch', '13:00')] }), now);
  assert.equal(result.activity.id, 'walk');
  assert.equal(result.line, "It's time for your next stop!");
  assert.equal(homeJourneyGuide(trip({ activities: [activity('done', '11:30', { endTime: '12:00' })] }), now).kind, 'plan');
});

test('empty days lead to adding, while untimed and passed plans stay available', () => {
  assert.equal(homeJourneyGuide(trip({ activities: [activity('tomorrow', '13:00', { date: '2026-10-31' })] }), now).kind, 'empty');
  for (const startTime of ['', '25:00', '09:00']) assert.equal(homeJourneyGuide(trip({ activities: [activity('today', startTime)] }), now).kind, 'plan');
});

test('activity selection and trip boundaries use the destination date and time', () => {
  const crossing = new Date('2026-10-30T23:30:00Z'); // Already Oct 31 in Tokyo
  const tokyo = trip({ destinationTimeZone: 'Asia/Tokyo', startDate: '2026-10-31', endDate: '2026-10-31', activities: [activity('yesterday', '23:00'), activity('breakfast', '09:00', { date: '2026-10-31' })] });
  assert.equal(activeHomeJourney([tokyo], undefined, crossing), tokyo);
  assert.equal(homeJourneyGuide(tokyo, crossing).day, '2026-10-31');
  assert.equal(homeJourneyGuide(tokyo, crossing).activity.id, 'breakfast');
  assert.doesNotThrow(() => homeJourneyGuide(trip({ destinationTimeZone: 'broken-zone' }), now));
});
