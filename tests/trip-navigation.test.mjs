import test from 'node:test';
import assert from 'node:assert/strict';
import { primaryTripTabs, tripSection, primaryTripTab } from '../src/trip-navigation.ts';

test('the four primary sections are always available', () => {
  assert.deepEqual(primaryTripTabs, ['Overview', 'Plan', 'Packing', 'More']);
  for (const section of primaryTripTabs) assert.equal(primaryTripTab(tripSection(section)), section);
});

test('existing links to extra sections open with More selected', () => {
  for (const section of ['Activities', 'Wishlist', 'Memories']) {
    assert.equal(tripSection(section), section);
    assert.equal(primaryTripTab(tripSection(section)), 'More');
  }
});

test('missing or unsupported sections return to the overview', () => {
  for (const value of [undefined, '', 'Unknown']) assert.equal(tripSection(value), 'Overview');
});
