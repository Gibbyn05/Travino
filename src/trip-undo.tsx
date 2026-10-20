import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTravel } from './store';
import { colors } from './theme';

type Notice = { message: string };

export function useTripUndo() {
  const { selectedTrip, removeActivity, removePacking, restoreActivity, restorePacking } = useTravel();
  const [notice, setNotice] = useState<Notice | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripId = selectedTrip?.id;
  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; pending.current = null; setNotice(null);
  }, []);

  useEffect(() => {
    dismiss();
    return () => { if (timer.current) clearTimeout(timer.current); pending.current = null; };
  }, [tripId, dismiss]);

  const offerUndo = (message: string, restore: () => void) => {
    dismiss();
    pending.current = restore;
    setNotice({ message });
    timer.current = setTimeout(dismiss, 5000);
  };
  const undo = () => {
    const restore = pending.current;
    dismiss();
    restore?.();
  };
  return {
    notice,
    undo,
    removeActivity: (id: string) => {
      if (!selectedTrip) return;
      const index = selectedTrip.activities.findIndex(item => item.id === id);
      if (index < 0) return;
      const item = selectedTrip.activities[index];
      removeActivity(selectedTrip.id, id);
      offerUndo('Activity removed', () => restoreActivity(selectedTrip.id, item, index));
    },
    removePacking: (id: string) => {
      if (!selectedTrip) return;
      const index = selectedTrip.packing.findIndex(item => item.id === id);
      if (index < 0) return;
      const item = selectedTrip.packing[index];
      removePacking(selectedTrip.id, id);
      offerUndo('Item removed', () => restorePacking(selectedTrip.id, item, index));
    },
  };
}

/** Sits in the page layout above the tab bar, so it cannot cover list controls. */
export function UndoNotice({ notice, onUndo }: { notice: Notice | null; onUndo: () => void }) {
  if (!notice) return null;
  return <View style={s.notice}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.message}>{notice.message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Undo deletion" onPress={onUndo} style={({ pressed }) => [s.undo, pressed && s.pressed]}><Text style={s.undoText}>Undo</Text></Pressable>
  </View>;
}

const s = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8, marginBottom: 12, padding: 12, borderRadius: 20, backgroundColor: colors.navy },
  message: { flex: 1, minWidth: 0, color: '#FFFFFF', fontSize: 17, lineHeight: 24, fontWeight: '600' },
  undo: { minWidth: 72, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FFFFFF' },
  undoText: { color: colors.blue, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  pressed: { opacity: .72 },
});
