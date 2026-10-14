import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field } from '@/src/forms';
import { PrimaryButton } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';
import { destinationSuggestions } from '@/src/suggestions';

const slides = [
  { icon: 'people-outline', title: 'Plan together.', copy: 'Keep plans, responsibilities and wishes in one place.' },
  { icon: 'sunny-outline', title: 'Keep your day close.', copy: 'See what matters most while you travel.' },
  { icon: 'images-outline', title: 'Keep your memories.', copy: 'Create a travel journal from the moments you choose.' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0); const [name, setName] = useState(''); const [title, setTitle] = useState(''); const [city, setCity] = useState(''); const [country, setCountry] = useState(''); const [startDate, setStart] = useState(''); const [endDate, setEnd] = useState(''); const [companions, setCompanions] = useState('');
  const { createTrip, saveProfile, markOnboarded, onboarded, ready } = useTravel(); const slide = slides[step];
  useEffect(() => { if (ready && onboarded) router.replace('/'); }, [ready, onboarded]);
  const finish = () => { saveProfile(name.trim()); if (title.trim() && city.trim() && startDate.trim() && endDate.trim()) createTrip({ title: title.trim(), city: city.trim(), country: country.trim() || 'Unknown', startDate: startDate.trim(), endDate: endDate.trim(), members: companions.split(',').map((item) => item.trim()).filter(Boolean) }); markOnboarded(); router.replace('/'); };
  return <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}><View style={s.brandRow}><Text style={s.brand}>Reisefølge</Text>{step < 2 && <Pressable onPress={() => { markOnboarded(); router.replace('/'); }}><Text style={s.skip}>Skip</Text></Pressable>}</View><View style={s.hero}><View style={s.illustration}><Ionicons name={slide.icon as any} size={70} color="#fff" /></View><Text style={s.title}>{slide.title}</Text><Text style={s.copy}>{slide.copy}</Text></View>{step === 2 && <View style={s.form}><Text style={s.formTitle}>Start with the essentials</Text><Field value={name} onChangeText={setName} placeholder="Your name" /><Field value={title} onChangeText={setTitle} placeholder="Trip name" /><AutocompleteField value={city} onChangeText={setCity} placeholder="City or destination" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)} /><Field value={country} onChangeText={setCountry} placeholder="Country" /><DateField value={startDate} onChangeText={setStart} placeholder="Start date" /><DateField value={endDate} onChangeText={setEnd} placeholder="End date" /><Field value={companions} onChangeText={setCompanions} placeholder="Travel companions, separated by commas" /></View>}<View style={s.footer}><View style={s.dots}>{slides.map((_, index) => <View key={index} style={[s.dot, index === step && s.active]} />)}</View><PrimaryButton title={step === 2 ? 'Continue' : 'Next'} icon={step === 2 ? 'checkmark' : 'arrow-forward'} onPress={step === 2 ? finish : () => setStep(step + 1)} />{step === 2 && <Text style={s.note}>You can create more trips and invite companions later.</Text>}</View></ScrollView></KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background }, page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, minHeight: '100%', padding: 24, paddingTop: 70, paddingBottom: 42, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between' }, brand: { color: colors.navy, fontSize: 22, fontWeight: '900', letterSpacing: -.7 }, skip: { color: colors.orange, fontWeight: '900' }, hero: { alignItems: 'center', paddingTop: 34 }, illustration: { width: 154, height: 154, borderRadius: 54, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center', marginBottom: 34, borderWidth: 9, borderColor: '#F7FBFA', shadowColor: colors.teal, shadowOpacity: .16, shadowRadius: 23, shadowOffset: { width: 0, height: 10 }, elevation: 3 }, title: { color: colors.navy, fontSize: 39, fontWeight: '900', letterSpacing: -1.6 }, copy: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 25, marginTop: 14, maxWidth: 310 }, form: { marginTop: 28 }, formTitle: { color: colors.navy, fontSize: 20, fontWeight: '900', marginBottom: 15, letterSpacing: -.4 }, footer: { gap: 18, marginTop: 30 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border }, active: { backgroundColor: colors.orange, width: 26 }, note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
