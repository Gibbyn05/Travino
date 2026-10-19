import storage from './lib/persistent-storage';
import { DirectMessage, mergeMessages, newMessageId } from './friend-chat-core';

export { mergeMessages, newMessageId } from './friend-chat-core';
export type { DirectMessage } from './friend-chat-core';

const outboxKey = '@travino/direct-message-outbox-v1';

export type QueuedMessage = Pick<DirectMessage, 'friendship_id' | 'sender_id' | 'recipient_id' | 'client_id' | 'body' | 'created_at'>;

export async function readQueuedMessages() {
  try {
    const raw = await storage.getItem(outboxKey);
    const queued = raw ? JSON.parse(raw) : [];
    return Array.isArray(queued) ? queued as QueuedMessage[] : [];
  } catch {
    return [] as QueuedMessage[];
  }
}

export async function writeQueuedMessages(messages: QueuedMessage[]) {
  await storage.setItem(outboxKey, JSON.stringify(messages));
}

export async function enqueueMessage(message: QueuedMessage) {
  const queued = await readQueuedMessages();
  if (!queued.some((item) => item.sender_id === message.sender_id && item.client_id === message.client_id)) {
    await writeQueuedMessages([...queued, message]);
  }
}

export async function removeQueuedMessage(senderId: string, clientId: string) {
  const queued = await readQueuedMessages();
  await writeQueuedMessages(queued.filter((message) => message.sender_id !== senderId || message.client_id !== clientId));
}

/**
 * Sends every durable message for the signed-in person. Keeping this outside a
 * particular chat view means a message written offline is not stranded just
 * because the user navigates somewhere else before the connection returns.
 */
export async function flushQueuedMessages(
  senderId: string,
  send: (message: QueuedMessage) => Promise<DirectMessage | null>,
  onSent?: (message: DirectMessage) => void,
) {
  if (!senderId) return;
  const queued = (await readQueuedMessages()).filter((message) => message.sender_id === senderId);
  for (const message of queued) {
    const sent = await send(message).catch(() => null);
    if (!sent) continue;
    await removeQueuedMessage(senderId, message.client_id);
    onSent?.(sent);
  }
}

export function chatPreview(messages: DirectMessage[]) {
  const last = messages.at(-1);
  return last?.body || 'Start a quiet conversation.';
}
