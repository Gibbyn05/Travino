import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AutocompleteField, DateField } from '@/src/forms';
import { Suggestion, destinationSuggestions } from '@/src/suggestions';
import { useTravel } from '@/src/store';
import { destinationTimeZoneFor } from '@/src/travel-info';
import { colors, fonts } from '@/src/theme';
import { PrimaryButton } from '@/src/ui';
import { validTripDates } from '@/src/trip-planning';

export default function NewTripScreen() {
  const { createTrip } = useTravel();
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().height < 740;
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
      setError('Choose both dates, or decide later.');
      return;
    }
    creating.current = true;
    Keyboard.dismiss();
    const id = createTrip({ title: `${destination.value} trip`, city: destination.value, country: destination.detail, destinationTimeZone: destination.timeZone ?? destinationTimeZoneFor(destination.value, destination.detail), startDate: withoutDates ? '' : start, endDate: withoutDates ? '' : end, members: [] });
    router.replace({ pathname: '/trip', params: { tab: 'Overview', welcome: id } });
  };

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={step ? 'Back to destination' : 'Close trip setup'} onPress={back} style={s.back}><Ionicons name="arrow-back" size={23} color={colors.text}/></Pressable>
        <Text style={s.step}>{step + 1} / 2</Text>
        <Pressable accessibilityRole="button" onPress={close} style={s.close}><Text style={s.link}>Close</Text></Pressable>
      </View>
      <View style={s.progress} accessibilityLabel={`Step ${step + 1} of 2`}><View style={s.progressDone}/><View style={[s.progressPart, step === 1 && s.progressDone]}/></View>
      {!compact && <View style={s.icon}><Ionicons name={step === 0 ? 'earth-outline' : 'calendar-outline'} size={32} color={colors.blue}/></View>}
      <Text accessibilityRole="header" style={s.title}>{step === 0 ? 'Where to?' : 'When?'}</Text>
      {step === 0 ? <View style={s.fields}>
        <AutocompleteField value={query} onChangeText={(value) => { setQuery(value); setDestination(null); }} placeholder="City or destination" suggestions={destinationSuggestions} hideLabel showSuggestionsOnFocus onPick={(suggestion) => { setDestination(suggestion); Keyboard.dismiss(); }}/>
        {destination && <View style={s.selection}><Ionicons name="checkmark-circle" color={colors.blue} size={23}/><Text style={s.country}>{destination.detail}</Text></View>}
      </View> : <View style={s.fields}>
        <DateField value={start} onChangeText={(value) => { setStart(value); if (end && end < value) setEnd(''); setError(''); }} placeholder="Choose date" label="Departure"/>
        <DateField value={end} onChangeText={(value) => { setEnd(value); setError(''); }} placeholder="Choose date" label="Return" minDate={start} allowSameDay/>
      </View>}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <View style={s.footer}>
        {step === 0 ? <PrimaryButton title="Next" icon="arrow-forward" disabled={!destination?.detail} onPress={() => { Keyboard.dismiss(); setStep(1); }}/>
          : <><PrimaryButton title="Create trip" icon="checkmark" disabled={!validTripDates(start, end)} onPress={() => save(false)}/><Pressable accessibilityRole="button" onPress={() => save(true)} style={s.later}><Text style={s.link}>Decide later</Text><Ionicons name="arrow-forward" size={17} color={colors.blue}/></Pressable></>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, paddingHorizontal: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 48, minHeight: 48, justifyContent: 'center' }, close: { minHeight: 48, justifyContent: 'center', paddingLeft: 10 }, step: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 32 }, progressDone: { flex: 1, height: 5, backgroundColor: colors.blue, borderRadius: 5 }, progressPart: { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: 5 },
  icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontFamily: fonts.heading, color: colors.text, fontSize: 46, lineHeight: 55 },
  fields: { marginTop: 30 },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4, paddingHorizontal: 4 }, country: { color: colors.muted, fontSize: 19, lineHeight: 27, flexShrink: 1 },
  footer: { marginTop: 'auto', paddingTop: 32 }, later: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, marginTop: 10 }, link: { color: colors.blue, fontSize: 18, fontWeight: '600' }, error: { color: '#B42318', fontSize: 17, lineHeight: 25, marginTop: 12 },
});
