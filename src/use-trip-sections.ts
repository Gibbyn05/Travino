import { useCallback, useEffect, useRef, useState } from 'react';
import storage from './lib/persistent-storage';
import { savedTripSections, tripSection, type TripSection, type TripSections } from './trip-navigation';

const storageKey = '@travino/trip-sections-v1';

/** Navigation is a preference on this device, separate from shared trip data. */
export function useTripSections() {
  const [ready, setReady] = useState(false);
  const sections = useRef<TripSections>({});
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    async function load() {
      let saved: TripSections = {};
      try {
        const raw = await storage.getItem(storageKey);
        if (raw) saved = savedTripSections(JSON.parse(raw));
      } catch { /* An unreadable preference should not block opening a trip. */ }
      if (active) { sections.current = saved; setReady(true); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const sectionFor = useCallback((tripId: string) => tripSection(sections.current[tripId]), []);
  const rememberSection = useCallback((tripId: string, section: TripSection) => {
    if (sections.current[tripId] === section) return;
    sections.current = { ...sections.current, [tripId]: section };
    const snapshot = JSON.stringify(sections.current);
    // Keep rapid tab changes in order, including when device storage is slow.
    writes.current = writes.current.catch(() => undefined)
      .then(() => storage.setItem(storageKey, snapshot)).catch(() => undefined);
  }, []);

  return { ready, sectionFor, rememberSection };
}
