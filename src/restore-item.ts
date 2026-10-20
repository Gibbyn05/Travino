/** Restore just the removed item; retain edits made to the rest of the list. */
export function restoreItem<T extends { id: string }>(items: T[], item: T, index: number): T[] {
  if (items.some(current => current.id === item.id)) return items;
  const position = Math.max(0, Math.min(index, items.length));
  return [...items.slice(0, position), item, ...items.slice(position)];
}
