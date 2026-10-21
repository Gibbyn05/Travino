import test from 'node:test';
import assert from 'node:assert/strict';
import { activityDraftFor, emptyActivityDraft, hasDraftContent, replaceActivityDraft, savedActivityDrafts } from '../src/activity-drafts.ts';

const draft = title => ({ ...emptyActivityDraft(), title });

test('new and edited activities retain independent drafts for each trip', () => {
  let drafts = replaceActivityDraft({}, 'beach', 'new', draft('Dinner'));
  drafts = replaceActivityDraft(drafts, 'beach', 'museum', draft('Museum changes'));
  drafts = replaceActivityDraft(drafts, 'city', 'new', draft('Walking tour'));
  assert.equal(activityDraftFor(drafts, 'beach').title, 'Dinner');
  assert.equal(activityDraftFor(drafts, 'beach', 'museum').title, 'Museum changes');
  assert.equal(activityDraftFor(drafts, 'city').title, 'Walking tour');
  const saved = JSON.parse(JSON.stringify(drafts));
  assert.deepEqual(savedActivityDrafts(saved), drafts);
});

test('save/discard removes only the relevant draft without mutating the old cache', () => {
  const old = { beach: { new: draft('Dinner'), museum: draft('New name') }, city: { new: draft('Tour') } };
  const next = replaceActivityDraft(old, 'beach', 'museum');
  assert.equal(activityDraftFor(next, 'beach', 'museum'), undefined);
  assert.equal(activityDraftFor(next, 'beach').title, 'Dinner');
  assert.equal(activityDraftFor(next, 'city').title, 'Tour');
  assert.equal(activityDraftFor(old, 'beach', 'museum').title, 'New name');
  const removed = replaceActivityDraft(next, 'beach', 'new');
  assert.equal(Object.hasOwn(removed, 'beach'), false);
});

test('empty text and panel state do not create an empty draft', () => {
  assert.equal(hasDraftContent({ ...emptyActivityDraft(), title: '  ', details: true }), false);
  assert.deepEqual(replaceActivityDraft({}, 'trip', 'new', emptyActivityDraft()), {});
  assert.equal(hasDraftContent({ ...emptyActivityDraft(), date: '2027-10-23' }), true);
});

test('corrupt caches are ignored and only known string fields survive hydration', () => {
  for (const value of [null, 42, 'text', [], { trip: [] }]) assert.deepEqual(savedActivityDrafts(value), {});
  const hydrated = savedActivityDrafts({ trip: { new: { title: 'Dinner', startTime: '18:00', note: 3, extra: 'unused' }, empty: {}, invalid: [] } });
  assert.deepEqual(hydrated, { trip: { new: { ...emptyActivityDraft(), title: 'Dinner', startTime: '18:00', details: true } } });
});

test('cache keys cannot change object prototypes or expose inherited drafts', () => {
  const saved = savedActivityDrafts(JSON.parse('{"__proto__":{"new":{"title":"Trip"}},"trip":{"__proto__":{"title":"Edit"}}}'));
  assert.equal(activityDraftFor(saved, '__proto__').title, 'Trip');
  assert.equal(activityDraftFor(saved, 'trip', '__proto__').title, 'Edit');
  assert.equal(activityDraftFor({}, 'toString'), undefined);
  assert.equal(Object.getPrototypeOf(saved), Object.prototype);
  const updated = replaceActivityDraft(saved, '__proto__', 'new', draft('Updated'));
  assert.equal(activityDraftFor(updated, '__proto__').title, 'Updated');
  assert.equal(Object.getPrototypeOf(updated), Object.prototype);
});
