import test from 'node:test';
import assert from 'node:assert/strict';
import { completedTripCount, frameForProfile, isCompletedTrip, levelForCompletedTrips, PROFILE_FRAMES } from '../src/travel-levels.ts';

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
  test(`${trips} completed trips maps to the correct travel level`, () => {
    assert.deepEqual(levelForCompletedTrips(trips), { level, title, threshold: [0, 3, 5, 8, 12, 17, 23, 30, 40, 50][level - 1], nextTitle, tripsLeft });
  });
}

test('seven completed trips stays on Trail Finder until Road Tripper at eight', () => {
  assert.deepEqual(levelForCompletedTrips(7), { level: 3, title: 'Trail Finder', threshold: 5, nextTitle: 'Road Tripper', tripsLeft: 1 });
});

test('only passed or manually completed trips count, never cancelled or planned trips', () => {
  const today = new Date(2026, 9, 19);
  assert.equal(isCompletedTrip({ endDate: '2026-10-18' }, today), true);
  assert.equal(isCompletedTrip({ endDate: '2026-10-19' }, today), false);
  assert.equal(isCompletedTrip({ endDate: '2026-10-01', completionState: 'cancelled' }, today), false);
  assert.equal(isCompletedTrip({ endDate: '2026-11-01', completionState: 'completed' }, today), true);
  assert.equal(completedTripCount([{ endDate: '2026-10-18' }, { endDate: '2026-11-01' }, { endDate: '2026-10-01', completionState: 'cancelled' }], today), 1);
});

test('profile frames use the current level by default and reject locked selections', () => {
  assert.equal(frameForProfile(1).id, 'classic');
  assert.equal(frameForProfile(2).id, 'sunset');
  assert.equal(frameForProfile(2, 'ocean').id, 'ocean');
  assert.equal(frameForProfile(2, 'legend').id, 'sunset');
  assert.equal(frameForProfile(10, 'legend').id, 'legend');
  assert.equal(PROFILE_FRAMES.find((frame) => frame.id === 'seasoned')?.animated, true);
});
