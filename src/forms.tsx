// @ts-nocheck
import { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { colors } from './theme';
import { Suggestion } from './suggestions';

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) { return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={s.sheet}><View style={s.header}><Text style={s.title}>{title}</Text><Pressable onPress={onClose} hitSlop={12}><Text style={s.close}>Lukk</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={s.formContent}>{children}</ScrollView></View></KeyboardAvoidingView></Modal>; }
export function Field({ value, onChangeText, placeholder, multiline = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) { return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} style={[s.field, multiline && s.multiline]}/>; }
export function AutocompleteField({ value, onChangeText, placeholder, suggestions, onPick }: { value: string; onChangeText: (value: string) => void; placeholder: string; suggestions: Suggestion[]; onPick?: (suggestion: Suggestion) => void }) {
  const [focused, setFocused] = useState(false);
  const [remote, setRemote] = useState<Suggestion[]>([]);
  const isDestinationSearch = placeholder === 'By eller reisemål';

  useEffect(() => {
    const query = value.trim();
    if (!isDestinationSearch || query.length < 2) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=12&language=no&format=json`, { signal: controller.signal })
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
    if (!query) return [];
    return choices.filter((item) => normalise(item.label).startsWith(query) || normalise(item.label).includes(query)).sort((a, b) => Number(normalise(b.label).startsWith(query)) - Number(normalise(a.label).startsWith(query))).slice(0, 8);
  }, [value, choices]);
  const pick = (suggestion: Suggestion) => { onChangeText(suggestion.value); onPick?.(suggestion); setFocused(false); };

  return <View style={s.autocomplete}>
    <TextInput value={value} onChangeText={onChangeText} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 500)} placeholder={placeholder} placeholderTextColor={colors.muted} autoCorrect={false} style={s.field}/>
    {focused && matches.length > 0 && <View style={s.suggestions}>{matches.map((suggestion) => <Pressable key={suggestion.label} onTouchStart={() => pick(suggestion)} style={s.suggestion}><View style={{ flex: 1 }}><Text style={s.suggestionTitle}>{suggestion.value}</Text>{suggestion.detail && <Text style={s.suggestionDetail}>{suggestion.detail}</Text>}</View><Text style={s.suggestionUse}>Velg</Text></Pressable>)}</View>}
  </View>;
}
export function DateField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) { const initial = dateParts(value); const [open, setOpen] = useState(false); const [day, setDay] = useState(initial.day); const [month, setMonth] = useState(initial.month); const [year, setYear] = useState(initial.year); const show = () => { const current = dateParts(value); setDay(current.day); setMonth(current.month); setYear(current.year); setOpen(true); }; const save = () => { const safeDay = Math.min(day, new Date(year, month + 1, 0).getDate()); onChangeText(`${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`); setOpen(false); }; return <><Pressable onPress={show} style={s.dateField}><View style={{ flex: 1 }}><Text style={[s.dateValue, !value && s.datePlaceholder]}>{value ? formatDate(value) : placeholder}</Text></View><Ionicons name="calendar-outline" size={20} color={colors.teal}/></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={s.dateBackdrop}><View style={s.dateSheet}><View style={s.dateHeader}><Text style={s.dateTitle}>{placeholder}</Text><Pressable onPress={() => setOpen(false)} hitSlop={12}><Text style={s.close}>Lukk</Text></Pressable></View><View style={s.wheels}><DateColumn values={Array.from({ length: 31 }, (_, index) => ({ label: String(index + 1), value: index + 1 }))} selected={day} onPick={setDay}/><DateColumn values={months.map((label, value) => ({ label, value }))} selected={month} onPick={setMonth}/><DateColumn values={Array.from({ length: 13 }, (_, index) => ({ label: String(new Date().getFullYear() - 2 + index), value: new Date().getFullYear() - 2 + index }))} selected={year} onPick={setYear}/></View><Pressable onPress={save} style={s.dateConfirm}><Text style={s.dateConfirmText}>Velg dato</Text></Pressable></View></View></Modal></>; }
function DateColumn({ values, selected, onPick }: { values: { label: string; value: number }[]; selected: number; onPick: (value: number) => void }) { return <ScrollView style={s.dateColumn} contentContainerStyle={s.dateColumnContent} showsVerticalScrollIndicator={false}>{values.map((item) => <Pressable key={item.value} onPress={() => onPick(item.value)} style={[s.dateOption, selected === item.value && s.dateOptionActive]}><Text style={[s.dateOptionText, selected === item.value && s.dateOptionTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>; }
const normalise = (value: string) => value.toLocaleLowerCase('nb-NO').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const dateParts = (value: string) => { const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); const fallback = new Date(); return match ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : { year: fallback.getFullYear(), month: fallback.getMonth(), day: fallback.getDate() }; };
const formatDate = (value: string) => { const date = dateParts(value); return `${date.day}. ${months[date.month]} ${date.year}`; };
export const formStyles = s;
const s = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,49,45,.44)' }, sheet: { maxHeight: '92%', backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingBottom: 0, borderTopWidth: 1, borderColor: 'rgba(255,253,248,.75)', shadowColor: colors.ink, shadowOpacity: .26, shadowRadius: 28, shadowOffset: { width: 0, height: -9 }, elevation: 12 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, title: { color: colors.navy, fontSize: 28, fontWeight: '900', letterSpacing: -1 }, close: { color: colors.orange, fontSize: 15, fontWeight: '900' }, formContent: { paddingBottom: 46 }, field: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.paper, color: colors.text, fontSize: 16, fontWeight: '600', paddingHorizontal: 17, marginBottom: 13, shadowColor: colors.ink, shadowOpacity: .025, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } }, multiline: { minHeight: 108, paddingTop: 16, textAlignVertical: 'top' }, autocomplete: { position: 'relative' }, suggestions: { marginTop: -3, marginBottom: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 20, overflow: 'hidden', shadowColor: colors.ink, shadowOpacity: .13, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 9 }, suggestion: { minHeight: 60, paddingHorizontal: 17, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }, suggestionTitle: { color: colors.navy, fontSize: 15, fontWeight: '800' }, suggestionDetail: { color: colors.muted, fontSize: 12, marginTop: 3 }, suggestionUse: { color: colors.orange, fontSize: 12, fontWeight: '900' }, dateField: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.paper, paddingHorizontal: 17, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }, dateValue: { color: colors.text, fontSize: 16, fontWeight: '600' }, datePlaceholder: { color: colors.muted }, dateBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(21,49,45,.44)' }, dateSheet: { backgroundColor: colors.background, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 24, paddingBottom: 36 }, dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }, dateTitle: { color: colors.navy, fontSize: 27, fontWeight: '900', letterSpacing: -1 }, wheels: { height: 220, flexDirection: 'row', gap: 10, marginBottom: 24 }, dateColumn: { flex: 1, backgroundColor: colors.paper, borderRadius: 20, borderWidth: 1, borderColor: colors.border }, dateColumnContent: { paddingVertical: 8 }, dateOption: { minHeight: 43, alignItems: 'center', justifyContent: 'center', marginHorizontal: 7, borderRadius: 13 }, dateOptionActive: { backgroundColor: colors.lime }, dateOptionText: { color: colors.muted, fontSize: 15, fontWeight: '700' }, dateOptionTextActive: { color: colors.ink, fontWeight: '900' }, dateConfirm: { minHeight: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orange, shadowColor: colors.orange, shadowOpacity: .2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, dateConfirmText: { color: '#FFFDF8', fontSize: 16, fontWeight: '900' } });
