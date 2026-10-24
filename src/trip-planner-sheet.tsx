import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { CapybaraMoment } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { parseTravelDate } from '@/src/dates';
import { destinationSuggestions } from '@/src/suggestions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PlannerProps = {
  visible: boolean;
  title: string;
  city: string;
  country: string;
  start: string;
  end: string;
  color: string;
  icon: string;
  colors: readonly string[];
  icons: readonly string[];
  inspiration: string;
  onTitleChange: (value: string) => void;
  onDestinationChange: (city: string, country: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onInspiration: () => void;
  onCreate: () => string | undefined;
  onOpenTrip: (id: string) => void;
  onClose: () => void;
};

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const oneDay = 86_400_000;

export function TripPlannerSheet(props: PlannerProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativeDriver = Platform.OS !== 'web';
  const translateY = useRef(new Animated.Value(height)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successTranslate = useRef(new Animated.Value(12)).current;
  const [createdId, setCreatedId] = useState<string>();
  const [month, setMonth] = useState(() => monthFor(props.start));
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState('');
  const destinationInput = useRef<TextInput>(null);
  const ready = Boolean(props.title.trim() && props.city.trim() && props.start && props.end);
  const maximumSheetHeight = Math.max(0, height - insets.top - 12);
  const sheetHeight = Math.min(742, maximumSheetHeight);
  const matches = useMemo(() => {
    const query = destinationQuery.trim().toLocaleLowerCase('en-US');
    return destinationSuggestions.filter((item) => !query || `${item.value} ${item.detail ?? ''}`.toLocaleLowerCase('en-US').includes(query)).slice(0, 8);
  }, [destinationQuery]);

  useEffect(() => {
    if (!props.visible) { setCreatedId(undefined); setSearchingDestination(false); return; }
    setMonth(monthFor(props.start));
    translateY.setValue(height);
    dimOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 19, stiffness: 240, mass: .8, useNativeDriver: nativeDriver }),
      Animated.timing(dimOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver }),
    ]).start();
  }, [dimOpacity, height, nativeDriver, props.visible, translateY]);

  useEffect(() => {
    if (!searchingDestination) return;
    setDestinationQuery(props.city);
    requestAnimationFrame(() => destinationInput.current?.focus());
  }, [props.city, searchingDestination]);

  useEffect(() => {
    if (!createdId) return;
    successOpacity.setValue(0); successTranslate.setValue(12);
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: nativeDriver }),
      Animated.spring(successTranslate, { toValue: 0, damping: 17, stiffness: 230, useNativeDriver: nativeDriver }),
    ]).start();
  }, [createdId, nativeDriver, successOpacity, successTranslate]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: nativeDriver }),
      Animated.timing(dimOpacity, { toValue: 0, duration: 180, useNativeDriver: nativeDriver }),
    ]).start(props.onClose);
  };
  const openTrip = (id: string) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: nativeDriver }),
      Animated.timing(dimOpacity, { toValue: 0, duration: 180, useNativeDriver: nativeDriver }),
    ]).start(() => props.onOpenTrip(id));
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 110 || gesture.vy > 1.15) dismiss();
      else Animated.spring(translateY, { toValue: 0, damping: 19, stiffness: 240, useNativeDriver: nativeDriver }).start();
    },
  }), [height, nativeDriver, translateY]);

  const selectDate = (date: Date) => {
    const value = asIso(date);
    if (!props.start || props.end) { props.onStartChange(value); props.onEndChange(''); return; }
    if (value < props.start) { props.onStartChange(value); return; }
    props.onEndChange(value);
  };
  const create = () => { if (!ready) return; const id = props.onCreate(); if (id) setCreatedId(id); };

  const openDestinationSearch = () => setSearchingDestination(true);
  const pickDestination = (city: string, country: string) => { props.onDestinationChange(city, country); setSearchingDestination(false); };

  return <Modal visible={props.visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss trip planner" onPress={dismiss} style={StyleSheet.absoluteFill}>
        <Animated.View style={[s.dim, { opacity: dimOpacity }]}/>
      </Pressable>
      <Animated.View style={[s.sheet, { height: sheetHeight, maxHeight: maximumSheetHeight, transform: [{ translateY }] }]}>
        <View {...panResponder.panHandlers} style={s.handleArea}><View style={s.handle}/></View>
        <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={searchingDestination ? 'Back to trip planner' : 'Close'} onPress={searchingDestination ? () => setSearchingDestination(false) : dismiss} style={s.closeButton}><Ionicons name={searchingDestination ? 'chevron-back' : 'close'} size={19} color={colors.muted}/></Pressable><Text style={s.headerTitle}>{searchingDestination ? 'Destination' : 'Plan a trip'}</Text><View style={s.closeButton}/></View>
        {createdId ? <Animated.View style={[s.success, { opacity: successOpacity, transform: [{ translateY: successTranslate }] }]}><CapybaraMoment size={144} variant="celebrate"/><Text style={s.successTitle}>Trip created</Text><Text style={s.successCopy}>Your plans are ready whenever you are.</Text><ScaleButton title="Open trip" onPress={() => openTrip(createdId)} icon="arrow-forward"/></Animated.View> : <>
          {searchingDestination ? <DestinationSearch input={destinationInput} query={destinationQuery} matches={matches} onQueryChange={setDestinationQuery} onPick={pickDestination}/> : <><ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <MonthCalendar month={month} start={props.start} end={props.end} color={props.color} onPrevious={() => setMonth((value) => shiftMonth(value, -1))} onNext={() => setMonth((value) => shiftMonth(value, 1))} onSelect={selectDate}/>
            <Text style={s.rangeLabel}>{rangeLabel(props.start, props.end)}</Text>
            <Reveal delay={0} visible={props.visible && !createdId}><Label>Trip name</Label><TextInput value={props.title} onChangeText={props.onTitleChange} placeholder="For example, Summer in Sicily" placeholderTextColor="#A29A90" style={s.field}/></Reveal>
            <Reveal delay={60} visible={props.visible && !createdId}><Label>Destination</Label><Pressable accessibilityRole="button" accessibilityLabel="Search for a destination" onPress={openDestinationSearch} style={s.destinationField}><Ionicons pointerEvents="none" name="location-outline" size={19} color={colors.blue}/><Text pointerEvents="none" style={[s.destinationText, !props.city && s.placeholder]}>{props.city ? [props.city, props.country].filter(Boolean).join(', ') : 'Search for a destination'}</Text><Ionicons pointerEvents="none" name="chevron-forward" size={17} color={colors.muted}/></Pressable></Reveal>
            <Reveal delay={120} visible={props.visible && !createdId}><Label>Colour</Label><View style={s.colorRow}>{props.colors.map((choice) => <Pressable key={choice} accessibilityRole="button" accessibilityState={{ selected: props.color === choice }} accessibilityLabel="Choose trip colour" onPress={() => props.onColorChange(choice)} style={[s.colorDot, { backgroundColor: choice }, props.color === choice && s.colorSelected]}>{props.color === choice ? <Ionicons name="checkmark" size={16} color="#FFFFFF"/> : null}</Pressable>)}</View></Reveal>
            <Reveal delay={180} visible={props.visible && !createdId}><Label>Trip icon</Label><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.iconRow}>{props.icons.map((choice) => <Pressable key={choice} accessibilityRole="button" accessibilityState={{ selected: props.icon === choice }} accessibilityLabel={`Choose ${choice} icon`} onPress={() => props.onIconChange(choice)} style={[s.iconChoice, props.icon === choice && { backgroundColor: `${props.color}18`, borderColor: props.color }]}><Ionicons name={choice as keyof typeof Ionicons.glyphMap} size={20} color={props.icon === choice ? props.color : colors.muted}/></Pressable>)}</ScrollView></Reveal>
            <Reveal delay={240} visible={props.visible && !createdId}><Pressable accessibilityRole="button" onPress={props.onInspiration} style={s.inspiration}><Ionicons name="sparkles-outline" size={18} color={colors.purple}/><View style={{ flex: 1 }}><Text style={s.inspirationLabel}>GET INSPIRED</Text><Text numberOfLines={1} style={s.inspirationText}>{props.inspiration}</Text></View><Ionicons name="arrow-forward" size={18} color={colors.purple}/></Pressable></Reveal>
          </ScrollView><View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}><ScaleButton title="Save trip" onPress={create} icon="checkmark" disabled={!ready}/></View></>}
        </>}
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

function MonthCalendar({ month, start, end, color, onPrevious, onNext, onSelect }: { month: Date; start: string; end: string; color: string; onPrevious: () => void; onNext: () => void; onSelect: (date: Date) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay());
  const selectedStart = dateAt(start); const selectedEnd = dateAt(end);
  const days = Array.from({ length: 42 }, (_, index) => new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index));
  return <View style={s.calendar}><View style={s.monthHead}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={onPrevious} style={s.monthButton}><Ionicons name="chevron-back" size={17} color={colors.muted}/></Pressable><Text style={s.monthTitle}>{monthNames[month.getMonth()]} {month.getFullYear()}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={onNext} style={s.monthButton}><Ionicons name="chevron-forward" size={17} color={colors.muted}/></Pressable></View><View style={s.week}>{weekDays.map((day, index) => <Text key={`${day}-${index}`} style={s.weekday}>{day}</Text>)}</View><View style={s.days}>{days.map((day) => { const value = asIso(day); const inMonth = day.getMonth() === month.getMonth(); const isStart = value === start; const isEnd = value === end; const inRange = selectedStart && selectedEnd && day > selectedStart && day < selectedEnd; return <CalendarDay key={value} date={day} muted={!inMonth} start={isStart} end={isEnd} inRange={Boolean(inRange)} color={color} onPress={() => onSelect(day)}/>; })}</View></View>;
}

function CalendarDay({ date, muted, start, end, inRange, color, onPress }: { date: Date; muted: boolean; start: boolean; end: boolean; inRange: boolean; color: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(start || end ? 1 : .6)).current;
  useEffect(() => { if (start || end) { scale.setValue(.6); Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 280, useNativeDriver: Platform.OS !== 'web' }).start(); } else scale.setValue(1); }, [end, scale, start]);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${date.getDate()} ${monthNames[date.getMonth()]}`} onPress={onPress} style={[s.dayCell, inRange && { backgroundColor: `${color}24` }]}><Animated.View style={[s.dayPill, (start || end) && { backgroundColor: color, transform: [{ scale }] }]}><Text style={[s.dayNumber, muted && s.dayMuted, (start || end) && s.daySelected]}>{date.getDate()}</Text></Animated.View></Pressable>;
}

function DestinationSearch({ input, query, matches, onQueryChange, onPick }: { input: React.RefObject<TextInput | null>; query: string; matches: typeof destinationSuggestions; onQueryChange: (value: string) => void; onPick: (city: string, country: string) => void }) {
  return <View style={s.searchWrap}>
    <View style={s.searchField}><Ionicons name="search-outline" size={19} color={colors.muted}/><TextInput ref={input} autoFocus value={query} onChangeText={onQueryChange} placeholder="Search for a destination" placeholderTextColor="#A29A90" returnKeyType="search" style={s.searchInput}/>{query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear destination search" onPress={() => onQueryChange('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.muted}/></Pressable> : null}</View>
    <Text style={s.searchHint}>{query ? 'Matching places' : 'Start with a city or destination'}</Text>
    <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={s.searchResults}>{matches.map((item) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`Choose ${item.label}`} onPress={() => onPick(item.value, item.detail ?? '')} style={({ pressed }) => [s.resultRow, pressed && s.resultPressed]}><View style={s.resultPin}><Ionicons name="location" size={17} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.resultCity}>{item.value}</Text><Text style={s.resultCountry}>{item.detail}</Text></View><Ionicons name="arrow-forward" size={16} color={colors.muted}/></Pressable>)}</ScrollView>
  </View>;
}

function Reveal({ delay, visible, children }: { delay: number; visible: boolean; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current; const translate = useRef(new Animated.Value(10)).current;
  useEffect(() => { if (!visible) { opacity.setValue(0); translate.setValue(10); return; } Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 210, delay, useNativeDriver: Platform.OS !== 'web' }), Animated.spring(translate, { toValue: 0, delay, damping: 17, stiffness: 260, useNativeDriver: Platform.OS !== 'web' })]).start(); }, [delay, opacity, translate, visible]);
  return <Animated.View style={{ opacity, transform: [{ translateY: translate }] }}>{children}</Animated.View>;
}

function Label({ children }: { children: ReactNode }) { return <Text style={s.label}>{children}</Text>; }
function ScaleButton({ title, onPress, icon, disabled = false }: { title: string; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: .97, damping: 20, stiffness: 350, useNativeDriver: Platform.OS !== 'web' }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 300, useNativeDriver: Platform.OS !== 'web' }).start()} style={{ width: '100%' }}><Animated.View style={[s.primary, disabled && s.primaryDisabled, { transform: [{ scale }] }]}><Text style={[s.primaryText, disabled && s.primaryTextDisabled]}>{title}</Text><Ionicons name={icon} size={18} color={disabled ? '#9E9A94' : '#FFFFFF'}/></Animated.View></Pressable>;
}

function dateAt(value: string) { const parsed = parseTravelDate(value); return parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : undefined; }
function monthFor(value: string) { const date = dateAt(value) || new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); }
function shiftMonth(value: Date, by: number) { return new Date(value.getFullYear(), value.getMonth() + by, 1); }
function asIso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function rangeLabel(start: string, end: string) { const first = dateAt(start); const last = dateAt(end); if (!first) return 'Choose your travel dates'; const firstCopy = `${first.getDate()} ${monthNames[first.getMonth()]}`; if (!last) return `${firstCopy}, choose an end date`; return `${firstCopy} to ${last.getDate()} ${monthNames[last.getMonth()]} ${last.getFullYear()}`; }

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' }, dim: { flex: 1, backgroundColor: 'rgba(44,31,24,.34)' }, sheet: { width: '100%', backgroundColor: '#FFFDF9', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', shadowColor: '#3D2A22', shadowOpacity: .2, shadowRadius: 26, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  handleArea: { height: 20, alignItems: 'center', justifyContent: 'center' }, handle: { height: 4, width: 38, borderRadius: 2, backgroundColor: '#D8D0C6' }, header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }, closeButton: { height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F1EB' }, headerTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 18 },
  scroll: { flex: 1 }, content: { padding: 12, paddingTop: 4, paddingBottom: 16 }, calendar: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: 18, shadowColor: '#765D4A', shadowOpacity: .06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 }, monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, monthButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F3ED' }, monthTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 15 }, week: { flexDirection: 'row' }, weekday: { width: '14.2857%', textAlign: 'center', color: '#A29A90', fontSize: 9, fontWeight: '700', marginBottom: 4 }, days: { flexDirection: 'row', flexWrap: 'wrap' }, dayCell: { width: '14.2857%', height: 30, alignItems: 'center', justifyContent: 'center' }, dayPill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, dayNumber: { color: colors.text, fontSize: 12, fontWeight: '500' }, dayMuted: { color: '#C9C1B7' }, daySelected: { color: '#FFFFFF', fontWeight: '800' }, rangeLabel: { color: '#716C64', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 12 },
  label: { color: '#7B756E', fontSize: 11, fontWeight: '700', marginBottom: 6, marginLeft: 3 }, field: { height: 50, borderRadius: 12, backgroundColor: '#F5F1EB', color: colors.text, paddingHorizontal: 14, fontSize: 15, marginBottom: 12 }, destinationField: { height: 52, borderRadius: 12, backgroundColor: '#F5F1EB', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }, destinationText: { flex: 1, color: colors.text, fontSize: 15 }, placeholder: { color: '#A29A90' }, colorRow: { flexDirection: 'row', gap: 12, marginBottom: 12, paddingHorizontal: 2 }, colorDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, colorSelected: { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#503C2F', shadowOpacity: .22, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, iconRow: { gap: 9, paddingBottom: 12 }, iconChoice: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#F5F1EB', borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' }, inspiration: { minHeight: 56, borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#F4EEFF', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }, inspirationLabel: { color: colors.purple, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, inspirationText: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 3 }, bottomBar: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE7DE', backgroundColor: '#FFFDF9' }, primary: { height: 54, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blue, shadowColor: colors.blue, shadowOpacity: .18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, primaryDisabled: { backgroundColor: '#E8E4DE', shadowOpacity: 0 }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }, primaryTextDisabled: { color: '#9E9A94' },
  searchWrap: { flex: 1, padding: 16, paddingTop: 8 }, searchField: { minHeight: 52, borderRadius: 12, backgroundColor: '#F5F1EB', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, searchInput: { flex: 1, color: colors.text, fontSize: 16, minHeight: 48 }, searchHint: { color: colors.muted, fontSize: 12, marginTop: 14, marginBottom: 8 }, searchResults: { paddingBottom: 24 }, resultRow: { minHeight: 64, borderRadius: 14, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE7DE' }, resultPressed: { opacity: .72, transform: [{ scale: .99 }] }, resultPin: { height: 34, width: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, resultCity: { color: colors.text, fontSize: 15, fontWeight: '700' }, resultCountry: { color: colors.muted, fontSize: 12, marginTop: 2 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 34 }, successTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 25, marginTop: 22 }, successCopy: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 7, marginBottom: 28, maxWidth: 260 },
});
