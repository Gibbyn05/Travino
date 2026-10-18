import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AutocompleteField, DateField } from '@/src/forms';
import { Suggestion, destinationSuggestions } from '@/src/suggestions';
import { useTravel } from '@/src/store';
import { colors, fonts } from '@/src/theme';
import { PrimaryButton } from '@/src/ui';
import { validTripDates } from '@/src/trip-planning';

export default function NewTripScreen() {
  const { createTrip } = useTravel();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<Suggestion | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const creating = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false })); return () => cancelAnimationFrame(frame); }, [step]);
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  const back = () => { Keyboard.dismiss(); setError(''); if (step) setStep(0); else close(); };
  const save = (withoutDates: boolean) => {
    if (creating.current || !destination?.detail) return;
    if (!withoutDates && !validTripDates(start, end)) {
      setError('Choose a departure and a return date, or decide later.');
      return;
    }
    creating.current = true;
    Keyboard.dismiss();
    const id = createTrip({ title: `${destination.value} trip`, city: destination.value, country: destination.detail, startDate: withoutDates ? '' : start, endDate: withoutDates ? '' : end, members: [] });
    router.replace({ pathname: '/trip', params: { tab: 'Overview', welcome: id } });
  };

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={step ? 'Back to destination' : 'Close trip setup'} onPress={back} style={s.back}><Ionicons name="arrow-back" size={23} color={colors.text}/></Pressable>
        <Text style={s.step}>STEP {step + 1} OF 2</Text>
        <Pressable accessibilityRole="button" onPress={close} style={s.close}><Text style={s.link}>Close</Text></Pressable>
      </View>
      <View style={s.progress} accessibilityLabel={`Step ${step + 1} of 2`}><View style={s.progressDone}/><View style={[s.progressPart, step === 1 && s.progressDone]}/></View>
      <View style={s.icon}><Ionicons name={step === 0 ? 'earth-outline' : 'calendar-outline'} size={32} color={colors.blue}/></View>
      <Text accessibilityRole="header" style={s.title}>{step === 0 ? 'Where would you\nlike to go?' : 'When’s the\nadventure?'}</Text>
      <Text style={s.copy}>{step === 0 ? 'One destination is all it takes to get started.' : `Your ${destination?.value} trip is taking shape. Add dates now, or decide later.`}</Text>
      {step === 0 ? <View style={s.fields}>
        <AutocompleteField value={query} onChangeText={(value) => { setQuery(value); setDestination(null); }} placeholder="City or destination" suggestions={destinationSuggestions} showSuggestionsOnFocus onPick={(suggestion) => { setDestination(suggestion); Keyboard.dismiss(); }}/>
        {destination ? <View style={s.selection}><Ionicons name="checkmark-circle" color={colors.blue} size={22}/><View style={s.selectionText}><Text style={s.destination}>{destination.value}</Text><Text style={s.country}>{destination.detail}</Text></View></View> : <Text style={s.hint}>Search for a place and choose a suggestion. We’ll fill in the country.</Text>}
      </View> : <View style={s.fields}>
        <DateField value={start} onChangeText={(value) => { setStart(value); if (end && end < value) setEnd(''); setError(''); }} placeholder="Choose departure date"/>
        <DateField value={end} onChangeText={(value) => { setEnd(value); setError(''); }} placeholder="Choose return date" minDate={start} allowSameDay/>
        <Text style={s.hint}>You can change these dates in your trip at any time.</Text>
      </View>}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <View style={s.footer}>
        {step === 0 ? <PrimaryButton title="Next: choose dates" icon="arrow-forward" disabled={!destination?.detail} onPress={() => { Keyboard.dismiss(); setStep(1); }}/>
          : <><PrimaryButton title="Create my trip" icon="checkmark" disabled={!validTripDates(start, end)} onPress={() => save(false)}/><Pressable accessibilityRole="button" onPress={() => save(true)} style={s.later}><Text style={s.link}>I haven’t decided yet</Text><Ionicons name="arrow-forward" size={17} color={colors.blue}/></Pressable></>}
        <Text style={s.footerNote}>{step === 0 ? 'You can add more details once your trip is ready.' : 'Next up: your own trip space, ready for your first idea.'}</Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, paddingHorizontal: 24, maxWidth: 560, width: '100%', alignSelf: 'center' },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 48, minHeight: 48, justifyContent: 'center' }, close: { minHeight: 48, justifyContent: 'center', paddingLeft: 10 }, step: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 30 }, progressDone: { flex: 1, height: 5, backgroundColor: colors.blue, borderRadius: 5 }, progressPart: { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: 5 },
  icon: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: fonts.heading, color: colors.text, fontSize: 36, lineHeight: 43 }, copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 10 },
  fields: { marginTop: 28 }, label: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 9 }, hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.blueSoft, borderRadius: 18, padding: 16 }, selectionText: { flex: 1 }, destination: { fontFamily: fonts.heading, fontSize: 18, color: colors.text }, country: { color: colors.muted, fontSize: 13, marginTop: 3 },
  footer: { marginTop: 'auto', paddingTop: 32 }, later: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, marginTop: 8 }, link: { color: colors.blue, fontSize: 14, fontWeight: '600' }, footerNote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 }, error: { color: '#B42318', fontSize: 14, lineHeight: 21, marginTop: 12 },
});
