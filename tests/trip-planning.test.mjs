import test from 'node:test';
import assert from 'node:assert/strict';
import { tripDate, isoTripDate, validTripDates, planningTrip, tripDateLabel } from '../src/trip-planning.ts';
import { invitePayload, readInvite } from '../src/invites.ts';

const now = new Date(2026, 9, 18, 12);
const trip = (id, startDate = '', endDate = '') => ({ id, startDate, endDate });

test('missing dates stay unknown rather than becoming a real travel date', () => {
  assert.equal(tripDate(''), null);
  assert.equal(tripDate(' '), null);
  assert.equal(tripDateLabel(trip('flexible')), 'Dates not set yet');
  assert.equal(validTripDates('', ''), false);
  assert.equal(validTripDates('2026-12-01', ''), false);
});

test('date ranges include same-day trips and reject reversed or impossible dates', () => {
  assert.equal(validTripDates('2026-12-01', '2026-12-01'), true);
  assert.equal(validTripDates('2026-12-01', '2026-12-07'), true);
  assert.equal(validTripDates('2026-12-07', '2026-12-01'), false);
  assert.equal(validTripDates('2026-02-30', '2026-03-02'), false);
  assert.equal(tripDate('2026-13-01'), null);
});

test('legacy dates can be edited without timezone shifts', () => {
  assert.equal(isoTripDate('18 June 2026'), '2026-06-18');
  assert.equal(isoTripDate('18.10.2026'), '2026-10-18');
  assert.equal(isoTripDate('2026-10-18'), '2026-10-18');
  assert.equal(isoTripDate('invalid'), '');
});

test('home continues a selected unfinished trip, including trips without dates', () => {
  const trips = [trip('past', '2026-06-18', '2026-06-26'), trip('flexible'), trip('later', '2026-12-01', '2026-12-07')];
  assert.equal(planningTrip(trips, 'flexible', now)?.id, 'flexible');
  assert.equal(planningTrip(trips, 'later', now)?.id, 'later');
  assert.equal(planningTrip(trips, 'past', now)?.id, 'later');
  assert.equal(trips[0].id, 'past');
});

test('home retains active trips and does not send users back to a completed trip', () => {
  const active = trip('active', '2026-10-15', '2026-10-18');
  const past = trip('past', '2026-10-10', '2026-10-17');
  assert.equal(planningTrip([past, active], undefined, now)?.id, 'active');
  assert.equal(planningTrip([past], 'past', now), undefined);
  assert.equal(planningTrip([], undefined, now), undefined);
});

test('trip invites accept undecided dates and still reject malformed invites', () => {
  const draft = { ...trip('invite'), title: 'Barcelona trip', city: 'Barcelona', country: 'Spain', members: [], wishes: [] };
  const received = readInvite(invitePayload(draft));
  assert.equal(received?.city, 'Barcelona');
  assert.equal(received?.startDate, '');
  assert.equal(received?.endDate, '');
  assert.equal(readInvite(JSON.stringify({ version: 1, title: 'Broken', city: 'Barcelona', country: 'Spain' })), null);
});
