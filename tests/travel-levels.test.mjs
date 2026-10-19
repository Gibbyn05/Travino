import test from 'node:test';
import assert from 'node:assert/strict';
import { completedTripCount, countsTowardLevel, frameForProfile, levelForCompletedTrips, PROFILE_FRAMES } from '../src/travel-levels.ts';

const today = new Date(2026, 9, 20);
const normalTrip = (patch = {}) => ({
  id: 'normal', city: 'Lisbon', country: 'Portugal', createdAt: '2026-09-01', startDate: '2026-10-10', endDate: '2026-10-14',
  activities: [{ title: 'Walk', date: '2026-10-10' }, { title: 'Dinner', date: '2026-10-11' }, { title: 'Museum', date: '2026-10-12' }],
  memories: [{ image: 'lisbon.jpg', date: '2026-10-11' }],
  ...patch,
});

const expected = [
  [0, 1, 'Rookie Traveler', 'Weekend Wanderer', 3],
  [2, 1, 'Rookie Traveler', 'Weekend Wanderer', 1],
  [3, 2, 'Weekend Wanderer', 'Trail Finder', 2],
  [4, 2, 'Weekend Wanderer', 'Trail Finder', 1],
  [5, 3, 'Trail Finder', 'Road Tripper', 3],
  [49, 9, 'World Wanderer', 'Legend of the Road', 1],
  [50, 10, 'Legend of the Road', null, null],
  [80, 10, 'Legend of the Road', null, null],
];

for (const [trips, level, title, nextTitle, tripsLeft] of expected) {
  test(`${trips} qualifying trips maps to the correct travel level`, () => {
    assert.deepEqual(levelForCompletedTrips(trips), { level, title, threshold: [0, 3, 5, 8, 12, 17, 23, 30, 40, 50][level - 1], nextTitle, tripsLeft });
  });
}

test('a normal completed trip with a plan and a memory counts', () => {
  assert.equal(countsTowardLevel(normalTrip(), [], today), true);
  assert.equal(completedTripCount([normalTrip()], today), 1);
});

test('a trip counts after its end or only after a manual completion that follows its start', () => {
  assert.equal(countsTowardLevel(normalTrip({ endDate: '2026-10-25' }), [], today), false);
  assert.equal(countsTowardLevel(normalTrip({ endDate: '2026-10-25', completionState: 'completed', completedAt: '2026-10-12' }), [], today), true);
  assert.equal(countsTowardLevel(normalTrip({ endDate: '2026-10-25', completionState: 'completed', completedAt: '2026-10-09' }), [], today), false);
  assert.equal(countsTowardLevel(normalTrip({ completionState: 'cancelled' }), [], today), false);
});

test('one-day trips and trips without a destination do not count', () => {
  assert.equal(countsTowardLevel(normalTrip({ startDate: '2026-10-10', endDate: '2026-10-10' }), [], today), false);
  assert.equal(countsTowardLevel(normalTrip({ city: '', country: '' }), [], today), false);
});

test('a trip needs three planned activities or three days with plan content', () => {
  assert.equal(countsTowardLevel(normalTrip({ activities: [{ title: 'Walk', date: '2026-10-10' }, { title: 'Dinner', date: '2026-10-11' }] }), [], today), false);
  assert.equal(countsTowardLevel(normalTrip({ activities: [{ title: '', note: 'Morning', date: '2026-10-10' }, { title: '', note: 'Afternoon', date: '2026-10-11' }, { title: '', note: 'Evening', date: '2026-10-12' }] }), [], today), true);
});

test('a trip needs a photo or note dated within the trip', () => {
  assert.equal(countsTowardLevel(normalTrip({ memories: [] }), [], today), false);
  assert.equal(countsTowardLevel(normalTrip({ memories: [{ image: 'outside.jpg', date: '2026-10-18' }] }), [], today), false);
  assert.equal(countsTowardLevel(normalTrip({ memories: [{ caption: 'A quiet morning', date: '2026-10-11' }] }), [], today), true);
});

test('overlapping qualifying trips award credit only to the older trip', () => {
  const older = normalTrip({ id: 'older', createdAt: '2026-08-01', startDate: '2026-10-10', endDate: '2026-10-14' });
  const newer = normalTrip({ id: 'newer', createdAt: '2026-09-01', startDate: '2026-10-12', endDate: '2026-10-16' });
  assert.equal(countsTowardLevel(newer, [older], today), false);
  assert.equal(completedTripCount([newer, older], today), 1);
});

test('late-created trips need three photos inside the original dates', () => {
  const late = normalTrip({ createdAt: '2026-10-18' });
  assert.equal(countsTowardLevel(late, [], today), false);
  assert.equal(countsTowardLevel({ ...late, memories: [
    { image: 'one.jpg', date: '2026-10-10' }, { image: 'two.jpg', date: '2026-10-11' }, { image: 'three.jpg', date: '2026-10-12' },
  ] }, [], today), true);
});

test('the requested fairness data counts only the normal real trip', () => {
  const oneDay = normalTrip({ id: 'one-day', startDate: '2026-10-10', endDate: '2026-10-10' });
  const noMemory = normalTrip({ id: 'no-memory', memories: [] });
  const olderOverlap = normalTrip({ id: 'older-overlap', createdAt: '2026-07-01', startDate: '2026-10-01', endDate: '2026-10-05', activities: [{ title: 'Walk', date: '2026-10-01' }, { title: 'Dinner', date: '2026-10-02' }, { title: 'Museum', date: '2026-10-03' }], memories: [{ image: 'older.jpg', date: '2026-10-02' }] });
  const newerOverlap = normalTrip({ id: 'newer-overlap', createdAt: '2026-08-01', startDate: '2026-10-03', endDate: '2026-10-07', activities: [{ title: 'Walk', date: '2026-10-03' }, { title: 'Dinner', date: '2026-10-04' }, { title: 'Museum', date: '2026-10-05' }], memories: [{ image: 'newer.jpg', date: '2026-10-04' }] });
  const emptyTrips = Array.from({ length: 100 }, (_, index) => normalTrip({ id: `empty-${index}`, createdAt: '2026-10-20', activities: [], memories: [] }));
  assert.equal(completedTripCount([oneDay, noMemory, ...emptyTrips], today), 0);
  assert.equal(completedTripCount([normalTrip(), oneDay, noMemory, ...emptyTrips], today), 1);
  assert.equal(completedTripCount([olderOverlap, newerOverlap], today), 1);
});

test('profile frames use the current level by default and reject locked selections', () => {
  assert.equal(frameForProfile(1).id, 'classic');
  assert.equal(frameForProfile(2).id, 'sunset');
  assert.equal(frameForProfile(2, 'ocean').id, 'ocean');
  assert.equal(frameForProfile(2, 'legend').id, 'sunset');
  assert.equal(frameForProfile(10, 'legend').id, 'legend');
  assert.equal(PROFILE_FRAMES.find((frame) => frame.id === 'seasoned')?.animated, true);
});
