import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field } from '@/src/forms';
import { AccentText, PrimaryButton } from '@/src/ui';
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
  return <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}><View style={s.brandRow}><Text style={s.brand}>Reisefølge</Text>{step < 2 && <Pressable onPress={() => { markOnboarded(); router.replace('/'); }}><Text style={s.skip}>Skip</Text></Pressable>}</View><View style={s.hero}><View style={[art.heroArt, step === 0 && art.splashFrame]}>{step === 0 ? <SplashArt/> : <><View style={art.artStarLeft}><Ionicons name="star" size={24} color="#FFFFFF"/></View><LinearGradient colors={[colors.blue, '#70B8FF']} style={art.illustration}><Ionicons name={slide.icon as any} size={70} color="#fff" /></LinearGradient><View style={art.artStarRight}><Ionicons name="sparkles" size={27} color="#FFFFFF"/></View></>}</View><AccentText text={slide.title} style={s.title}/><Text style={s.copy}>{slide.copy}</Text></View>{step === 2 && <View style={s.form}><Text style={s.formTitle}>Start with the essentials</Text><Field value={name} onChangeText={setName} placeholder="Your name" /><Field value={title} onChangeText={setTitle} placeholder="Trip name" /><AutocompleteField value={city} onChangeText={setCity} placeholder="City or destination" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)} /><Field value={country} onChangeText={setCountry} placeholder="Country" /><DateField value={startDate} onChangeText={(date) => { setStart(date); if (endDate && endDate <= date) setEnd(''); }} placeholder="Start date" /><DateField value={endDate} onChangeText={setEnd} placeholder="End date" minDate={startDate}/><Field value={companions} onChangeText={setCompanions} placeholder="Travel companions, separated by commas" /></View>}<View style={s.footer}><View style={s.dots}>{slides.map((_, index) => <View key={index} style={[s.dot, index === step && s.active]} />)}</View><PrimaryButton title={step === 2 ? 'Continue' : 'Next'} icon={step === 2 ? 'checkmark' : 'arrow-forward'} onPress={step === 2 ? finish : () => setStep(step + 1)} />{step === 2 && <Text style={s.note}>You can create more trips and invite companions later.</Text>}</View></ScrollView></KeyboardAvoidingView>;
}

function SplashArt() {
  return <View style={art.splash} pointerEvents="none">
    <SplashMascot style={art.splashBlue}/><SplashMascot style={art.splashYellow}/><SplashMascot style={art.splashPurple}/><SplashMascot style={art.splashPink}/>
    <Ionicons name="star" color="#9BC7FF" size={25} style={art.splashStarTop}/><Ionicons name="star" color="#FFB9D2" size={19} style={art.splashStarLeft}/><Ionicons name="star" color="#FFE28A" size={25} style={art.splashStarRight}/>
    <Text style={art.splashBrand}>Reisefølge</Text>
  </View>;
}

function SplashMascot({ style }: { style: object }) {
  return <View style={[art.mascot, style]}><View style={art.mascotEyes}><View style={art.mascotEye}><View style={art.mascotPupil}/></View><View style={art.mascotEye}><View style={art.mascotPupil}/></View></View></View>;
}

const s = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background }, page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, minHeight: '100%', padding: 16, paddingTop: 70, paddingBottom: 42, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between' }, brand: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -.8 }, skip: { color: colors.blue, fontWeight: '600' }, hero: { alignItems: 'center', paddingTop: 34 }, illustration: { width: 154, height: 154, borderRadius: 54, backgroundColor: colors.blueBright, alignItems: 'center', justifyContent: 'center', marginBottom: 34, borderWidth: 9, borderColor: colors.blueSoft, shadowColor: colors.blue, shadowOpacity: .13, shadowRadius: 23, shadowOffset: { width: 0, height: 10 }, elevation: 2 }, title: { color: colors.text, fontSize: 37, fontWeight: '700', letterSpacing: -1.6, textAlign: 'center' }, copy: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 25, marginTop: 14, maxWidth: 310 }, form: { marginTop: 28 }, formTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 15, letterSpacing: -.4 }, footer: { gap: 18, marginTop: 30 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border }, active: { backgroundColor: colors.blue, width: 26 }, note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});

const art = StyleSheet.create({
  heroArt: { width: 240, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  splashFrame: { width: 320, height: 280 },
  splash: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  splashBrand: { color: colors.text, fontSize: 32, fontWeight: '700', letterSpacing: -1.7 },
  mascot: { width: 72, height: 70, borderRadius: 26, alignItems: 'center', justifyContent: 'center', position: 'absolute', shadowColor: colors.text, shadowOpacity: .12, shadowRadius: 11, shadowOffset: { width: 0, height: 6 } },
  mascotEyes: { flexDirection: 'row', gap: 5 }, mascotEye: { width: 19, height: 22, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, mascotPupil: { width: 10, height: 14, borderRadius: 7, backgroundColor: '#243869' },
  splashBlue: { top: 0, left: 7, backgroundColor: colors.blueBright, transform: [{ rotate: '17deg' }] },
  splashYellow: { top: 24, right: 7, backgroundColor: '#FFC451', transform: [{ rotate: '-12deg' }] },
  splashPurple: { bottom: 0, left: 8, backgroundColor: colors.purple, transform: [{ rotate: '-17deg' }] },
  splashPink: { bottom: 3, right: 5, backgroundColor: colors.pink, transform: [{ rotate: '16deg' }] },
  splashStarTop: { position: 'absolute', top: 0, right: 85 }, splashStarLeft: { position: 'absolute', bottom: 76, left: 2 }, splashStarRight: { position: 'absolute', bottom: 71, right: 31 },
  illustration: { width: 154, height: 154, borderRadius: 48, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], shadowColor: colors.blue, shadowOpacity: .14, shadowRadius: 20, shadowOffset: { width: 0, height: 9 } },
  artStarLeft: { position: 'absolute', left: 8, top: 11, width: 42, height: 42, borderRadius: 15, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-14deg' }] },
  artStarRight: { position: 'absolute', right: 1, bottom: 17, width: 49, height: 49, borderRadius: 17, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '17deg' }] },
});
