import test from 'node:test';
import assert from 'node:assert/strict';
import { tripNextStep } from '../src/trip-guidance.ts';

test('first activity leads to starter lists, then packing, then the plan', () => {
  assert.equal(tripNextStep({ activities: [], packing: [] }).target, 'add-activity');
  assert.equal(tripNextStep({ activities: [{}], packing: [] }).button, 'Create packing list');
  assert.equal(tripNextStep({ activities: [{}], packing: [{ done: false }, { done: true }] }).button, 'Continue packing');
  assert.equal(tripNextStep({ activities: [{}], packing: [{ done: true }] }).target, 'Plan');
});

test('existing lists are preserved while planning the first activity', () => {
  const trip = { activities: [], packing: [{ done: true }] };
  assert.equal(tripNextStep(trip).target, 'add-activity');
  assert.deepEqual(trip.packing, [{ done: true }]);
});

test('completed trips lead to memories instead of unfinished setup', () => {
  for (const trip of [{ activities: [], packing: [] }, { activities: [{}], packing: [{ done: false }] }]) {
    assert.equal(tripNextStep(trip, true).target, 'Memories');
  }
});
