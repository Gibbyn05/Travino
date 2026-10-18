import test from 'node:test';
import assert from 'node:assert/strict';
import { countryInfoFor, plugCompatibility, timeDifferenceForTrip } from '../src/travel-info.ts';

const oslo = 'Europe/Oslo';

test('Norway to Thailand uses the trip date for daylight saving', () => {
  assert.equal(timeDifferenceForTrip('Asia/Bangkok', oslo, '2026-07-14')?.differenceMinutes, 300);
  assert.equal(timeDifferenceForTrip('Asia/Bangkok', oslo, '2026-07-14')?.title, '5 hours ahead');
  assert.equal(timeDifferenceForTrip('Asia/Bangkok', oslo, '2026-01-14')?.differenceMinutes, 360);
  assert.equal(timeDifferenceForTrip('Asia/Bangkok', oslo, '2026-01-14')?.title, '6 hours ahead');
});

test('European, US and half-hour destinations calculate their actual offsets', () => {
  assert.equal(timeDifferenceForTrip('Europe/Madrid', oslo, '2026-07-14')?.differenceMinutes, 0);
  assert.equal(timeDifferenceForTrip('America/New_York', oslo, '2026-10-01')?.differenceMinutes, -360);
  assert.equal(timeDifferenceForTrip('America/New_York', oslo, '2026-10-28')?.differenceMinutes, -300);
  assert.equal(timeDifferenceForTrip('Asia/Kolkata', oslo, '2026-07-14')?.differenceMinutes, 210);
  assert.equal(timeDifferenceForTrip('Asia/Kolkata', oslo, '2026-01-14')?.differenceMinutes, 270);
});

test('unknown time zones never pretend to be the same time', () => {
  assert.equal(timeDifferenceForTrip(undefined, oslo, '2026-07-14'), null);
  assert.equal(timeDifferenceForTrip('Not/AZone', oslo, '2026-07-14'), null);
});

test('plug compatibility covers Thailand, Spain, the UK, USA and Japan from Norway', () => {
  const norway = countryInfoFor('Norway');
  const thailand = countryInfoFor('Thailand');
  assert.deepEqual(thailand?.plugs, ['A', 'B', 'C', 'F', 'O']);
  assert.equal(thailand?.voltage, 230);
  assert.deepEqual(plugCompatibility(thailand, norway), { matching: ['C', 'F'], needsAdapter: false, adapterTip: undefined, voltageWarning: false });
  assert.equal(plugCompatibility(countryInfoFor('Spain'), norway)?.needsAdapter, false);
  assert.equal(plugCompatibility(countryInfoFor('United Kingdom'), norway)?.needsAdapter, true);
  assert.equal(plugCompatibility(countryInfoFor('USA'), norway)?.voltageWarning, true);
  assert.equal(plugCompatibility(countryInfoFor('Japan'), norway)?.voltageWarning, true);
});
