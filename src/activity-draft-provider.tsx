import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import storage from './lib/persistent-storage';
import { replaceActivityDraft, savedActivityDrafts, type ActivityDraft, type ActivityDrafts } from './activity-drafts';

const storageKey = '@travino/activity-drafts-v1';
type DraftContext = {
  drafts: ActivityDrafts;
  saveDraft: (tripId: string, draft: ActivityDraft, activityId?: string) => void;
  discardDraft: (tripId: string, activityId?: string) => void;
};
const Context = createContext<DraftContext | null>(null);

/** One device-local cache survives navigation without syncing unfinished text. */
export function ActivityDraftProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<ActivityDrafts>({});
  const [ready, setReady] = useState(false);
  const latest = useRef<ActivityDrafts>({});
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    async function load() {
      let saved: ActivityDrafts = {};
      try {
        const raw = await storage.getItem(storageKey);
        if (raw) saved = savedActivityDrafts(JSON.parse(raw));
      } catch { /* An unreadable draft cache must not block the rest of the app. */ }
      if (active) { latest.current = saved; setDrafts(saved); setReady(true); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const update = useCallback((tripId: string, activityId: string, draft?: ActivityDraft) => {
    const next = replaceActivityDraft(latest.current, tripId, activityId, draft);
    const snapshot = JSON.stringify(next);
    if (snapshot === JSON.stringify(latest.current)) return;
    latest.current = next;
    setDrafts(next);
    // Queue immediately, including close/discard/save, so a slow old write cannot
    // bring back text that has already been discarded or turned into an activity.
    writes.current = writes.current.catch(() => undefined)
      .then(() => storage.setItem(storageKey, snapshot)).catch(() => undefined);
  }, []);
  const saveDraft = useCallback((tripId: string, draft: ActivityDraft, activityId = 'new') => update(tripId, activityId, draft), [update]);
  const discardDraft = useCallback((tripId: string, activityId = 'new') => update(tripId, activityId), [update]);
  const value = useMemo(() => ({ drafts, saveDraft, discardDraft }), [drafts, saveDraft, discardDraft]);
  return <Context.Provider value={value}>{ready ? children : null}</Context.Provider>;
}

export function useActivityDrafts() {
  const value = useContext(Context);
  if (!value) throw new Error('Activity drafts require ActivityDraftProvider');
  return value;
}
