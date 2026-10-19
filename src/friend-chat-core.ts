export type DirectMessage = {
  id: string;
  friendship_id: string;
  sender_id: string;
  recipient_id: string;
  client_id: string;
  body: string;
  created_at: string;
  pending?: boolean;
};

export function newMessageId() {
  // React Native does not guarantee crypto.randomUUID on every supported build.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function mergeMessages(existing: DirectMessage[], next: DirectMessage) {
  const index = existing.findIndex((message) => message.id === next.id || (message.sender_id === next.sender_id && message.client_id === next.client_id));
  const merged = index < 0 ? [...existing, { ...next, pending: false }] : existing.map((message, position) => position === index ? { ...message, ...next, pending: false } : message);
  return merged.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
}
