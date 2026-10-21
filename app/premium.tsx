import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboardingIllustrations } from '@/src/onboarding-illustrations';
import { PREMIUM_PLANS, PremiumPlanId, purchasePremium, restorePremiumPurchases } from '@/src/lib/purchases';
import { useTravel } from '@/src/store';
import { colors, fonts } from '@/src/theme';

type TimelineIcon = 'sparkles-outline' | 'notifications-outline' | 'checkmark-circle-outline';

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = [
  { icon: 'people-outline', text: 'Plan with your partner, friends and family' },
  { icon: 'map-outline', text: 'Shared itinerary, budget and packing lists' },
  { icon: 'sync-outline', text: 'Everything in sync in real time' },
];

const TIMELINE: Array<{ day: string; icon: TimelineIcon; copy: (planLabel: string, monthlyPrice: string) => string }> = [
  { day: 'Today', icon: 'sparkles-outline', copy: () => 'Get instant access, unlock every feature' },
  { day: 'Day 5', icon: 'notifications-outline', copy: () => 'Trial reminder, we will notify you before it ends' },
  { day: 'Day 7', icon: 'checkmark-circle-outline', copy: (planLabel, monthlyPrice) => `Trial ends, you are charged for the ${planLabel} plan at ${monthlyPrice} unless you cancel in the App Store` },
];

export default function PremiumScreen() {
  const params = useLocalSearchParams<{ after?: string | string[] }>();
  const after = Array.isArray(params.after) ? params.after[0] : params.after;
  const { setPremium } = useTravel();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanId>('annual');
  const [busy, setBusy] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const planPulse = useRef(new Animated.Value(1)).current;
  const compact = height < 740;
  const plan = PREMIUM_PLANS[selectedPlan];

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    Animated.timing(entrance, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrance, reduceMotion]);

  const finish = () => {
    if (after === 'new-trip') router.replace('/new-trip' as never);
    else if (after === 'tabs') router.replace('/' as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  };

  const selectPlan = (id: PremiumPlanId) => {
    if (id === selectedPlan) return;
    setSelectedPlan(id);
    if (reduceMotion) return;
    planPulse.setValue(0.97);
    Animated.spring(planPulse, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true }).start();
  };

  const subscribe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await purchasePremium(plan);
      if (result.status === 'purchased') {
        setPremium(true);
        finish();
      } else {
        Alert.alert('Purchases are not connected yet', result.reason);
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await restorePremiumPurchases();
      if (result.status === 'purchased') {
        setPremium(true);
        finish();
      } else {
        Alert.alert('Restore purchases', result.reason);
      }
    } finally {
      setBusy(false);
    }
  };

  const enter = (delay: number, distance = 16) => ({
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [distance + delay / 10, 0] }) }],
  });

  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      <View style={s.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close paywall" onPress={finish} hitSlop={10} style={({ pressed }) => [s.closeButton, pressed && s.pressed]}>
          <Ionicons name="close" size={23} color={colors.text}/>
        </Pressable>
        <Text style={s.topLabel}>TRAVINO PREMIUM</Text>
        <View style={s.closeSpacer}/>
      </View>

      <Animated.View style={[s.hero, enter(0, compact ? 10 : 18)]}>
        <Image accessibilityLabel="Happy Travino capybara" source={onboardingIllustrations.name} resizeMode="contain" style={[s.mascot, compact && s.mascotCompact]}/>
      </Animated.View>

      <Animated.View style={[s.headingBlock, enter(40, 18)]}>
        <Text accessibilityRole="header" style={[s.title, compact && s.titleCompact]}>Plan trips together, for free for 7 days</Text>
        <Text style={s.subtitle}>Bring the people, plans and little memories that make a trip yours.</Text>
      </Animated.View>

      <Animated.View style={[s.timeline, enter(80, 18)]} accessibilityLabel="Seven day free trial timeline">
        {TIMELINE.map((item, index) => <View key={item.day} style={s.timelineRow}>
          <View style={s.timelineRail}>
            <View style={s.timelineDot}><Ionicons name={item.icon} size={15} color={colors.blue}/></View>
            {index < TIMELINE.length - 1 ? <View style={s.timelineLine}/> : null}
          </View>
          <View style={s.timelineCopy}><Text style={s.timelineDay}>{item.day}</Text><Text style={s.timelineText}>{item.copy(plan.label, plan.monthlyPrice)}</Text></View>
        </View>)}
      </Animated.View>

      <Animated.View style={[s.benefits, enter(120, 18)]}>
        {BENEFITS.map((benefit) => <View key={benefit.text} style={s.benefitRow}><View style={s.benefitIcon}><Ionicons name={benefit.icon} size={18} color={colors.blue}/></View><Text style={s.benefitText}>{benefit.text}</Text></View>)}
      </Animated.View>

      <Animated.View style={[s.plans, enter(160, 18)]} accessibilityLabel="Choose a premium plan">
        <PlanCard plan={PREMIUM_PLANS.monthly} selected={selectedPlan === 'monthly'} pulse={planPulse} onPress={() => selectPlan('monthly')}/>
        <PlanCard plan={PREMIUM_PLANS.annual} selected={selectedPlan === 'annual'} pulse={planPulse} onPress={() => selectPlan('annual')}/>
      </Animated.View>

      <Animated.View style={[s.actionBlock, enter(200, 18)]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Try free and subscribe with the ${plan.label} plan`} disabled={busy} onPress={subscribe} style={({ pressed }) => [s.primaryButton, busy && s.disabled, pressed && !busy && s.pressed]}>
          <Text style={s.primaryButtonText}>{busy ? 'Connecting…' : `Try free and subscribe · ${plan.monthlyPrice}`}</Text>
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF"/>
        </Pressable>
        <Text style={s.legalCopy}>Cancel anytime in the App Store before the trial ends.</Text>
        <View style={s.links}>
          <Pressable accessibilityRole="button" accessibilityLabel="Restore purchases" onPress={restore} disabled={busy} hitSlop={8}><Text style={s.link}>Restore purchases</Text></Pressable>
          <Text style={s.linkDivider}>·</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="Terms of use" onPress={() => Alert.alert('Terms', 'TODO: Add the App Store terms URL before release.')} hitSlop={8}><Text style={s.link}>Terms</Text></Pressable>
          <Text style={s.linkDivider}>·</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="Privacy policy" onPress={() => Alert.alert('Privacy', 'TODO: Add the privacy policy URL before release.')} hitSlop={8}><Text style={s.link}>Privacy</Text></Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  </SafeAreaView>;
}

function PlanCard({ plan, selected, pulse, onPress }: { plan: typeof PREMIUM_PLANS.monthly; selected: boolean; pulse: Animated.Value; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={`${plan.label}, ${plan.monthlyPrice}`} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [s.planPressable, pressed && s.pressed]}>
    <Animated.View style={[s.planCard, selected && s.selectedPlan, selected && { transform: [{ scale: pulse }] }]}>
      {plan.popular ? <View style={s.popularBadge}><Text style={s.popularText}>Popular</Text></View> : null}
      <View style={[s.planCheck, selected && s.planCheckSelected]}>{selected ? <Ionicons name="checkmark" size={17} color="#FFFFFF"/> : null}</View>
      <View style={s.planMain}><Text style={s.planLabel}>{plan.label}</Text><Text style={s.planPrice}>{plan.monthlyPrice}</Text><Text style={s.planBilling}>{plan.billingCopy}</Text></View>
      <View style={s.planTotal}>{plan.crossedOutPrice ? <Text style={s.crossedOut}>{plan.crossedOutPrice}</Text> : null}<Text style={s.totalPrice}>{plan.totalPrice}</Text></View>
    </Animated.View>
  </Pressable>;
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 4 },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeSpacer: { width: 44, height: 44 },
  topLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  hero: { alignItems: 'center', justifyContent: 'center', height: 220, marginTop: 4 },
  mascot: { width: 300, height: 220 },
  mascotCompact: { width: 250, height: 184 },
  headingBlock: { alignItems: 'center', paddingHorizontal: 4 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, textAlign: 'center' },
  titleCompact: { fontSize: 29, lineHeight: 35 },
  subtitle: { maxWidth: 380, marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  timeline: { marginTop: 22, paddingHorizontal: 2 },
  timelineRow: { minHeight: 58, flexDirection: 'row' },
  timelineRail: { width: 34, alignItems: 'center' },
  timelineDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#DCEBFF', zIndex: 1 },
  timelineLine: { position: 'absolute', top: 29, bottom: -2, width: 1, backgroundColor: '#CFE1FB' },
  timelineCopy: { flex: 1, paddingLeft: 12, paddingBottom: 14 },
  timelineDay: { color: colors.text, fontSize: 14, fontWeight: '800' },
  timelineText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  benefits: { marginTop: 8, gap: 10 },
  benefitRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  benefitText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  plans: { marginTop: 20, gap: 10 },
  planPressable: { borderRadius: 20 },
  planCard: { minHeight: 84, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedPlan: { borderWidth: 2, borderColor: colors.blue, backgroundColor: '#F8FBFF' },
  popularBadge: { position: 'absolute', top: -10, right: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#FFD75A' },
  popularText: { color: '#5A4100', fontSize: 10, fontWeight: '900', letterSpacing: .2 },
  planCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
  planCheckSelected: { borderColor: colors.blue, backgroundColor: colors.blue },
  planMain: { flex: 1, minWidth: 0 },
  planLabel: { color: colors.text, fontSize: 15, fontWeight: '900' },
  planPrice: { color: colors.blue, fontSize: 16, fontWeight: '900', marginTop: 2 },
  planBilling: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  planTotal: { minWidth: 90, alignItems: 'flex-end' },
  crossedOut: { color: colors.muted, fontSize: 11, textDecorationLine: 'line-through' },
  totalPrice: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 2, textAlign: 'right' },
  actionBlock: { marginTop: 20, alignItems: 'center' },
  primaryButton: { width: '100%', minHeight: 58, borderRadius: 20, paddingHorizontal: 18, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  legalCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 9 },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 12, marginBottom: 4 },
  link: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  linkDivider: { color: colors.border, fontSize: 13 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  disabled: { opacity: 0.6 },
});
