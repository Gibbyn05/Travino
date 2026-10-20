import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreItem } from '../src/restore-item.ts';

test('undo restores a packed, assigned item at its original position', () => {
  const removed = { id: 'b', title: 'Passport', done: true, category: 'Documents', person: 'Alex' };
  const current = [{ id: 'a', title: 'Charger', done: false }, { id: 'c', title: 'Jacket', done: true }];
  const restored = restoreItem(current, removed, 1);
  assert.deepEqual(restored.map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual(restored[1], removed);
  assert.equal(current.length, 2);
});

test('undo retains activity details and subsequent edits or additions', () => {
  const removed = { id: 'a', title: 'Dinner', date: '2026-12-01', startTime: '18:00', endTime: '20:00', location: 'Old town', note: 'Meet outside', participants: ['Alex'] };
  const edited = { id: 'b', title: 'Updated walk' };
  const added = { id: 'c', title: 'New activity' };
  assert.deepEqual(restoreItem([edited, added], removed, 0), [removed, edited, added]);
});

test('repeated undo cannot duplicate or overwrite an already restored item', () => {
  const current = [{ id: 'a', title: 'Edited after restoring' }];
  assert.equal(restoreItem(current, { id: 'a', title: 'Old title' }, 0), current);
});

test('undo works when the list is now shorter or empty', () => {
  const item = { id: 'a' };
  assert.deepEqual(restoreItem([], item, 9), [item]);
  assert.deepEqual(restoreItem([{ id: 'b' }], item, 9), [{ id: 'b' }, item]);
});
