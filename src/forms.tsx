// @ts-nocheck
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { colors, fonts } from './theme';
import { Suggestion } from './suggestions';
import { tripLength } from './dates';

const autocompleteDismissers = new Set<() => void>();
const dismissAutocompleteFields = () => autocompleteDismissers.forEach((dismiss) => dismiss());

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) { const close = () => { dismissAutocompleteFields(); onClose(); }; return <Modal visible={visible} animationType="fade" transparent onRequestClose={close}><KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View pointerEvents="none" style={s.modalDim}/><View style={s.dialog}><View style={s.header}><Text style={[s.title, { color: colors.text, fontWeight: '700', fontSize: 23 }]} numberOfLines={1}>{title}</Text><Pressable onPress={close} hitSlop={12}><Text style={[s.close, { fontWeight: '600' }]}>Close</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false} bounces={false} alwaysBounceVertical={false} overScrollMode="never" keyboardShouldPersistTaps="always" keyboardDismissMode="none" automaticallyAdjustKeyboardInsets contentContainerStyle={s.formContent}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>; }
export function Field({ value, onChangeText, placeholder, multiline = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) { return <TextInput value={value} onChangeText={onChangeText} onFocus={dismissAutocompleteFields} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} style={[s.field, multiline && s.multiline]}/>; }
export function AutocompleteField({ value, onChangeText, placeholder, suggestions, onPick, showSuggestionsOnFocus = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; suggestions: Suggestion[]; onPick?: (suggestion: Suggestion) => void; showSuggestionsOnFocus?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [remote, setRemote] = useState<Suggestion[]>([]);
  const suggestionInteraction = useRef(false);
  const blurPending = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDestinationSearch = placeholder === 'City or destination';

  useEffect(() => {
    const dismiss = () => setFocused(false);
    autocompleteDismissers.add(dismiss);
    return () => { autocompleteDismissers.delete(dismiss); };
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (!isDestinationSearch || query.length < 2) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=12&language=en&format=json`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (!data?.results) return;
          setRemote(data.results.map((item: { name: string; country?: string; admin1?: string }) => ({
            label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
            value: item.name,
            detail: item.country,
          })));
        })
        .catch(() => undefined);
    }, 180);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [isDestinationSearch, value]);

  const choices = useMemo(() => [...remote, ...suggestions].filter((item, index, list) => list.findIndex((candidate) => normalise(candidate.label) === normalise(item.label)) === index), [remote, suggestions]);
  const matches = useMemo(() => {
    const query = normalise(value);
    if (!query) return showSuggestionsOnFocus ? choices.slice(0, 8) : [];
    return choices.filter((item) => normalise(item.label).startsWith(query) || normalise(item.label).includes(query)).sort((a, b) => Number(normalise(b.label).startsWith(query)) - Number(normalise(a.label).startsWith(query))).slice(0, 8);
  }, [value, choices, showSuggestionsOnFocus]);
  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
  }, []);

  const keepSuggestionsOpen = () => {
    suggestionInteraction.current = true;
    blurPending.current = false;
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    if (blurTimer.current) clearTimeout(blurTimer.current);
  };
  const finishSuggestionInteraction = () => {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => {
      suggestionInteraction.current = false;
      if (blurPending.current) setFocused(false);
    }, 700);
  };
  const handleBlur = () => {
    if (suggestionInteraction.current) {
      blurPending.current = false;
      return;
    }
    blurPending.current = true;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (!suggestionInteraction.current) {
      blurTimer.current = setTimeout(() => {
        if (!suggestionInteraction.current && blurPending.current) setFocused(false);
      }, 350);
    }
  };

  const pick = (suggestion: Suggestion) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    suggestionInteraction.current = false;
    blurPending.current = false;
    onChangeText(suggestion.value);
    onPick?.(suggestion);
    setFocused(false);
  };

  return <View style={[s.autocomplete, focused && s.autocompleteActive]}>
    <TextInput value={value} onChangeText={onChangeText} onFocus={() => { dismissAutocompleteFields(); blurPending.current = false; if (blurTimer.current) clearTimeout(blurTimer.current); setFocused(true); }} onBlur={handleBlur} placeholder={placeholder} placeholderTextColor={colors.muted} autoCorrect={false} style={s.field}/>
    {focused && matches.length > 0 && <View style={s.suggestions}><ScrollView style={s.suggestionList} contentContainerStyle={s.suggestionsContent} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="none" showsVerticalScrollIndicator bounces={false} overScrollMode="never" removeClippedSubviews={false} onStartShouldSetResponderCapture={() => false} onTouchStartCapture={keepSuggestionsOpen} onTouchEndCapture={finishSuggestionInteraction} onScrollBeginDrag={keepSuggestionsOpen} onScrollEndDrag={finishSuggestionInteraction} onMomentumScrollBegin={keepSuggestionsOpen} onMomentumScrollEnd={finishSuggestionInteraction}>{matches.map((suggestion) => <Pressable key={suggestion.label} onPressIn={keepSuggestionsOpen} onPress={() => pick(suggestion)} style={s.suggestion}><View pointerEvents="none" style={{ flex: 1 }}><Text style={s.suggestionTitle}>{suggestion.value}</Text>{suggestion.detail && <Text style={s.suggestionDetail}>{suggestion.detail}</Text>}</View><Text pointerEvents="none" style={s.suggestionUse}>Choose</Text></Pressable>)}</ScrollView></View>}
  </View>;
}
export function DateField({ value, onChangeText, placeholder, minDate, rangeStart, rangeEnd }: { value: string; onChangeText: (value: string) => void; placeholder: string; minDate?: string; rangeStart?: string; rangeEnd?: string }) {
  const [open, setOpen] = useState(false);
  const current = dateParts(value);
  const minimum = minDate ? nextDayParts(minDate) : null;
  const [day, setDay] = useState(current.day);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const show = () => {
    dismissAutocompleteFields();
    const selected = dateParts(value);
    const clamped = minimum && compareParts(selected, minimum) < 0 ? minimum : selected;
    setDay(clamped.day); setMonth(clamped.month); setYear(clamped.year); setOpen(true);
  };
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dayMinimum = minimum && year === minimum.year && month === minimum.month ? minimum.day : 1;
  const monthOptions = months.map((label, value) => ({ label, value })).filter((item) => !minimum || year > minimum.year || (year === minimum.year && item.value >= minimum.month));
  const now = new Date().getFullYear();
  const firstYear = minimum ? Math.min(now - 2, minimum.year) : now - 2;
  const lastYear = minimum ? Math.max(now + 10, minimum.year + 10) : now + 10;
  const yearOptions = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index).filter((item) => !minimum || item >= minimum.year).map((item) => ({ label: String(item), value: item }));
  const chooseYear = (nextYear: number) => {
    setYear(nextYear);
    const nextMonth = minimum && nextYear === minimum.year && month < minimum.month ? minimum.month : month;
    if (nextMonth !== month) setMonth(nextMonth);
    const firstDay = minimum && nextYear === minimum.year && nextMonth === minimum.month ? minimum.day : 1;
    setDay((selectedDay) => Math.max(firstDay, Math.min(selectedDay, new Date(nextYear, nextMonth + 1, 0).getDate())));
  };
  const chooseMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    if (minimum && year === minimum.year && nextMonth === minimum.month && day < minimum.day) setDay(minimum.day);
    setDay((selectedDay) => Math.min(selectedDay, new Date(year, nextMonth + 1, 0).getDate()));
  };
  const save = () => {
    const safeDay = Math.max(dayMinimum, Math.min(day, lastDay));
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    if (minDate && iso <= minDate) return;
    onChangeText(iso); setOpen(false);
  };
  const length = tripLength(rangeStart, rangeEnd);
  return <><Pressable onPress={show} style={s.dateField}><View style={{ flex: 1 }}><Text style={[s.dateValue, !value && s.datePlaceholder]}>{value ? formatDate(value) : placeholder}</Text>{length ? <Text style={s.dateHint}>{length}</Text> : null}</View><Ionicons name="calendar-outline" size={20} color={colors.teal}/></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={s.dateBackdrop}><View style={s.dateSheet}><View style={s.dateHeader}><Text style={s.dateTitle}>{placeholder}</Text><Pressable onPress={() => setOpen(false)} hitSlop={12}><Text style={s.close}>Close</Text></Pressable></View><View style={s.wheels}><DateColumn values={Array.from({ length: lastDay - dayMinimum + 1 }, (_, index) => ({ label: String(dayMinimum + index), value: dayMinimum + index }))} selected={day} onPick={setDay}/><DateColumn values={monthOptions} selected={month} onPick={chooseMonth}/><DateColumn values={yearOptions} selected={year} onPick={chooseYear}/></View><Pressable onPress={save} style={s.dateConfirm}><Text style={s.dateConfirmText}>Choose date</Text></Pressable></View></View></Modal></>;
}
function nextDayParts(value: string) { const parts = dateParts(value); const next = new Date(parts.year, parts.month, parts.day + 1); return { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() }; }
function compareParts(left: { year: number; month: number; day: number }, right: { year: number; month: number; day: number }) { return left.year - right.year || left.month - right.month || left.day - right.day; }
function DateColumn({ values, selected, onPick }: { values: { label: string; value: number }[]; selected: number; onPick: (value: number) => void }) { return <ScrollView style={s.dateColumn} contentContainerStyle={s.dateColumnContent} showsVerticalScrollIndicator={false}>{values.map((item) => <Pressable key={item.value} onPress={() => onPick(item.value)} style={[s.dateOption, selected === item.value && s.dateOptionActive]}><Text style={[s.dateOptionText, selected === item.value && s.dateOptionTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>; }
const normalise = (value: string) => value.toLocaleLowerCase('en-US').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateParts = (value: string) => { const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); const fallback = new Date(); return match ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() }; };
const formatDate = (value: string) => { const date = dateParts(value); return `${date.day} ${months[date.month]}`; };
const s = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,49,45,.44)' }, sheet: { maxHeight: '92%', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingBottom: 0, borderTopWidth: 1, borderColor: 'rgba(255,253,248,.75)', shadowColor: colors.ink, shadowOpacity: .26, shadowRadius: 28, shadowOffset: { width: 0, height: -9 }, elevation: 12 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, title: { color: colors.navy, fontSize: 28, fontWeight: '900', letterSpacing: -1 }, close: { color: colors.orange, fontSize: 15, fontWeight: '900' }, formContent: { paddingBottom: 46 }, field: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.paper, color: colors.text, fontSize: 16, fontWeight: '600', paddingHorizontal: 17, marginBottom: 13, shadowColor: colors.ink, shadowOpacity: .025, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } }, multiline: { minHeight: 108, paddingTop: 16, textAlignVertical: 'top' }, autocomplete: { position: 'relative' }, suggestions: { marginTop: -3, marginBottom: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden', shadowColor: colors.ink, shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 9 }, suggestion: { minHeight: 60, paddingHorizontal: 17, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, suggestionTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' }, suggestionDetail: { color: colors.muted, fontSize: 12, marginTop: 3 }, suggestionUse: { color: colors.orange, fontSize: 12, fontWeight: '900' }, dateField: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.paper, paddingHorizontal: 17, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, dateValue: { color: colors.text, fontSize: 16, fontWeight: '600' }, dateHint: { color: colors.muted, fontSize: 11, marginTop: 2 }, datePlaceholder: { color: colors.muted }, dateBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,49,45,.44)' }, dateSheet: { backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingBottom: 36 }, dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, dateTitle: { color: colors.navy, fontSize: 27, fontWeight: '900', letterSpacing: -1 }, wheels: { height: 220, flexDirection: 'row', gap: 10, marginBottom: 24 }, dateColumn: { flex: 1, backgroundColor: colors.paper, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, dateColumnContent: { paddingVertical: 8 }, dateOption: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginHorizontal: 7, borderRadius: 13 }, dateOptionActive: { backgroundColor: colors.lime }, dateOptionText: { color: colors.muted, fontSize: 15, fontWeight: '700' }, dateOptionTextActive: { color: colors.ink, fontWeight: '900' }, dateConfirm: { minHeight: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: .2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, dateConfirmText: { color: '#FFFDF8', fontSize: 16, fontWeight: '900' } });

Object.assign(s, StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22 },
  modalDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29,29,40,.48)' },
  dialog: { width: '100%', maxWidth: 520, maxHeight: '86%', backgroundColor: colors.surface, borderRadius: 26, paddingHorizontal: 22, paddingTop: 21, paddingBottom: 8, shadowColor: colors.ink, shadowOpacity: .18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  header: { marginBottom: 18 },
  formContent: { paddingBottom: 16 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(29,29,40,.32)' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, fontWeight: '700', letterSpacing: -.45 },
  close: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  field: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, color: colors.text, fontSize: 16, fontWeight: '400', paddingHorizontal: 16, marginBottom: 13 },
  multiline: { minHeight: 108, paddingTop: 16, textAlignVertical: 'top' },
  suggestions: { marginTop: -3, marginBottom: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', shadowColor: colors.text, shadowOpacity: .07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  autocomplete: { position: 'relative', zIndex: 1 },
  autocompleteActive: { zIndex: 50, elevation: 12 },
  suggestions: { zIndex: 50, elevation: 12 },
  suggestionList: { maxHeight: 168, flexGrow: 0 },
  suggestionTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  suggestionUse: { color: colors.blue, fontSize: 12, fontWeight: '600' },
  dateField: { minHeight: 56, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 16, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateValue: { color: colors.text, fontSize: 16, fontWeight: '400' },
  dateBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(29,29,40,.32)' },
  dateSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  dateTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, fontWeight: '700', letterSpacing: -.45 },
  dateColumn: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  dateOptionActive: { backgroundColor: colors.blueSoft },
  dateOptionTextActive: { color: colors.blue, fontWeight: '700' },
  dateConfirm: { minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  dateConfirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
}));

export const formStyles = s;
