import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, ImageSourcePropType, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboardingIllustrations } from '@/src/onboarding-illustrations';
import { PlaceSearchResult, searchPlaces } from '@/src/place-search';
import { useTravel } from '@/src/store';
import { colors, fonts } from '@/src/theme';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type IllustrationKey = keyof typeof onboardingIllustrations;

const TOTAL_STEPS = 7;
const INTRO_STEPS = [
  { title: 'Plan the good bits.', copy: 'One private place for each trip, shared with your travel friends.', illustration: 'home' },
  { title: 'Pack with less guesswork.', copy: 'Keep the small things ready before the journey begins.', illustration: 'map' },
  { title: 'Keep the little moments.', copy: 'Bring the places, photos and notes home in one travel journal.', illustration: 'plane' },
] as const;

export default function Onboarding() {
  const params = useLocalSearchParams<{ preview?: string | string[]; source?: string | string[] }>();
  const previewRequested = params.preview === '1' || params.preview === 'true';
  const preview = previewRequested && (params.source === 'settings' || __DEV__);
  const { completeOnboarding, onboarded, ready } = useTravel();
  const [step, setStep] = useState<Step>(0);
  const [transition, setTransition] = useState<{ from: Step; direction: 1 | -1 } | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [place, setPlace] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeCity, setPlaceCity] = useState<string | undefined>();
  const [placeCountry, setPlaceCountry] = useState<string | undefined>();
  const nameInput = useRef<TextInput>(null);
  const placeInput = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);
  const starting = useRef(false);
  const transitionProgress = useRef(new Animated.Value(1)).current;
  const keyboardProgress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReducedMotion();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isQuestion = step >= 3 && step <= 5;

  useEffect(() => {
    if (!preview && ready && onboarded && !starting.current) router.replace('/');
  }, [onboarded, preview, ready]);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    const timeout = setTimeout(() => {
      if (step === 3) nameInput.current?.focus();
      if (step === 5) placeInput.current?.focus();
    }, reduceMotion ? 0 : 360);
    return () => clearTimeout(timeout);
  }, [reduceMotion, step]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => Animated.timing(keyboardProgress, { toValue: 1, duration: 180, useNativeDriver: true }).start());
    const hide = Keyboard.addListener('keyboardWillHide', () => Animated.timing(keyboardProgress, { toValue: 0, duration: 180, useNativeDriver: true }).start());
    return () => { show.remove(); hide.remove(); };
  }, [keyboardProgress]);

  const closePreview = () => router.canGoBack() ? router.back() : router.replace('/');
  const transitionTo = (target: number) => {
    const next = Math.max(0, Math.min(TOTAL_STEPS - 1, target)) as Step;
    if (next === step || transition) return;
    Keyboard.dismiss();
    const direction: 1 | -1 = next > step ? 1 : -1;
    if (reduceMotion) { setStep(next); return; }
    setTransition({ from: step, direction });
    setStep(next);
    transitionProgress.setValue(0);
    Animated.timing(transitionProgress, { toValue: 1, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setTransition(null);
    });
  };
  const canAdvance = step < 3 || step === 6 || (step === 3 ? Boolean(name.trim()) : step === 4 ? age !== null : Boolean(placeQuery.trim()));
  const finish = () => {
    if (preview) { closePreview(); return; }
    if (!name.trim() || age === null || !place.trim()) return;
    starting.current = true;
    completeOnboarding({ name: name.trim(), age, place: place.trim(), city: placeCity, country: placeCountry });
    router.replace('/new-trip' as never);
  };
  const useTypedPlace = (value = placeQuery) => {
    const typedPlace = value.trim();
    if (!typedPlace) return;
    setPlace(typedPlace); setPlaceQuery(typedPlace); setPlaceCity(undefined); setPlaceCountry(undefined);
    Keyboard.dismiss();
    setTimeout(() => transitionTo(6), reduceMotion ? 0 : 180);
  };
  const choosePlace = (suggestion: PlaceSearchResult) => {
    setPlace(suggestion.label); setPlaceQuery(suggestion.label); setPlaceCity(suggestion.city); setPlaceCountry(suggestion.country);
    Keyboard.dismiss();
    setTimeout(() => transitionTo(6), reduceMotion ? 0 : 180);
  };
  const chooseAge = (value: number) => {
    setAge(value);
    setTimeout(() => transitionTo(5), reduceMotion ? 0 : 180);
  };
  const next = () => {
    if (step === 6) { finish(); return; }
    if (!canAdvance) return;
    if (step === 5) { useTypedPlace(); return; }
    transitionTo(step + 1);
  };

  const content = useMemo(() => stepContent(step, name), [name, step]);
  const slideDistance = Math.max(width, 320);
  const incomingIllustrationStyle = transition ? {
    opacity: transitionProgress,
    transform: [{ translateX: transitionProgress.interpolate({ inputRange: [0, 1], outputRange: [transition.direction * slideDistance, 0] }) }],
  } : undefined;
  const outgoingIllustrationStyle = transition ? {
    opacity: transitionProgress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
    transform: [{ translateX: transitionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -transition.direction * slideDistance] }) }],
  } : undefined;
  const keyboardIllustrationStyle = isQuestion ? { transform: [{ translateY: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }, { scale: keyboardProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }] } : undefined;

  return <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.flex}>
        <View style={[s.topBar, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
          {step < 3 ? <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => transitionTo(3)} hitSlop={10} style={s.skipButton}><Text style={s.skip}>Skip</Text></Pressable> : <View style={s.skipSpace}/>}
        </View>
        {preview ? <View style={s.previewNotice}><Ionicons name="eye-outline" size={14} color={colors.blue}/><Text style={s.previewText}>Preview only. Nothing here will be saved.</Text></View> : null}
        <ScrollView ref={scroll} style={s.flex} contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <Animated.View style={[s.copyBlock, transition ? { opacity: transitionProgress } : undefined]}>
            <Text accessibilityRole="header" style={[s.title, dark && s.textOnWhiteDarkMode]}>{content.title}</Text>
            <Text style={[s.copy, dark && s.copyOnWhiteDarkMode]}>{content.copy}</Text>
          </Animated.View>
          <View style={[s.illustrationSpace, isQuestion && s.questionIllustrationSpace]}>
            {transition ? <Animated.View pointerEvents="none" style={[s.illustrationLayer, outgoingIllustrationStyle]}><MascotIllustration source={onboardingIllustrations[stepContent(transition.from, name).illustration]} reduceMotion={reduceMotion}/></Animated.View> : null}
            <Animated.View style={[s.illustrationLayer, incomingIllustrationStyle, keyboardIllustrationStyle]}><MascotIllustration source={onboardingIllustrations[content.illustration]} reduceMotion={reduceMotion}/></Animated.View>
          </View>
          <View style={[s.questionArea, isQuestion && s.questionAreaUnderPaw]}>
            {step === 3 ? <NameQuestion input={nameInput} value={name} onChange={setName} onSubmit={() => name.trim() && transitionTo(4)}/> : null}
            {step === 4 ? <AgeQuestion value={age} onPick={chooseAge}/> : null}
            {step === 5 ? <PlaceQuestion input={placeInput} query={placeQuery} onChange={(value) => { setPlaceQuery(value); setPlace(''); setPlaceCity(undefined); setPlaceCountry(undefined); }} onPick={choosePlace} onUseTyped={useTypedPlace}/> : null}
          </View>
          <View style={s.footer}>
            {step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Previous onboarding step" onPress={() => transitionTo(step - 1)} style={({ pressed }) => [s.backButton, pressed && s.pressed]}><Ionicons name="arrow-back" size={17} color={colors.blue}/><Text style={s.backText}>Back</Text></Pressable> : <View style={s.backSpace}/>}
            <View accessible accessibilityLabel={`Step ${step + 1} of ${TOTAL_STEPS}`} style={s.progressBlock}>
              <View style={s.dots}>{Array.from({ length: TOTAL_STEPS }, (_, index) => <ProgressDot key={index} active={index === step} complete={index < step} reduceMotion={reduceMotion}/>)}</View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={step === 6 ? (preview ? 'Back to profile' : 'Start Travino') : 'Next onboarding step'} disabled={!canAdvance || Boolean(transition)} onPress={next} style={({ pressed }) => [s.primaryButton, (!canAdvance || transition) && s.primaryButtonDisabled, pressed && canAdvance && s.pressed]}>
              <Text style={s.primaryButtonText}>{step === 6 ? (preview ? 'Back to profile' : 'Start Travino') : 'Next'}</Text>
              <Ionicons name={step === 6 && preview ? 'arrow-back' : 'arrow-forward'} size={20} color="#fff"/>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function stepContent(step: Step, name: string): { title: string; copy: string; illustration: IllustrationKey } {
  if (step === 0 || step === 1 || step === 2) return INTRO_STEPS[step];
  if (step === 3) return { title: 'What should we call you?', copy: 'Type your name, then press return.', illustration: 'name' };
  if (step === 4) return { title: 'How old are you?', copy: 'Pick an age to continue.', illustration: 'age' };
  if (step === 5) return { title: 'Where are you from?', copy: 'Start typing a town or city.', illustration: 'from' };
  return { title: `Nice to meet you, ${name.trim() || 'traveller'}.`, copy: 'Travino is ready for your next trip.', illustration: 'welcome' };
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

function MascotIllustration({ source, reduceMotion }: { source: ImageSourcePropType; reduceMotion: boolean }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { bob.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -5, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [bob, reduceMotion, source]);
  return <Animated.View accessibilityLabel="Travino capybara illustration" style={[s.illustrationBob, { transform: [{ translateY: bob }] }]}><Image source={source} resizeMode="contain" style={s.illustration}/></Animated.View>;
}

function ProgressDot({ active, complete, reduceMotion }: { active: boolean; complete: boolean; reduceMotion: boolean }) {
  const width = useRef(new Animated.Value(active ? 24 : 7)).current;
  useEffect(() => { Animated.timing(width, { toValue: active ? 24 : 7, duration: reduceMotion ? 0 : 220, useNativeDriver: false }).start(); }, [active, reduceMotion, width]);
  return <Animated.View style={[s.dot, { width }, (active || complete) && s.dotDone]}/>;
}

function NameQuestion({ input, value, onChange, onSubmit }: { input: React.RefObject<TextInput | null>; value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return <View style={s.questionCard}><TextInput ref={input} autoCapitalize="words" autoCorrect={false} returnKeyType="next" accessibilityLabel="Your name" value={value} onChangeText={onChange} onSubmitEditing={onSubmit} placeholder="Your name" placeholderTextColor="#9C978F" style={s.answerInput}/></View>;
}

function AgeQuestion({ value, onPick }: { value: number | null; onPick: (age: number) => void }) {
  const ages = [16, 18, 21, 25, 30, 40, 50, 60];
  return <View style={s.questionCard}><View style={s.ageGrid}>{ages.map((age) => <Pressable key={age} accessibilityRole="button" accessibilityLabel={`Choose age ${age}${age === 60 ? ' or older' : ''}`} onPress={() => onPick(age)} style={({ pressed }) => [s.ageOption, value === age && s.ageOptionSelected, pressed && s.pressed]}><Text style={[s.ageText, value === age && s.ageTextSelected]}>{age === 60 ? '60+' : age}</Text></Pressable>)}</View></View>;
}

function PlaceQuestion({ input, query, onChange, onPick, onUseTyped }: { input: React.RefObject<TextInput | null>; query: string; onChange: (value: string) => void; onPick: (suggestion: PlaceSearchResult) => void; onUseTyped: (value?: string) => void }) {
  const [matches, setMatches] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [waitingToSearch, setWaitingToSearch] = useState(false);
  const [resultQuery, setResultQuery] = useState('');
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setMatches([]); setSearching(false); setWaitingToSearch(false); setResultQuery(''); return; }
    let active = true;
    setWaitingToSearch(true);
    const debounce = setTimeout(() => {
      setWaitingToSearch(false); setSearching(true);
      searchPlaces(term).then((results) => { if (active) { setMatches(results); setResultQuery(term); } }).catch(() => { if (active) { setMatches([]); setResultQuery(term); } }).finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(debounce); };
  }, [query]);
  const typed = query.trim();
  const resultIsCurrent = resultQuery === typed;
  const showMatches = resultIsCurrent && matches.length > 0;
  const showFallback = typed.length >= 2 && resultIsCurrent && !waitingToSearch && !searching && matches.length === 0;
  return <View style={s.questionCard}>
    <View style={s.placeInput}><Ionicons name="search-outline" size={19} color={colors.muted}/><TextInput ref={input} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search for your city or country" value={query} onChangeText={onChange} onSubmitEditing={() => typed && onUseTyped(typed)} placeholder="Town or city" placeholderTextColor="#9C978F" style={s.placeTextInput}/></View>
    {searching ? <View style={s.placeSearchStatus}><ActivityIndicator size="small" color={colors.blue}/><Text style={s.placeSearchStatusText}>Searching...</Text></View> : null}
    {showMatches ? <View style={s.suggestions}>{matches.map((suggestion) => <Pressable key={suggestion.id} accessibilityRole="button" accessibilityLabel={`Choose ${suggestion.label}`} onPress={() => onPick(suggestion)} style={({ pressed }) => [s.suggestion, pressed && s.pressed]}><View style={s.suggestionIcon}><Ionicons name="location-outline" size={17} color={colors.blue}/></View><Text style={s.suggestionTitle}>{suggestion.label}</Text><Ionicons name="arrow-forward" size={16} color={colors.blue}/></Pressable>)}</View> : null}
    {showFallback ? <Pressable accessibilityRole="button" accessibilityLabel={`Use ${typed} as your place`} onPress={() => onUseTyped(typed)} style={({ pressed }) => [s.useTypedButton, pressed && s.pressed]}><Text style={s.useTypedText}>Use &quot;{typed}&quot;</Text><Ionicons name="arrow-forward" size={15} color={colors.blue}/></Pressable> : null}
  </View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { minHeight: 54, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  textOnWhiteDarkMode: { color: colors.text },
  copyOnWhiteDarkMode: { color: colors.muted },
  skipButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  skipSpace: { width: 44 },
  previewNotice: { alignSelf: 'center', marginHorizontal: 24, marginTop: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#F4F8FD' },
  previewText: { color: '#58708B', fontSize: 11, fontWeight: '600', lineHeight: 15 },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 24 },
  copyBlock: { alignItems: 'center', paddingTop: 12 },
  title: { maxWidth: 365, color: colors.text, fontFamily: fonts.heading, fontSize: 34, lineHeight: 40, letterSpacing: -0.6, textAlign: 'center' },
  copy: { maxWidth: 340, marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  illustrationSpace: { height: 330, marginTop: 10, justifyContent: 'center', overflow: 'hidden' },
  questionIllustrationSpace: { height: 270, marginTop: 2 },
  illustrationLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  illustrationBob: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  illustration: { width: '100%', height: '100%' },
  questionArea: { minHeight: 16, alignItems: 'center' },
  questionAreaUnderPaw: { marginTop: -64 },
  questionCard: { width: '100%', maxWidth: 350 },
  answerInput: { minHeight: 58, borderRadius: 18, paddingHorizontal: 17, borderWidth: 1, borderColor: '#DEDAD3', backgroundColor: '#FFFFFF', color: colors.text, fontSize: 19, fontWeight: '600' },
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 9 },
  ageOption: { width: '22%', minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DEDAD3', backgroundColor: '#FFFFFF' },
  ageOptionSelected: { backgroundColor: colors.blue },
  ageText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  ageTextSelected: { color: '#fff' },
  placeInput: { minHeight: 58, borderRadius: 18, paddingHorizontal: 17, alignItems: 'center', flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#DEDAD3', backgroundColor: '#FFFFFF' },
  placeTextInput: { flex: 1, minHeight: 60, color: colors.text, fontSize: 16, fontWeight: '600' },
  placeSearchStatus: { minHeight: 34, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeSearchStatusText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  suggestions: { marginTop: 8, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  suggestion: { minHeight: 54, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1ECE5' },
  suggestionIcon: { width: 30, height: 30, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  suggestionTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  useTypedButton: { alignSelf: 'flex-start', minHeight: 40, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.blueSoft },
  useTypedText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  footer: { width: '100%', marginTop: 'auto', paddingTop: 14 },
  progressBlock: { alignItems: 'center', marginBottom: 16 },
  dots: { flexDirection: 'row', gap: 6, height: 7 },
  dot: { height: 7, borderRadius: 5, backgroundColor: '#DDD8D0' },
  dotDone: { backgroundColor: colors.blue },
  backButton: { alignSelf: 'center', minHeight: 36, paddingHorizontal: 6, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  backText: { color: colors.blue, fontSize: 13, fontWeight: '700' },
  backSpace: { height: 43 },
  primaryButton: { minHeight: 58, borderRadius: 19, paddingHorizontal: 20, backgroundColor: colors.blue, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  primaryButtonDisabled: { opacity: 0.42 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
