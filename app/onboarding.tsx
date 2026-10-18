import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field } from '@/src/forms';
import { AccentText, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';
import { destinationSuggestions } from '@/src/suggestions';

const slides = [
  { icon: 'people-outline', title: 'Plan together.', copy: 'Keep plans, responsibilities and wishes in one place.' },
  { icon: 'sunny-outline', title: 'Keep your day close.', copy: 'See what matters most while you travel.' },
  { icon: 'images-outline', title: 'Keep your memories.', copy: 'Create a travel journal from the moments you choose.' },
];

export default function Onboarding() {
  const params = useLocalSearchParams<{ preview?: string | string[] }>();
  const preview = params.preview === '1' || params.preview === 'true';
  const [step, setStep] = useState(0); const [name, setName] = useState(''); const [title, setTitle] = useState(''); const [city, setCity] = useState(''); const [country, setCountry] = useState(''); const [startDate, setStart] = useState(''); const [endDate, setEnd] = useState(''); const [companions, setCompanions] = useState('');
  const { createTrip, saveProfile, markOnboarded, onboarded, ready } = useTravel(); const slide = slides[step];
  useEffect(() => { if (!preview && ready && onboarded) router.replace('/'); }, [preview, ready, onboarded]);
  const closePreview = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  const finish = () => { if (preview) { closePreview(); return; } saveProfile(name.trim()); if (title.trim() && city.trim() && startDate.trim() && endDate.trim()) createTrip({ title: title.trim(), city: city.trim(), country: country.trim() || 'Unknown', startDate: startDate.trim(), endDate: endDate.trim(), members: companions.split(',').map((item) => item.trim()).filter(Boolean) }); markOnboarded(); router.replace('/'); };
  return <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="always" keyboardDismissMode="none" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}><View style={s.brandRow}><Text style={s.brand}>Reisefølge</Text>{(preview || step < 2) && <Pressable accessibilityRole="button" accessibilityLabel={preview ? 'Close onboarding preview' : 'Skip onboarding'} onPress={preview ? closePreview : () => { markOnboarded(); router.replace('/'); }}><Text style={s.skip}>{preview ? 'Close preview' : 'Skip'}</Text></Pressable>}</View>{preview && <View style={s.previewNotice}><Ionicons name="eye-outline" size={16} color={colors.blue}/><Text style={s.previewText}>Preview mode. Nothing you enter here will be saved.</Text></View>}<View style={s.hero}><View style={[art.heroArt, step === 0 && art.splashFrame]}>{step === 0 ? <SplashArt/> : <><View style={art.artStarLeft}><Ionicons name="star" size={24} color="#FFFFFF"/></View><LinearGradient colors={[colors.blue, '#70B8FF']} style={art.illustration}><Ionicons name={slide.icon as any} size={70} color="#fff" /></LinearGradient><View style={art.artStarRight}><Ionicons name="sparkles" size={27} color="#FFFFFF"/></View></>}</View><AccentText text={slide.title} style={s.title}/><Text style={s.copy}>{slide.copy}</Text></View>{step === 2 && <View style={s.form}><Text style={s.formTitle}>Start with the essentials</Text><Field value={name} onChangeText={setName} placeholder="Your name" /><Field value={title} onChangeText={setTitle} placeholder="Trip name" /><AutocompleteField value={city} onChangeText={setCity} placeholder="City or destination" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)} /><Field value={country} onChangeText={setCountry} placeholder="Country" /><DateField value={startDate} onChangeText={(date) => { setStart(date); if (endDate && endDate <= date) setEnd(''); }} placeholder="Start date" /><DateField value={endDate} onChangeText={setEnd} placeholder="End date" minDate={startDate}/><Field value={companions} onChangeText={setCompanions} placeholder="Travel companions, separated by commas" /></View>}<View style={s.footer}><View style={s.tourControls}>{step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Previous onboarding step" onPress={() => setStep((current) => Math.max(0, current - 1))} style={s.backButton}><Ionicons name="arrow-back" size={17} color={colors.blue}/><Text style={s.backText}>Back</Text></Pressable> : <View style={s.backPlaceholder}/>}<View><Text style={s.stepLabel}>Step {step + 1} of {slides.length}</Text><View style={s.dots}>{slides.map((_, index) => <View key={index} style={[s.dot, index === step && s.active]} />)}</View></View><View style={s.backPlaceholder}/></View><PrimaryButton title={step === 2 ? (preview ? 'Back to profile' : 'Continue') : 'Next'} icon={step === 2 ? (preview ? 'arrow-back' : 'checkmark') : 'arrow-forward'} onPress={step === 2 ? finish : () => setStep((current) => Math.min(slides.length - 1, current + 1))} />{step === 2 && <Text style={s.note}>{preview ? 'This preview leaves your profile and trips unchanged.' : 'You can create more trips and invite companions later.'}</Text>}</View></ScrollView></KeyboardAvoidingView>;
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
  brandRow: { flexDirection: 'row', justifyContent: 'space-between' }, brand: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700', letterSpacing: -.15 }, skip: { color: colors.blue, fontWeight: '600' }, previewNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D9EAFF' }, previewText: { flex: 1, color: colors.blue, fontSize: 12, fontWeight: '600', lineHeight: 17 }, hero: { alignItems: 'center', paddingTop: 34 }, illustration: { width: 154, height: 154, borderRadius: 54, backgroundColor: colors.blueBright, alignItems: 'center', justifyContent: 'center', marginBottom: 34, borderWidth: 9, borderColor: colors.blueSoft, shadowColor: colors.blue, shadowOpacity: .13, shadowRadius: 23, shadowOffset: { width: 0, height: 10 }, elevation: 2 }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 37, fontWeight: '700', letterSpacing: -.45, lineHeight: 46, textAlign: 'center' }, copy: { color: colors.muted, fontSize: 16, textAlign: 'center', lineHeight: 25, marginTop: 14, maxWidth: 310 }, form: { marginTop: 28 }, formTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', marginBottom: 15, letterSpacing: -.05 }, footer: { gap: 18, marginTop: 30 }, tourControls: { minHeight: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, backButton: { minWidth: 58, minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5 }, backText: { color: colors.blue, fontSize: 13, fontWeight: '600' }, backPlaceholder: { width: 58 }, stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 7 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border }, active: { backgroundColor: colors.blue, width: 26 }, note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});

const art = StyleSheet.create({
  heroArt: { width: 240, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  splashFrame: { width: 320, height: 280 },
  splash: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  splashBrand: { color: colors.text, fontFamily: fonts.heading, fontSize: 32, fontWeight: '700', letterSpacing: -.45 },
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
