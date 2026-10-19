import test from 'node:test';
import assert from 'node:assert/strict';
import { countryShapesFor } from '../src/country-shapes.ts';

test('local country outlines resolve common Travino destinations without a network request', () => {
  const shapes = countryShapesFor(['Thailand', 'Norway', 'Spain', 'USA', 'Japan']);
  assert.deepEqual(shapes.map((shape) => shape.country), ['Thailand', 'Norway', 'Spain', 'USA', 'Japan']);
  assert.ok(shapes.every((shape) => shape.rings.length > 0 && shape.rings.every((ring) => ring.length >= 3)));
});
