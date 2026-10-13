import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, Field } from '@/src/forms';
import { PrimaryButton } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';
import { destinationSuggestions } from '@/src/suggestions';

const slides = [
  { icon: 'people-outline', title: 'Planlegg sammen.', copy: 'Hold planer, ansvar og ønsker samlet.' },
  { icon: 'sunny-outline', title: 'Ha dagen i lomma.', copy: 'Se det viktigste når dere er på tur.' },
  { icon: 'images-outline', title: 'Ta vare på minnene.', copy: 'Lag en reisedagbok med de øyeblikkene dere velger.' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0); const [name, setName] = useState(''); const [title, setTitle] = useState(''); const [city, setCity] = useState(''); const [country, setCountry] = useState(''); const [startDate, setStart] = useState(''); const [endDate, setEnd] = useState(''); const [companions, setCompanions] = useState('');
  const { createTrip, saveProfile, markOnboarded, onboarded, ready } = useTravel(); const slide = slides[step];
  useEffect(() => { if (ready && onboarded) router.replace('/'); }, [ready, onboarded]);
  const finish = () => { saveProfile(name.trim()); if (title.trim() && city.trim() && startDate.trim() && endDate.trim()) createTrip({ title: title.trim(), city: city.trim(), country: country.trim() || 'Ukjent', startDate: startDate.trim(), endDate: endDate.trim(), members: companions.split(',').map((item) => item.trim()).filter(Boolean) }); markOnboarded(); router.replace('/'); };
  return <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}><View style={s.brandRow}><Text style={s.brand}>Reisefølge</Text>{step < 2 && <Pressable onPress={() => { markOnboarded(); router.replace('/'); }}><Text style={s.skip}>Hopp over</Text></Pressable>}</View><View style={s.hero}><View style={s.illustration}><Ionicons name={slide.icon as any} size={70} color="#fff" /></View><Text style={s.title}>{slide.title}</Text><Text style={s.copy}>{slide.copy}</Text></View>{step === 2 && <View style={s.form}><Text style={s.formTitle}>Start med det viktigste</Text><Field value={name} onChangeText={setName} placeholder="Ditt navn" /><Field value={title} onChangeText={setTitle} placeholder="Navn på turen" /><AutocompleteField value={city} onChangeText={setCity} placeholder="By eller reisemål" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)} /><Field value={country} onChangeText={setCountry} placeholder="Land" /><Field value={startDate} onChangeText={setStart} placeholder="Startdato, f.eks. 28.05.2026" /><Field value={endDate} onChangeText={setEnd} placeholder="Sluttdato, f.eks. 06.06.2026" /><Field value={companions} onChangeText={setCompanions} placeholder="Reisefølge, separert med komma" /></View>}<View style={s.footer}><View style={s.dots}>{slides.map((_, index) => <View key={index} style={[s.dot, index === step && s.active]} />)}</View><PrimaryButton title={step === 2 ? 'Fortsett' : 'Neste'} icon={step === 2 ? 'checkmark' : 'arrow-forward'} onPress={step === 2 ? finish : () => setStep(step + 1)} />{step === 2 && <Text style={s.note}>Du kan opprette flere turer og invitere reisefølge senere.</Text>}</View></ScrollView></KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background }, page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, minHeight: '100%', padding: 24, paddingTop: 66, paddingBottom: 40, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between' }, brand: { color: colors.navy, fontSize: 20, fontWeight: '800', letterSpacing: -.3 }, skip: { color: colors.muted, fontWeight: '700' }, hero: { alignItems: 'center', paddingTop: 30 }, illustration: { width: 150, height: 150, borderRadius: 52, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowColor: colors.teal, shadowOpacity: .2, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 3 }, title: { color: colors.navy, fontSize: 34, fontWeight: '800', letterSpacing: -1.1 }, copy: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 25, marginTop: 13, maxWidth: 310 }, form: { marginTop: 28 }, formTitle: { color: colors.navy, fontSize: 18, fontWeight: '800', marginBottom: 14 }, footer: { gap: 18, marginTop: 30 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border }, active: { backgroundColor: colors.teal, width: 24 }, note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
