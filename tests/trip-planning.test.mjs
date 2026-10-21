import test from 'node:test';
import assert from 'node:assert/strict';
import { daysTrip, tripDayStatus, tripDate, isoTripDate, validTripDates, planningTrip, tripDateLabel } from '../src/trip-planning.ts';
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


test('Days keeps an active journey ahead of a later departure and ignores finished trips', () => {
  const active = trip('active', '2026-10-16', '2026-10-20');
  const later = trip('later', '2026-10-23', '2026-10-25');
  const tomorrow = trip('tomorrow', '2026-10-19', '2026-10-20');
  assert.equal(daysTrip([later, active], 'later', now)?.id, 'active');
  assert.equal(daysTrip([later, tomorrow], undefined, now)?.id, 'tomorrow');
  assert.equal(daysTrip([{ ...active, completionState: 'completed' }, later], undefined, now)?.id, 'later');
  assert.equal(daysTrip([trip('past', '2026-10-01', '2026-10-02'), trip('undated')], undefined, now), undefined);
  assert.equal(daysTrip([trip('reversed', '2026-10-22', '2026-10-20')], undefined, now), undefined);
});

test('Days status explains departure, countdown, and the current day without a zero', () => {
  assert.equal(tripDayStatus(trip('today', '2026-10-18', '2026-10-20'), now), 'You leave today');
  assert.equal(tripDayStatus(trip('tomorrow', '2026-10-19', '2026-10-20'), now), '1 day to go');
  assert.equal(tripDayStatus(trip('later', '2026-10-21', '2026-10-23'), now), '3 days to go');
  assert.equal(tripDayStatus(trip('active', '2026-10-16', '2026-10-20'), now), 'Day 3 of 5');
  assert.equal(tripDayStatus(trip('past', '2026-10-01', '2026-10-02'), now), 'Trip complete');
  assert.equal(tripDayStatus(trip('undated'), now), 'Dates not set');
});
