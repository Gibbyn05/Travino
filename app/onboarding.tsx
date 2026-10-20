import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Suggestion, destinationSuggestions } from '@/src/suggestions';
import { useTravel } from '@/src/store';
import { colors, fonts } from '@/src/theme';
import { CapybaraMoment, PrimaryButton } from '@/src/ui';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type MascotRole = 'trip' | 'packing' | 'memories' | 'name' | 'age' | 'place' | 'welcome';

const TOTAL_STEPS = 7;
const introPages = [
  { title: 'Plan the good bits.', copy: 'One private place for each trip, shared with your travel friends.', role: 'trip' as MascotRole },
  { title: 'Pack with less guesswork.', copy: 'A calm list shows what is ready and what still needs a place in the suitcase.', role: 'packing' as MascotRole },
  { title: 'Keep the little moments.', copy: 'Turn the places, photos and notes from each trip into a book worth reopening.', role: 'memories' as MascotRole },
];

const homeSuggestions: Suggestion[] = [
  ['Oslo', 'Norway'], ['Bergen', 'Norway'], ['Trondheim', 'Norway'], ['Stockholm', 'Sweden'], ['Copenhagen', 'Denmark'], ['London', 'United Kingdom'], ['New York', 'USA'], ['Tokyo', 'Japan'],
].map(([city, country]) => ({ label: `${city}, ${country}`, value: `${city}, ${country}`, detail: country }));

export default function Onboarding() {
  const params = useLocalSearchParams<{ preview?: string | string[] }>();
  const preview = params.preview === '1' || params.preview === 'true';
  const { completeOnboarding, onboarded, ready } = useTravel();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [place, setPlace] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const nameInput = useRef<TextInput>(null);
  const placeInput = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);
  const starting = useRef(false);
  const reduceMotion = useReducedMotion();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!preview && ready && onboarded && !starting.current) router.replace('/');
  }, [onboarded, preview, ready]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    const timeout = setTimeout(() => {
      if (step === 3) nameInput.current?.focus();
      if (step === 5) placeInput.current?.focus();
    }, reduceMotion ? 0 : 260);
    return () => clearTimeout(timeout);
  }, [reduceMotion, step]);

  const closePreview = () => router.canGoBack() ? router.back() : router.replace('/');
  const goTo = (next: number) => { Keyboard.dismiss(); setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, next)) as Step); };
  const canAdvance = step < 3 || step === 6 || (step === 3 ? Boolean(name.trim()) : step === 4 ? age !== null : Boolean(place.trim()));
  const finish = () => {
    if (preview) { closePreview(); return; }
    if (!name.trim() || age === null || !place.trim()) return;
    starting.current = true;
    completeOnboarding({ name: name.trim(), age, place: place.trim() });
    router.replace('/new-trip' as never);
  };
  const next = () => step === 6 ? finish() : canAdvance ? goTo(step + 1) : undefined;
  const chooseAge = (value: number) => { setAge(value); setTimeout(() => goTo(5), reduceMotion ? 0 : 300); };
  const choosePlace = (suggestion: Suggestion) => {
    setPlace(suggestion.label); setPlaceQuery(suggestion.label); Keyboard.dismiss();
    setTimeout(() => goTo(6), reduceMotion ? 0 : 300);
  };
  const title = step < 3 ? introPages[step].title : step === 3 ? 'What should we call you?' : step === 4 ? 'How old are you?' : step === 5 ? 'Where are you from?' : `Nice to meet you, ${name.trim() || 'traveller'}.`;
  const copy = step < 3 ? introPages[step].copy : step === 3 ? 'Your name stays with your trips and invitations.' : step === 4 ? 'This helps Travino keep the welcome personal.' : step === 5 ? 'Choose a city or country to make the details feel closer to home.' : 'Travino is ready for your next trip.';
  const role: MascotRole = step < 3 ? introPages[step].role : step === 3 ? 'name' : step === 4 ? 'age' : step === 5 ? 'place' : 'welcome';

  return <SafeAreaView style={[s.safe, dark && s.safeDark]} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scroll} style={s.flex} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
        <View style={s.brandRow}>
          <Text accessibilityRole="header" style={[s.brand, dark && s.lightText]}>Travino</Text>
          {step < 3 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Skip introduction" onPress={() => goTo(3)} hitSlop={10} style={s.skipButton}><Text style={s.skip}>Skip</Text></Pressable>
          ) : <View style={s.skipSpace}/>}
        </View>
        {preview && <View style={s.previewNotice}><Ionicons name="eye-outline" size={16} color={colors.blue}/><Text style={s.previewText}>Preview mode. Nothing you enter here will be saved.</Text></View>}
        <View style={s.progressRow} accessibilityLabel={`Step ${step + 1} of ${TOTAL_STEPS}`}>
          <Text style={[s.stepLabel, dark && s.mutedOnDark]}>Step {step + 1} of {TOTAL_STEPS}</Text>
          <View style={s.dots}>{Array.from({ length: TOTAL_STEPS }, (_, index) => <ProgressDot key={index} active={index === step} complete={index < step} reduceMotion={reduceMotion}/>)}</View>
        </View>
        <View style={s.stage}>
          <OnboardingMascot role={role} reduceMotion={reduceMotion}/>
          <Reveal step={step} delay={0} reduceMotion={reduceMotion}><Text accessibilityRole="header" style={[s.title, dark && s.lightText]}>{title}</Text></Reveal>
          <Reveal step={step} delay={80} reduceMotion={reduceMotion}><Text style={[s.copy, dark && s.mutedOnDark]}>{copy}</Text></Reveal>
          <Reveal step={step} delay={150} reduceMotion={reduceMotion} style={s.exampleWrap}>
            {step === 0 ? <TicketPreview step={step} reduceMotion={reduceMotion}/> : null}
            {step === 1 ? <PackingPreview step={step} reduceMotion={reduceMotion}/> : null}
            {step === 2 ? <MemoryPreview step={step} reduceMotion={reduceMotion}/> : null}
            {step === 3 ? <NameQuestion input={nameInput} value={name} onChange={setName} onSubmit={() => name.trim() && goTo(4)} dark={dark}/> : null}
            {step === 4 ? <AgeQuestion value={age} onPick={chooseAge} dark={dark}/> : null}
            {step === 5 ? <PlaceQuestion input={placeInput} query={placeQuery} onChange={(value) => { setPlaceQuery(value); setPlace(''); }} onPick={choosePlace} dark={dark}/> : null}
            {step === 6 ? <WelcomeCard name={name} age={age} place={place} /> : null}
          </Reveal>
        </View>
        <Reveal step={step} delay={230} reduceMotion={reduceMotion} style={s.footer}>
          <View style={s.footerRow}>
            {step > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Previous onboarding step" onPress={() => goTo(step - 1)} style={s.backButton}><Ionicons name="arrow-back" size={17} color={colors.blue}/><Text style={s.backText}>Back</Text></Pressable>
            ) : <View style={s.backSpace}/>}
            <Text style={[s.footerHint, dark && s.mutedOnDark]}>{step < 3 ? 'A short tour, then a few quick questions.' : step === 6 ? 'Your answers are saved when you start.' : 'Press return or choose an answer to continue.'}</Text>
            <View style={s.backSpace}/>
          </View>
          <PrimaryButton title={step === 6 ? (preview ? 'Back to profile' : 'Start Travino') : 'Next'} icon={step === 6 ? (preview ? 'arrow-back' : 'arrow-forward') : 'arrow-forward'} disabled={!canAdvance} onPress={next}/>
        </Reveal>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
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

function Reveal({ children, step, delay, reduceMotion, style }: { children: React.ReactNode; step: number; delay: number; reduceMotion: boolean; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    opacity.setValue(0); translateY.setValue(reduceMotion ? 0 : 12);
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 160 : 230, delay: reduceMotion ? 0 : delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay: reduceMotion ? 0 : delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, reduceMotion, step, translateY]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Swap this one component when the final Travino mascot is ready. */
function OnboardingMascot({ role, reduceMotion }: { role: MascotRole; reduceMotion: boolean }) {
  const y = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const pointsToField = role === 'name' || role === 'age' || role === 'place';
  useEffect(() => {
    const target = pointsToField ? 40 : 0;
    y.setValue(reduceMotion ? target : -16);
    const enter = Animated.timing(y, { toValue: target, duration: reduceMotion ? 150 : 300, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    enter.start();
    if (reduceMotion) { bob.setValue(0); return () => enter.stop(); }
    const idle = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    idle.start();
    return () => { enter.stop(); idle.stop(); };
  }, [bob, pointsToField, reduceMotion, role, y]);
  return <Animated.View accessibilityLabel={pointsToField ? 'Travino mascot points to the answer field' : 'Travino mascot'} style={[s.mascotSlot, { transform: [{ translateY: Animated.add(y, bob) }] }]}>
    <CapybaraMoment size={pointsToField ? 70 : 82} waving={role === 'trip' || role === 'welcome'}/>
    {pointsToField ? <View style={s.mascotPointer}><Ionicons name="arrow-down" size={17} color={colors.blue}/></View> : null}
  </Animated.View>;
}

function ProgressDot({ active, complete, reduceMotion }: { active: boolean; complete: boolean; reduceMotion: boolean }) {
  const width = useRef(new Animated.Value(active ? 24 : 7)).current;
  useEffect(() => { Animated.timing(width, { toValue: active ? 24 : 7, duration: reduceMotion ? 0 : 220, useNativeDriver: false }).start(); }, [active, reduceMotion, width]);
  return <Animated.View style={[s.dot, { width }, (active || complete) && s.dotDone]}/>;
}

function CardReveal({ children, step, delay, reduceMotion }: { children: React.ReactNode; step: number; delay: number; reduceMotion: boolean }) { return <Reveal step={step} delay={delay} reduceMotion={reduceMotion}>{children}</Reveal>; }

function TicketPreview({ step, reduceMotion }: { step: number; reduceMotion: boolean }) {
  return <View style={[s.previewCard, s.ticketCard]}>
    <CardReveal step={step} delay={190} reduceMotion={reduceMotion}><View style={s.ticketTop}><View style={s.ticketIcon}><Ionicons name="airplane" size={17} color="#fff"/></View><View style={s.flex}><Text style={s.ticketPlace}>LISBON, PORTUGAL</Text><Text style={s.ticketTitle}>A long weekend away</Text></View><View style={s.upcomingBadge}><Text style={s.upcomingText}>Upcoming</Text></View></View></CardReveal>
    <CardReveal step={step} delay={250} reduceMotion={reduceMotion}><Text style={s.ticketCountdown}>Starts in 12 days</Text></CardReveal>
    <CardReveal step={step} delay={310} reduceMotion={reduceMotion}><View style={s.ticketProgressHead}><Text style={s.previewMuted}>PACKED</Text><Text style={s.previewStrong}>3 of 8</Text></View><View style={s.progressTrack}><View style={[s.progressFill, { width: '38%' }]}/></View></CardReveal>
  </View>;
}

function PackingPreview({ step, reduceMotion }: { step: number; reduceMotion: boolean }) {
  const [checked, setChecked] = useState(0);
  useEffect(() => { setChecked(0); if (reduceMotion) { setChecked(3); return; } const timers = [320, 650, 980].map((delay, index) => setTimeout(() => setChecked(index + 1), delay)); return () => timers.forEach(clearTimeout); }, [reduceMotion, step]);
  return <View style={[s.previewCard, s.packingCard]}><View style={s.previewHeader}><View><Text style={s.previewLabel}>PACKING LIST</Text><Text style={s.previewHeading}>Ready for Lisbon</Text></View><View style={s.checkCount}><Ionicons name="checkmark" size={14} color="#fff"/><Text style={s.checkCountText}>{checked}</Text></View></View>{['Passport', 'Light jacket', 'Charger'].map((item, index) => <View style={s.checkRow} key={item}><Ionicons name={index < checked ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={index < checked ? colors.teal : colors.border}/><Text style={[s.checkText, index >= checked && s.checkTextMuted]}>{item}</Text>{index === 2 ? <Text style={s.youBring}>You</Text> : null}</View>)}<View style={s.notification}><View style={s.notificationIcon}><Ionicons name="notifications-outline" size={16} color={colors.blue}/></View><View style={s.flex}><Text style={s.notificationTitle}>Travino</Text><Text style={s.notificationCopy}>Mia packed the sunscreen.</Text></View></View></View>;
}

function MemoryPreview({ step, reduceMotion }: { step: number; reduceMotion: boolean }) {
  const heart = useRef(new Animated.Value(0.85)).current;
  useEffect(() => { if (reduceMotion) { heart.setValue(1); return; } const animation = Animated.loop(Animated.sequence([Animated.timing(heart, { toValue: 1.14, duration: 450, useNativeDriver: true }), Animated.timing(heart, { toValue: 1, duration: 450, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, [heart, reduceMotion, step]);
  return <View style={[s.previewCard, s.memoryCard]}><View style={s.memorySky}><View style={s.memorySun}/><Ionicons name="location" size={22} color="#fff" style={s.memoryPin}/><Text style={s.memoryLocation}>MADEIRA</Text></View><View style={s.memoryDetails}><View style={s.memoryDate}><Text style={s.memoryDateDay}>19</Text><Text style={s.memoryDateMonth}>OCT</Text></View><View style={s.flex}><Text style={s.previewHeading}>The swim before breakfast</Text><Text style={s.memoryCopy}>A quiet morning worth keeping.</Text></View><Animated.View style={{ transform: [{ scale: heart }] }}><Ionicons name="heart" size={20} color={colors.coral}/></Animated.View></View></View>;
}

function NameQuestion({ input, value, onChange, onSubmit, dark }: { input: React.RefObject<TextInput | null>; value: string; onChange: (value: string) => void; onSubmit: () => void; dark: boolean }) { return <View style={s.questionCard}><Text style={[s.fieldLabel, dark && s.mutedOnDark]}>YOUR NAME</Text><TextInput ref={input} autoCapitalize="words" autoCorrect={false} returnKeyType="next" accessibilityLabel="Your name" value={value} onChangeText={onChange} onSubmitEditing={onSubmit} placeholder="For example, Mia" placeholderTextColor="#9C978F" style={[s.answerInput, dark && s.answerInputDark]}/></View>; }

function AgeQuestion({ value, onPick, dark }: { value: number | null; onPick: (age: number) => void; dark: boolean }) { const ages = [16, 18, 21, 25, 30, 40, 50, 60]; return <View style={s.questionCard}><Text style={[s.fieldLabel, dark && s.mutedOnDark]}>PICK AN AGE</Text><View style={s.ageGrid}>{ages.map((age) => <Pressable key={age} accessibilityRole="button" accessibilityLabel={`Choose age ${age}${age === 60 ? ' or older' : ''}`} onPress={() => onPick(age)} style={({ pressed }) => [s.ageOption, value === age && s.ageOptionSelected, pressed && s.pressed]}><Text style={[s.ageText, value === age && s.ageTextSelected]}>{age === 60 ? '60+' : age}</Text></Pressable>)}</View></View>; }

function PlaceQuestion({ input, query, onChange, onPick, dark }: { input: React.RefObject<TextInput | null>; query: string; onChange: (value: string) => void; onPick: (suggestion: Suggestion) => void; dark: boolean }) {
  const matches = useMemo(() => { const source = [...homeSuggestions, ...destinationSuggestions]; const normalised = query.trim().toLocaleLowerCase('en-US'); if (!normalised) return source.slice(0, 5); return source.filter((item) => item.label.toLocaleLowerCase('en-US').includes(normalised)).slice(0, 5); }, [query]);
  return <View style={s.questionCard}><Text style={[s.fieldLabel, dark && s.mutedOnDark]}>CITY OR COUNTRY</Text><View style={[s.placeInput, dark && s.answerInputDark]}><Ionicons name="search-outline" size={19} color={colors.muted}/><TextInput ref={input} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search for your city or country" value={query} onChangeText={onChange} placeholder="Search for a city or country" placeholderTextColor="#9C978F" style={[s.placeTextInput, dark && s.lightText]}/></View><View style={s.suggestions}>{matches.map((suggestion) => <Pressable key={suggestion.label} accessibilityRole="button" accessibilityLabel={`Choose ${suggestion.label}`} onPress={() => onPick(suggestion)} style={({ pressed }) => [s.suggestion, pressed && s.pressed]}><View style={s.suggestionIcon}><Ionicons name="location-outline" size={17} color={colors.blue}/></View><View style={s.flex}><Text style={s.suggestionTitle}>{suggestion.value}</Text><Text style={s.suggestionDetail}>{suggestion.detail}</Text></View><Ionicons name="arrow-forward" size={16} color={colors.blue}/></Pressable>)}</View></View>;
}

function WelcomeCard({ name, age, place }: { name: string; age: number | null; place: string }) { return <View style={[s.previewCard, s.welcomeCard]}><View style={s.welcomeIcon}><Ionicons name="sparkles" size={24} color="#fff"/></View><Text style={s.welcomeTitle}>Your travel journal is ready.</Text><Text style={s.welcomeCopy}>{name.trim()} · {age} · {place}</Text></View>; }

const s = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.background }, safeDark: { backgroundColor: colors.darkBackground }, content: { flexGrow: 1, width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12 },
  brandRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700' }, lightText: { color: '#FFFEFB' }, mutedOnDark: { color: '#D0CBD0' }, skipButton: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }, skip: { color: colors.blue, fontSize: 15, fontWeight: '700' }, skipSpace: { width: 44 },
  previewNotice: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D9EAFF' }, previewText: { flex: 1, color: colors.blue, fontSize: 12, fontWeight: '700', lineHeight: 17 }, progressRow: { alignItems: 'center', marginTop: 14 }, stepLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 9 }, dots: { flexDirection: 'row', gap: 6, height: 7 }, dot: { height: 7, borderRadius: 5, backgroundColor: colors.border }, dotDone: { backgroundColor: colors.blue },
  stage: { flex: 1, alignItems: 'center', paddingTop: 8 }, mascotSlot: { height: 116, width: 112, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, mascotPointer: { position: 'absolute', right: 4, bottom: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, title: { maxWidth: 370, color: colors.text, fontFamily: fonts.heading, fontSize: 36, lineHeight: 43, letterSpacing: -.7, textAlign: 'center' }, copy: { maxWidth: 340, marginTop: 12, color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' }, exampleWrap: { width: '100%', alignItems: 'center' },
  previewCard: { width: '100%', maxWidth: 350, marginTop: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOpacity: .07, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 }, ticketCard: { borderRadius: 22, padding: 17, backgroundColor: '#EFF7FF', borderColor: '#CBE4FF' }, ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, ticketIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, ticketPlace: { color: colors.blue, fontSize: 9, fontWeight: '800', letterSpacing: .75 }, ticketTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700', marginTop: 2 }, upcomingBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBE4FF' }, upcomingText: { color: colors.blue, fontSize: 10, fontWeight: '800' }, ticketCountdown: { color: colors.text, fontFamily: fonts.heading, fontSize: 23, fontWeight: '700', marginTop: 19 }, ticketProgressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, previewMuted: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .65 }, previewStrong: { color: colors.text, fontSize: 11, fontWeight: '800' }, progressTrack: { height: 7, borderRadius: 7, overflow: 'hidden', backgroundColor: '#D6E8FC', marginTop: 7 }, progressFill: { height: '100%', backgroundColor: colors.blue, borderRadius: 7 },
  packingCard: { borderRadius: 19, padding: 16, gap: 11 }, previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 3 }, previewLabel: { color: colors.purple, fontSize: 10, fontWeight: '800', letterSpacing: .8 }, previewHeading: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700', marginTop: 2 }, checkCount: { minWidth: 32, height: 28, borderRadius: 14, backgroundColor: colors.teal, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 }, checkCountText: { color: '#fff', fontSize: 12, fontWeight: '800' }, checkRow: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 9 }, checkText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }, checkTextMuted: { color: colors.muted }, youBring: { color: colors.blue, fontSize: 11, fontWeight: '700', backgroundColor: colors.blueSoft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 }, notification: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, marginTop: 4, borderRadius: 13, backgroundColor: '#F8F3FF' }, notificationIcon: { width: 29, height: 29, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, notificationTitle: { color: colors.text, fontSize: 11, fontWeight: '800' }, notificationCopy: { color: colors.muted, fontSize: 11, marginTop: 2 },
  memoryCard: { borderRadius: 20, overflow: 'hidden' }, memorySky: { height: 116, backgroundColor: '#74BDE6', justifyContent: 'flex-end', padding: 13 }, memorySun: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFCE6B', top: 17, right: 38 }, memoryPin: { position: 'absolute', right: 17, top: 19 }, memoryLocation: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: .8 }, memoryDetails: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 }, memoryDate: { width: 38, height: 45, borderRadius: 13, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center' }, memoryDateDay: { color: colors.coral, fontSize: 17, fontWeight: '800', lineHeight: 19 }, memoryDateMonth: { color: colors.coral, fontSize: 8, fontWeight: '800', letterSpacing: .5 }, memoryCopy: { color: colors.muted, fontSize: 12, marginTop: 3 },
  questionCard: { width: '100%', maxWidth: 350, marginTop: 25 }, fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: .75, marginBottom: 8 }, answerInput: { minHeight: 62, borderRadius: 18, paddingHorizontal: 17, backgroundColor: '#F5F1EB', color: colors.text, fontSize: 20, fontWeight: '600' }, answerInputDark: { backgroundColor: colors.darkSurface, color: '#FFFEFB' }, ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, ageOption: { width: '22%', minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F1EB' }, ageOptionSelected: { backgroundColor: colors.blue }, ageText: { color: colors.text, fontSize: 16, fontWeight: '700' }, ageTextSelected: { color: '#fff' }, pressed: { transform: [{ scale: .97 }], opacity: .9 },
  placeInput: { minHeight: 62, borderRadius: 18, paddingHorizontal: 17, alignItems: 'center', flexDirection: 'row', gap: 10, backgroundColor: '#F5F1EB' }, placeTextInput: { flex: 1, minHeight: 62, color: colors.text, fontSize: 16, fontWeight: '600' }, suggestions: { marginTop: 9, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, suggestion: { minHeight: 57, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1ECE5' }, suggestionIcon: { width: 30, height: 30, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, suggestionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, suggestionDetail: { color: colors.muted, fontSize: 12, marginTop: 1 },
  welcomeCard: { alignItems: 'center', padding: 22, borderRadius: 22, backgroundColor: '#EFF7FF', borderColor: '#CBE4FF' }, welcomeIcon: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, marginBottom: 12 }, welcomeTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 21, fontWeight: '700', textAlign: 'center' }, welcomeCopy: { color: colors.muted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  footer: { width: '100%', marginTop: 28, paddingBottom: 4 }, footerRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }, backButton: { width: 60, minHeight: 44, flexDirection: 'row', gap: 4, alignItems: 'center' }, backText: { color: colors.blue, fontSize: 13, fontWeight: '700' }, backSpace: { width: 60 }, footerHint: { flex: 1, color: colors.muted, fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
});
