import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeMessages, newMessageId } from '../src/friend-chat-core.ts';

test('messages merge a confirmed delivery into its optimistic offline copy', () => {
  const optimistic = { id: 'client-id', friendship_id: 'friendship', sender_id: 'me', recipient_id: 'friend', client_id: 'client-id', body: 'See you there', created_at: '2026-10-19T10:00:00.000Z', pending: true };
  const confirmed = { ...optimistic, id: 'server-id', pending: false };
  const merged = mergeMessages([optimistic], confirmed);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'server-id');
  assert.equal(merged[0].pending, false);
});

test('messages are retained in chronological order when realtime delivery arrives', () => {
  const early = { id: '1', friendship_id: 'friendship', sender_id: 'friend', recipient_id: 'me', client_id: '1', body: 'Morning', created_at: '2026-10-19T09:00:00.000Z' };
  const late = { ...early, id: '2', client_id: '2', body: 'Ready?', created_at: '2026-10-19T10:00:00.000Z' };
  assert.deepEqual(mergeMessages([late], early).map((message) => message.id), ['1', '2']);
});

test('client message ids are valid UUID v4 values for idempotent database writes', () => {
  assert.match(newMessageId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
