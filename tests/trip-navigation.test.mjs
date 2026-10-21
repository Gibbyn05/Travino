import test from 'node:test';
import assert from 'node:assert/strict';
import { primaryTripTabs, tripSection, primaryTripTab, savedTripSections } from '../src/trip-navigation.ts';

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

test('saved sections keep each trip independent and retain More subsections', () => {
  assert.deepEqual(savedTripSections({ beach: 'Packing', city: 'Plan', weekend: 'Wishlist' }), {
    beach: 'Packing', city: 'Plan', weekend: 'Wishlist',
  });
});

test('invalid or old preferences cannot become trip sections', () => {
  for (const value of [null, 'Packing', [], 4]) assert.deepEqual(savedTripSections(value), {});
  assert.deepEqual(savedTripSections({ a: 'Deleted tab', b: null, c: 3, '': 'Plan', good: 'More' }), { good: 'More' });
});
