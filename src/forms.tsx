// @ts-nocheck
import { Children, isValidElement, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from './theme';
import { Suggestion } from './suggestions';
import { tripLength } from './dates';
import { PrimaryButton } from './ui';

const autocompleteDismissers = new Set<() => void>();
const dismissAutocompleteFields = () => autocompleteDismissers.forEach((dismiss) => dismiss());

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== 'web';
  const reduceMotion = useReducedMotion();
  const maximumHeight = Math.max(0, height - insets.top - 12);
  const nodes = Children.toArray(children);
  const last = nodes[nodes.length - 1];
  const footer = isValidElement(last) && last.type === PrimaryButton ? last : null;
  const body = footer ? nodes.slice(0, -1) : nodes;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(height);
    dimOpacity.setValue(0);
    if (reduceMotion) { translateY.setValue(0); dimOpacity.setValue(1); return; }
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 19, stiffness: 240, mass: .8, useNativeDriver: nativeDriver }),
      Animated.timing(dimOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver }),
    ]).start();
  }, [dimOpacity, height, nativeDriver, reduceMotion, translateY, visible]);

  const close = () => {
    dismissAutocompleteFields();
    if (reduceMotion) { onClose(); return; }
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: nativeDriver }),
      Animated.timing(dimOpacity, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
    ]).start(onClose);
  };

  return <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
    <KeyboardAvoidingView style={s.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={close} style={StyleSheet.absoluteFill}><Animated.View style={[s.modalDim, { opacity: dimOpacity }]}/></Pressable>
      <Animated.View style={[s.dialog, { maxHeight: maximumHeight, transform: [{ translateY }] }]}>
        <View style={s.handle}/>
        <View style={s.header}><Text style={s.title} numberOfLines={1}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={close} hitSlop={10} style={s.closeButton}><Ionicons name="close" size={18} color={colors.muted}/></Pressable></View>
        <ScrollView style={s.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={s.formContent}>{body}</ScrollView>
        {footer ? <View style={[s.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View> : null}
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);
  return reduceMotion;
}
export function Field({ value, onChangeText, placeholder, multiline = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) { return <View style={s.fieldGroup}><Text style={s.fieldLabel}>{fieldLabel(placeholder)}</Text><TextInput value={value} onChangeText={onChangeText} onFocus={dismissAutocompleteFields} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} style={[s.field, multiline && s.multiline]}/></View>; }
export function AutocompleteField({ value, onChangeText, placeholder, suggestions, onPick, showSuggestionsOnFocus = false, hideLabel = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; suggestions: Suggestion[]; onPick?: (suggestion: Suggestion) => void; showSuggestionsOnFocus?: boolean; hideLabel?: boolean }) {
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
    {!hideLabel && <Text style={s.fieldLabel}>{fieldLabel(placeholder)}</Text>}
    <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} onFocus={() => { dismissAutocompleteFields(); blurPending.current = false; if (blurTimer.current) clearTimeout(blurTimer.current); setFocused(true); }} onBlur={handleBlur} placeholder={placeholder} placeholderTextColor={colors.muted} autoCorrect={false} style={s.field}/>
    {focused && matches.length > 0 && <View style={s.suggestions}><ScrollView style={s.suggestionList} contentContainerStyle={s.suggestionsContent} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="none" showsVerticalScrollIndicator bounces={false} overScrollMode="never" removeClippedSubviews={false} onStartShouldSetResponderCapture={() => false} onTouchStartCapture={keepSuggestionsOpen} onTouchEndCapture={finishSuggestionInteraction} onScrollBeginDrag={keepSuggestionsOpen} onScrollEndDrag={finishSuggestionInteraction} onMomentumScrollBegin={keepSuggestionsOpen} onMomentumScrollEnd={finishSuggestionInteraction}>{matches.map((suggestion) => <Pressable key={suggestion.label} accessibilityRole="button" accessibilityLabel={`Choose ${suggestion.label}`} onPressIn={keepSuggestionsOpen} onPress={() => pick(suggestion)} style={s.suggestion}><View pointerEvents="none" style={{ flex: 1 }}><Text style={s.suggestionTitle}>{suggestion.value}</Text>{suggestion.detail && <Text style={s.suggestionDetail}>{suggestion.detail}</Text>}</View><Text pointerEvents="none" style={s.suggestionUse}>Choose</Text></Pressable>)}</ScrollView></View>}
  </View>;
}
export function DateField({ value, onChangeText, placeholder, minDate, rangeStart, rangeEnd, allowSameDay = false, label }: { value: string; onChangeText: (value: string) => void; placeholder: string; minDate?: string; rangeStart?: string; rangeEnd?: string; allowSameDay?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const current = dateParts(value);
  const minimum = minDate ? (allowSameDay ? dateParts(minDate) : nextDayParts(minDate)) : null;
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
  return <><View style={s.fieldGroup}><Text style={s.fieldLabel}>{label ?? fieldLabel(placeholder)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label ?? placeholder}${value ? `: ${formatDate(value)}` : ''}`} onPress={show} style={s.dateField}><View style={{ flex: 1 }}><Text style={[s.dateValue, !value && s.datePlaceholder]}>{value ? formatDate(value) : placeholder}</Text>{length ? <Text style={s.dateHint}>{length}</Text> : null}</View><Ionicons name="calendar-outline" size={20} color={colors.blue}/></Pressable></View><CalendarDateSheet visible={open} title={label ?? placeholder} selected={new Date(year, month, day)} rangeStart={rangeStart} rangeEnd={rangeEnd} minimum={minimum ? new Date(minimum.year, minimum.month, minimum.day) : undefined} onClose={() => setOpen(false)} onChoose={(next) => { setDay(next.getDate()); setMonth(next.getMonth()); setYear(next.getFullYear()); onChangeText(asIso(next)); setOpen(false); }}/></>;
}

function CalendarDateSheet({ visible, title, selected, rangeStart, rangeEnd, minimum, onClose, onChoose }: { visible: boolean; title: string; selected: Date; rangeStart?: string; rangeEnd?: string; minimum?: Date; onClose: () => void; onChoose: (date: Date) => void }) {
  const [month, setMonth] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => { if (visible) setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); }, [selected, visible]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
  const rangeFirst = dateFromValue(rangeStart); const rangeLast = dateFromValue(rangeEnd);
  const days = Array.from({ length: 42 }, (_, index) => new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index));
  const shift = (amount: number) => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + amount, 1));
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}><View style={s.dateBackdrop}><View style={s.dateSheet}><View style={s.handle}/><View style={s.dateHeader}><Text style={s.dateTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} hitSlop={10} style={s.closeButton}><Ionicons name="close" size={18} color={colors.muted}/></Pressable></View><View style={s.monthHeader}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} style={s.monthButton}><Ionicons name="chevron-back" size={18} color={colors.muted}/></Pressable><Text style={s.monthTitle}>{monthsLong[month.getMonth()]} {month.getFullYear()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} style={s.monthButton}><Ionicons name="chevron-forward" size={18} color={colors.muted}/></Pressable></View><View style={s.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={s.weekDay}>{day}</Text>)}</View><View style={s.calendarGrid}>{days.map((date) => { const value = asIso(date); const inMonth = date.getMonth() === month.getMonth(); const disabled = Boolean(minimum && date < startOfDay(minimum)); const isSelected = sameDay(date, selected); const isRangeStart = Boolean(rangeFirst && sameDay(date, rangeFirst)); const isRangeEnd = Boolean(rangeLast && sameDay(date, rangeLast)); const inRange = Boolean(rangeFirst && rangeLast && date > rangeFirst && date < rangeLast); return <Pressable key={value} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Choose ${date.getDate()} ${monthsLong[date.getMonth()]}`} onPress={() => onChoose(date)} style={[s.calendarCell, inRange && s.rangeCell]}><View style={[s.calendarPill, (isSelected || isRangeStart || isRangeEnd) && s.calendarPillSelected, disabled && s.calendarDisabled]}><Text style={[s.calendarNumber, !inMonth && s.calendarMuted, (isSelected || isRangeStart || isRangeEnd) && s.calendarNumberSelected, disabled && s.calendarDisabledText]}>{date.getDate()}</Text></View></Pressable>; })}</View></View></View></Modal>;
}
function nextDayParts(value: string) { const parts = dateParts(value); const next = new Date(parts.year, parts.month, parts.day + 1); return { year: next.getFullYear(), month: next.getMonth(), day: next.getDate() }; }
function compareParts(left: { year: number; month: number; day: number }, right: { year: number; month: number; day: number }) { return left.year - right.year || left.month - right.month || left.day - right.day; }
function DateColumn({ values, selected, onPick }: { values: { label: string; value: number }[]; selected: number; onPick: (value: number) => void }) { return <ScrollView style={s.dateColumn} contentContainerStyle={s.dateColumnContent} showsVerticalScrollIndicator={false}>{values.map((item) => <Pressable key={item.value} onPress={() => onPick(item.value)} style={[s.dateOption, selected === item.value && s.dateOptionActive]}><Text style={[s.dateOptionText, selected === item.value && s.dateOptionTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>; }
const normalise = (value: string) => value.toLocaleLowerCase('en-US').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fieldLabel = (placeholder: string) => placeholder.replace(/\s*\(optional\)/i, '');
const dateParts = (value: string) => { const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); const parsed = new Date(value); const fallback = Number.isNaN(parsed.getTime()) ? new Date() : parsed; return match ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() }; };
const formatDate = (value: string) => { const date = dateParts(value); return `${date.day} ${months[date.month]}`; };
const asIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
const dateFromValue = (value?: string) => { if (!value) return undefined; const parts = dateParts(value); return new Date(parts.year, parts.month, parts.day); };
const s = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,49,45,.44)' }, sheet: { maxHeight: '92%', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingBottom: 0, borderTopWidth: 1, borderColor: 'rgba(255,253,248,.75)', shadowColor: colors.ink, shadowOpacity: .26, shadowRadius: 28, shadowOffset: { width: 0, height: -9 }, elevation: 12 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, title: { color: colors.navy, fontSize: 28, fontWeight: '900', letterSpacing: -1 }, close: { color: colors.orange, fontSize: 15, fontWeight: '900' }, formContent: { paddingBottom: 46 }, field: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.paper, color: colors.text, fontSize: 16, fontWeight: '600', paddingHorizontal: 17, marginBottom: 13, shadowColor: colors.ink, shadowOpacity: .025, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } }, multiline: { minHeight: 108, paddingTop: 16, textAlignVertical: 'top' }, autocomplete: { position: 'relative' }, suggestions: { marginTop: -3, marginBottom: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden', shadowColor: colors.ink, shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 9 }, suggestion: { minHeight: 60, paddingHorizontal: 17, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, suggestionTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' }, suggestionDetail: { color: colors.muted, fontSize: 16, marginTop: 3 }, suggestionUse: { color: colors.orange, fontSize: 12, fontWeight: '900' }, dateField: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.paper, paddingHorizontal: 17, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, dateValue: { color: colors.text, fontSize: 16, fontWeight: '600' }, dateHint: { color: colors.muted, fontSize: 16, marginTop: 2, lineHeight: 22}, datePlaceholder: { color: colors.muted }, dateBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,49,45,.44)' }, dateSheet: { backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingBottom: 36 }, dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, dateTitle: { color: colors.navy, fontSize: 27, fontWeight: '900', letterSpacing: -1 }, wheels: { height: 220, flexDirection: 'row', gap: 10, marginBottom: 24 }, dateColumn: { flex: 1, backgroundColor: colors.paper, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, dateColumnContent: { paddingVertical: 8 }, dateOption: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginHorizontal: 7, borderRadius: 13 }, dateOptionActive: { backgroundColor: colors.lime }, dateOptionText: { color: colors.muted, fontSize: 15, fontWeight: '700' }, dateOptionTextActive: { color: colors.ink, fontWeight: '900' }, dateConfirm: { minHeight: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: .2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, dateConfirmText: { color: '#FFFDF8', fontSize: 16, fontWeight: '900' } });

Object.assign(s, StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalDim: { flex: 1, backgroundColor: 'rgba(44,31,24,.34)' },
  dialog: { width: '100%', backgroundColor: '#FFFDF9', borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', shadowColor: '#3D2A22', shadowOpacity: .2, shadowRadius: 26, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  handle: { height: 4, width: 38, borderRadius: 2, backgroundColor: '#D8D0C6', alignSelf: 'center', marginTop: 9, marginBottom: 8 },
  header: { minHeight: 48, paddingHorizontal: 16, marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F1EB', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, fontWeight: '700' },
  formScroll: { flexGrow: 0, flexShrink: 1 },
  formContent: { padding: 16, paddingTop: 8, paddingBottom: 20 },
  stickyFooter: { paddingTop: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#EEE7DE', backgroundColor: '#FFFDF9' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(29,29,40,.32)' },
  sheet: { maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 0 },
  close: { color: colors.blue, fontSize: 18, fontWeight: '600', lineHeight: 25},
  fieldGroup: { marginBottom: 12 }, fieldLabel: { color: colors.muted, fontSize: 17, lineHeight: 24, fontWeight: '700', marginBottom: 6, marginLeft: 3 },
  field: { minHeight: 64, borderWidth: 0, borderRadius: 14, backgroundColor: '#F5F1EB', color: colors.text, fontSize: 20, fontWeight: '400', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 0 },
  multiline: { minHeight: 108, paddingTop: 16, textAlignVertical: 'top' },
  suggestions: { marginTop: -3, marginBottom: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', shadowColor: colors.text, shadowOpacity: .07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  autocomplete: { position: 'relative', zIndex: 1, marginBottom: 12 },
  autocompleteActive: { zIndex: 50, elevation: 12 },
  suggestions: { zIndex: 50, elevation: 12, marginTop: -3, marginBottom: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden', shadowColor: colors.ink, shadowOpacity: .07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  suggestionList: { maxHeight: 168, flexGrow: 0 },
  suggestionTitle: { color: colors.text, fontSize: 19, fontWeight: '600' },
  suggestionUse: { color: colors.blue, fontSize: 16, fontWeight: '600' },
  dateField: { minHeight: 64, borderWidth: 0, borderRadius: 14, backgroundColor: '#F5F1EB', paddingHorizontal: 14, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateValue: { color: colors.text, fontSize: 20, fontWeight: '400' },
  dateBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(44,31,24,.34)' },
  dateSheet: { backgroundColor: '#FFFDF9', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 30 },
  dateHeader: { minHeight: 48, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dateTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, fontWeight: '700' },
  monthHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }, monthButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F1EB', alignItems: 'center', justifyContent: 'center' }, monthTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20 },
  weekRow: { flexDirection: 'row' }, weekDay: { width: '14.2857%', color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingBottom: 5, lineHeight: 20}, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, calendarCell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' }, rangeCell: { backgroundColor: colors.blueSoft }, calendarPill: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, calendarPillSelected: { backgroundColor: colors.blue }, calendarNumber: { color: colors.text, fontSize: 18, fontWeight: '500' }, calendarNumberSelected: { color: '#FFFFFF', fontWeight: '700' }, calendarMuted: { color: '#C9C1B7' }, calendarDisabled: { opacity: .3 }, calendarDisabledText: { color: '#B7B1A8' },
}));

export const formStyles = s;
