import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AutocompleteField, DateField, Field } from '@/src/forms';
import { CapybaraMoment, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';
import { destinationSuggestions } from '@/src/suggestions';

const slides = [
  { eyebrow: 'A shared trip, in one calm place', before: 'Plan the ', accent: 'good bits', after: '.', copy: 'Dates, plans and a packing list that stay close from the first idea to the front door.' },
  { eyebrow: 'A lighter way to get ready', before: 'Pack with ', accent: 'clarity', after: '.', copy: 'See what is covered, give a nudge when needed, then leave the loose notes behind.' },
  { eyebrow: 'Keep the feeling, not just the photos', before: 'Make room for ', accent: 'memories', after: '.', copy: 'Save the small moments you will want to find again when the trip is over.' },
];

export default function Onboarding() {
  const params = useLocalSearchParams<{ preview?: string | string[] }>();
  const preview = params.preview === '1' || params.preview === 'true';
  const [step, setStep] = useState(0);
  const [name, setName] = useState(''); const [title, setTitle] = useState(''); const [city, setCity] = useState(''); const [country, setCountry] = useState(''); const [startDate, setStart] = useState(''); const [endDate, setEnd] = useState(''); const [companions, setCompanions] = useState('');
  const { createTrip, saveProfile, markOnboarded, onboarded, ready } = useTravel();
  const slide = slides[step];

  useEffect(() => { if (!preview && ready && onboarded) router.replace('/'); }, [preview, ready, onboarded]);
  const closePreview = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  const skip = () => { if (preview) closePreview(); else { markOnboarded(); router.replace('/'); } };
  const finish = () => {
    if (preview) { closePreview(); return; }
    saveProfile(name.trim());
    if (title.trim() && city.trim() && startDate.trim() && endDate.trim()) createTrip({ title: title.trim(), city: city.trim(), country: country.trim() || 'Unknown', startDate: startDate.trim(), endDate: endDate.trim(), members: companions.split(',').map((item) => item.trim()).filter(Boolean) });
    markOnboarded(); router.replace('/');
  };

  return <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="always" keyboardDismissMode="none" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
      <View style={s.brandRow}><Text style={s.brand}>Travino</Text><Pressable accessibilityRole="button" accessibilityLabel={preview ? 'Close onboarding preview' : 'Skip onboarding'} hitSlop={10} onPress={skip}><Text style={s.skip}>{preview ? 'Close preview' : 'Skip'}</Text></Pressable></View>
      {preview && <View style={s.previewNotice}><Ionicons name="eye-outline" size={16} color={colors.blue}/><Text style={s.previewText}>Preview mode. Nothing you enter here will be saved.</Text></View>}
      <View style={s.hero}>
        <View style={s.mascot}><CapybaraMoment size={step === 1 ? 84 : 92} waving={step !== 1}/></View>
        <Text style={s.eyebrow}>{slide.eyebrow}</Text>
        <Text style={s.title}>{slide.before}<Text style={s.titleAccent}>{slide.accent}</Text>{slide.after}</Text>
        <Text style={s.copy}>{slide.copy}</Text>
        {step === 0 ? <TicketPreview/> : step === 1 ? <PackingPreview/> : <MemoryPreview/>}
      </View>
      {step === 2 && <View style={s.form}>
        <Text style={s.formTitle}>Make it yours</Text><Text style={s.formCopy}>Start with a trip now, or add one later.</Text>
        <Field value={name} onChangeText={setName} placeholder="Your name" />
        <Field value={title} onChangeText={setTitle} placeholder="Trip name" />
        <AutocompleteField value={city} onChangeText={setCity} placeholder="City or destination" suggestions={destinationSuggestions} onPick={(suggestion) => setCountry(suggestion.detail ?? country)} />
        <Field value={country} onChangeText={setCountry} placeholder="Country" />
        <DateField value={startDate} onChangeText={(date) => { setStart(date); if (endDate && endDate <= date) setEnd(''); }} placeholder="Start date" rangeStart={startDate} rangeEnd={endDate}/>
        <DateField value={endDate} onChangeText={setEnd} placeholder="End date" minDate={startDate} rangeStart={startDate} rangeEnd={endDate}/>
        <Field value={companions} onChangeText={setCompanions} placeholder="Who is coming? (optional)" />
      </View>}
      <View style={s.footer}>
        <View style={s.tourControls}>
          {step > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Previous onboarding step" onPress={() => setStep((current) => Math.max(0, current - 1))} style={s.backButton}>
              <Ionicons name="arrow-back" size={17} color={colors.blue}/><Text style={s.backText}>Back</Text>
            </Pressable>
          ) : <View style={s.backPlaceholder}/>}<View />
          <View><Text style={s.stepLabel}>Step {step + 1} of {slides.length}</Text><View style={s.dots}>{slides.map((_, index) => <View key={index} style={[s.dot, index === step && s.active]} />)}</View></View>
          <View style={s.backPlaceholder}/>
        </View>
        <PrimaryButton title={step === 2 ? (preview ? 'Back to profile' : 'Continue') : 'Next'} icon={step === 2 ? (preview ? 'arrow-back' : 'checkmark') : 'arrow-forward'} onPress={step === 2 ? finish : () => setStep((current) => Math.min(slides.length - 1, current + 1))} />
        {step === 2 && <Text style={s.note}>{preview ? 'This preview leaves your profile and trips unchanged.' : 'You can create more trips or invite someone later.'}</Text>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function TicketPreview() { return <View style={[s.previewCard, s.ticketCard]}><View style={s.ticketTop}><View style={s.ticketIcon}><Ionicons name="airplane" size={17} color="#fff"/></View><View style={{ flex: 1 }}><Text style={s.ticketPlace}>LISBON, PORTUGAL</Text><Text style={s.ticketTitle}>A long weekend away</Text></View><View style={s.upcomingBadge}><Text style={s.upcomingText}>Upcoming</Text></View></View><Text style={s.ticketCountdown}>Starts in 12 days</Text><View style={s.ticketProgressHead}><Text style={s.previewMuted}>PACKED</Text><Text style={s.previewStrong}>3 of 8</Text></View><View style={s.progressTrack}><View style={[s.progressFill, { width: '38%' }]}/></View></View>; }
function PackingPreview() { return <View style={[s.previewCard, s.packingCard]}><View style={s.previewHeader}><View><Text style={s.previewLabel}>PACKING LIST</Text><Text style={s.previewHeading}>Ready for Lisbon</Text></View><View style={s.checkCount}><Ionicons name="checkmark" size={14} color="#fff"/><Text style={s.checkCountText}>3</Text></View></View>{['Passport', 'Light jacket', 'Charger'].map((item, index) => <View style={s.checkRow} key={item}><Ionicons name="checkmark-circle" size={20} color={index === 2 ? colors.muted : colors.teal}/><Text style={[s.checkText, index === 2 && s.checkTextMuted]}>{item}</Text>{index === 2 && <Text style={s.youBring}>You</Text>}</View>)}<View style={s.notification}><View style={s.notificationIcon}><Ionicons name="notifications-outline" size={16} color={colors.blue}/></View><View style={{ flex: 1 }}><Text style={s.notificationTitle}>Travino</Text><Text style={s.notificationCopy}>Mia packed the sunscreen.</Text></View></View></View>; }
function MemoryPreview() { return <View style={[s.previewCard, s.memoryCard]}><View style={s.memorySky}><View style={s.memorySun}/><Ionicons name="location" size={22} color="#fff" style={s.memoryPin}/><Text style={s.memoryLocation}>MADEIRA</Text></View><View style={s.memoryDetails}><View style={s.memoryDate}><Text style={s.memoryDateDay}>19</Text><Text style={s.memoryDateMonth}>OCT</Text></View><View style={{ flex: 1 }}><Text style={s.previewHeading}>The swim before breakfast</Text><Text style={s.memoryCopy}>A quiet morning worth keeping.</Text></View><Ionicons name="heart" size={20} color={colors.coral}/></View></View>; }

const s = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background }, page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, minHeight: '100%', padding: 16, paddingTop: 70, paddingBottom: 42, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, fontWeight: '700', letterSpacing: -.15 }, skip: { color: colors.blue, fontSize: 15, fontWeight: '600', minHeight: 44, textAlignVertical: 'center' }, previewNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D9EAFF' }, previewText: { flex: 1, color: colors.blue, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  hero: { alignItems: 'center', paddingTop: 24 }, mascot: { height: 75, justifyContent: 'flex-end', marginBottom: 4 }, eyebrow: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: .75, textTransform: 'uppercase', textAlign: 'center', marginTop: 8 }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 36, fontWeight: '700', letterSpacing: -.65, lineHeight: 43, textAlign: 'center', marginTop: 8, maxWidth: 340 }, titleAccent: { color: colors.blue }, copy: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 23, marginTop: 11, maxWidth: 330 },
  previewCard: { width: '100%', maxWidth: 344, marginTop: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOpacity: .07, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 }, ticketCard: { borderRadius: 22, padding: 17, backgroundColor: '#EFF7FF', borderColor: '#CBE4FF' }, ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, ticketIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }, ticketPlace: { color: colors.blue, fontSize: 9, fontWeight: '700', letterSpacing: .75 }, ticketTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700', marginTop: 2 }, upcomingBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBE4FF' }, upcomingText: { color: colors.blue, fontSize: 10, fontWeight: '700' }, ticketCountdown: { color: colors.text, fontFamily: fonts.heading, fontSize: 23, fontWeight: '700', marginTop: 19 }, ticketProgressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, previewMuted: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: .65 }, previewStrong: { color: colors.text, fontSize: 11, fontWeight: '700' }, progressTrack: { height: 7, borderRadius: 7, overflow: 'hidden', backgroundColor: '#D6E8FC', marginTop: 7 }, progressFill: { height: '100%', backgroundColor: colors.blue, borderRadius: 7 },
  packingCard: { borderRadius: 19, padding: 16, gap: 11 }, previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 3 }, previewLabel: { color: colors.purple, fontSize: 10, fontWeight: '700', letterSpacing: .8 }, previewHeading: { color: colors.text, fontFamily: fonts.heading, fontSize: 16, fontWeight: '700', marginTop: 2 }, checkCount: { minWidth: 32, height: 28, borderRadius: 14, backgroundColor: colors.teal, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 }, checkCountText: { color: '#fff', fontSize: 12, fontWeight: '700' }, checkRow: { minHeight: 27, flexDirection: 'row', alignItems: 'center', gap: 9 }, checkText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }, checkTextMuted: { color: colors.muted }, youBring: { color: colors.blue, fontSize: 11, fontWeight: '600', backgroundColor: colors.blueSoft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 }, notification: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, marginTop: 4, borderRadius: 13, backgroundColor: '#F8F3FF' }, notificationIcon: { width: 29, height: 29, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, notificationTitle: { color: colors.text, fontSize: 11, fontWeight: '700' }, notificationCopy: { color: colors.muted, fontSize: 11, marginTop: 2 },
  memoryCard: { borderRadius: 20, overflow: 'hidden' }, memorySky: { height: 116, backgroundColor: '#74BDE6', justifyContent: 'flex-end', padding: 13 }, memorySun: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFCE6B', top: 17, right: 38 }, memoryPin: { position: 'absolute', right: 17, top: 19 }, memoryLocation: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: .8 }, memoryDetails: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 }, memoryDate: { width: 38, height: 45, borderRadius: 13, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center' }, memoryDateDay: { color: colors.coral, fontSize: 17, fontWeight: '700', lineHeight: 19 }, memoryDateMonth: { color: colors.coral, fontSize: 8, fontWeight: '700', letterSpacing: .5 }, memoryCopy: { color: colors.muted, fontSize: 12, marginTop: 3 },
  form: { marginTop: 29 }, formTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, fontWeight: '700', letterSpacing: -.05 }, formCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 14 }, footer: { gap: 18, marginTop: 30 }, tourControls: { minHeight: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, backButton: { minWidth: 58, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }, backText: { color: colors.blue, fontSize: 13, fontWeight: '600' }, backPlaceholder: { width: 58 }, stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 7 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border }, active: { backgroundColor: colors.blue, width: 26 }, note: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
