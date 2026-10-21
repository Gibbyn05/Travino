export type ActivityDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  details: boolean;
};
export type ActivityDrafts = Record<string, Record<string, ActivityDraft>>;
const fields = ['title', 'date', 'startTime', 'endTime', 'location', 'note'] as const;

export function emptyActivityDraft(): ActivityDraft {
  return { title: '', date: '', startTime: '', endTime: '', location: '', note: '', details: false };
}

export function hasDraftContent(draft: ActivityDraft): boolean {
  return fields.some(field => draft[field].trim().length > 0);
}

export function activityDraftFor(drafts: ActivityDrafts, tripId: string, activityId = 'new'): ActivityDraft | undefined {
  const trip = Object.hasOwn(drafts, tripId) ? drafts[tripId] : undefined;
  return trip && Object.hasOwn(trip, activityId) ? trip[activityId] : undefined;
}

/** Saving or discarding one form must never remove another trip or edit draft. */
export function replaceActivityDraft(drafts: ActivityDrafts, tripId: string, activityId: string, draft?: ActivityDraft): ActivityDrafts {
  const trip = { ...(Object.hasOwn(drafts, tripId) ? drafts[tripId] : {}) };
  if (draft && hasDraftContent(draft)) return { ...drafts, [tripId]: { ...trip, [activityId]: draft } };
  delete trip[activityId];
  const next = { ...drafts };
  if (Object.keys(trip).length) return { ...next, [tripId]: trip };
  delete next[tripId];
  return next;
}

/** Keep only known fields when loading an older or damaged device cache. */
export function savedActivityDrafts(value: unknown): ActivityDrafts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: ActivityDrafts = {};
  for (const [tripId, forms] of Object.entries(value)) {
    if (!tripId || !forms || typeof forms !== 'object' || Array.isArray(forms)) continue;
    for (const [formId, raw] of Object.entries(forms)) {
      if (!formId || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const source = raw as Record<string, unknown>;
      const draft = emptyActivityDraft();
      for (const field of fields) if (typeof source[field] === 'string') draft[field] = source[field];
      draft.details = source.details === true || Boolean(draft.startTime || draft.endTime || draft.location || draft.note);
      if (hasDraftContent(draft)) {
        if (!Object.hasOwn(result, tripId)) Object.defineProperty(result, tripId, { value: {}, enumerable: true });
        Object.defineProperty(result[tripId], formId, { value: draft, enumerable: true });
      }
    }
  }
  return result;
}
