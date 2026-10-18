// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ImageBackground, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from './theme';
import { stockCoverForCountry } from './country-images';

const titleColors = [colors.blue, '#8EA9F8', '#EBA8D7'];
function titleRuns(value: string, darkFirst: boolean) {
  const words = value.trim().split(/\s+/);
  const offset = darkFirst && words.length > 1 ? 1 : 0;
  return words.map((word, index) => <Text key={`${word}-${index}`} style={{ color: darkFirst && words.length > 1 && index === 0 ? colors.text : titleColors[(index - offset + titleColors.length) % titleColors.length] }}>{word}{index < words.length - 1 ? ' ' : ''}</Text>);
}
export function PageTitle({ children, eyebrow, accent }: { children: string; eyebrow?: string; accent?: string }) {
  const runs = titleRuns(children, true);
  return <View style={styles.titleWrap}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.title}>{runs}</Text>{accent && <Text style={[styles.title, styles.titleAccent]}>{titleRuns(accent, false)}</Text>}</View>;
}
export function AccentText({ text, style }: { text: string; style?: object }) { return <Text style={style}>{titleRuns(text, text.trim().split(/\s+/).length > 1)}</Text>; }
export function Card({ children, style, enterDelay = 0 }: { children: ReactNode; style?: object; enterDelay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription?.remove?.(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); translateY.setValue(0); return; }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, delay: enterDelay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, delay: enterDelay, useNativeDriver: true }),
    ]).start();
  }, [enterDelay, opacity, reduceMotion, translateY]);
  return <Animated.View style={[styles.card, style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
export function Section({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHead}><AccentText text={title} style={styles.sectionTitle}/>{action && <Text style={styles.action}>{action}</Text>}</View>{children}</View>;
}
export function PrimaryButton({ title, onPress, icon = 'add', disabled = false }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, disabled && styles.primaryDisabled, pressed && !disabled && styles.primaryPressed]}><LinearGradient colors={disabled ? ['#E8E4DE', '#E8E4DE'] : [colors.blue, '#2482F5', colors.blueBright]} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={styles.primaryFill}><Ionicons name={icon} size={19} color={disabled ? '#9E9A94' : '#fff'}/><Text style={[styles.primaryText, disabled && styles.primaryTextDisabled]}>{title}</Text></LinearGradient></Pressable>;
}
export function Avatar({ name, image }: { name: string; image?: ImageSourcePropType }) {
  return image ? <Image source={image} style={styles.avatar}/> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>;
}
export function DestinationCover({ country, uri, style, imageStyle, children }: { country: string; uri?: string; style?: object; imageStyle?: object; children?: ReactNode }) {
  const cover = uri || stockCoverForCountry(country);
  return cover
    ? <ImageBackground source={{ uri: cover }} style={style} imageStyle={imageStyle}>{children}</ImageBackground>
    : <LinearGradient colors={['#1670EF', '#9363EF', '#F53D88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>{children}</LinearGradient>;
}
export function Chip({ label, warm = false }: { label: string; warm?: boolean }) { return <View style={[styles.chip, warm && styles.warmChip]}><Text style={[styles.chipText, warm && { color: colors.navy }]}>{label}</Text></View>; }
/** A small in-app mascot for moments that need a little guidance, not decoration. */
export function CapybaraMoment({ size = 76, waving = false }: { size?: number; waving?: boolean }) {
  const scale = size / 76;
  return <View accessibilityLabel="Travino capybara" style={{ width: size, height: size * .78, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.capybara, { transform: [{ scale }] }]}>
      <View style={[styles.capybaraEar, styles.capybaraEarBack]}/><View style={styles.capybaraEar}/>
      <View style={styles.capybaraBody}/><View style={styles.capybaraSnout}/>
      <View style={styles.capybaraEye}/><View style={styles.capybaraNose}/>
      {waving && <View style={styles.capybaraArm}/>}<View style={styles.capybaraFoot}/>
    </View>
  </View>;
}
export function EmptyMoment({ title, copy, actionTitle, onPress, icon = 'arrow-forward', compact = false, style }: { title: string; copy: string; actionTitle?: string; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap; compact?: boolean; style?: object }) {
  return <View style={[styles.emptyMoment, compact && styles.emptyMomentCompact, style]}>
    <CapybaraMoment size={compact ? 54 : 80} waving={!compact}/>
    <View style={compact ? { flex: 1 } : styles.emptyMomentText}>
      <Text style={[styles.emptyMomentTitle, compact && { textAlign: 'left' }]}>{title}</Text>
      <Text style={[styles.emptyMomentCopy, compact && { textAlign: 'left' }]}>{copy}</Text>
      {actionTitle && onPress ? <View style={styles.emptyMomentAction}><PrimaryButton title={actionTitle} onPress={onPress} icon={icon}/></View> : null}
    </View>
  </View>;
}

export const styles = StyleSheet.create({
  titleWrap: { gap: 5, marginBottom: 24 }, eyebrow: { color: colors.muted, fontSize: 16, fontWeight: '400', letterSpacing: -.1 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, fontWeight: '700', letterSpacing: 0, lineHeight: 50 },
  titleAccent: { marginTop: -8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, borderWidth: 1, borderColor: colors.border, shadowColor: colors.ink, shadowOpacity: .025, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  section: { gap: 14, marginTop: 32 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 1 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, fontWeight: '700', letterSpacing: 0 }, action: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  primary: { minHeight: 60, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOpacity: .16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, primaryFill: { minHeight: 60, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, primaryPressed: { opacity: .88, transform: [{ scale: .97 }] }, primaryDisabled: { shadowOpacity: 0 },
  primaryText: { color: '#FFFFFF', fontSize: 19, lineHeight: 26, fontWeight: '700', textAlign: 'center', flexShrink: 1 }, primaryTextDisabled: { color: '#9E9A94' }, avatar: { height: 36, width: 36, borderRadius: 18, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }, avatarText: { color: colors.purple, fontWeight: '700' },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, warmChip: { backgroundColor: colors.purpleSoft, borderColor: colors.purpleSoft }, chipText: { color: colors.blue, fontSize: 12, fontWeight: '500' },
  capybara: { width: 76, height: 58, position: 'relative' },
  capybaraBody: { position: 'absolute', left: 4, bottom: 4, width: 62, height: 40, borderRadius: 25, backgroundColor: '#B9784E', borderWidth: 3, borderColor: '#393141' },
  capybaraEar: { position: 'absolute', top: 1, left: 43, width: 17, height: 18, borderRadius: 10, backgroundColor: '#B9784E', borderWidth: 3, borderColor: '#393141', zIndex: 2 },
  capybaraEarBack: { left: 28, top: 5, zIndex: 1 }, capybaraSnout: { position: 'absolute', right: 0, bottom: 11, width: 28, height: 25, borderRadius: 14, backgroundColor: '#DBA36C', borderWidth: 3, borderColor: '#393141', zIndex: 3 },
  capybaraEye: { position: 'absolute', right: 23, bottom: 27, width: 5, height: 5, borderRadius: 4, backgroundColor: '#393141', zIndex: 4 }, capybaraNose: { position: 'absolute', right: 8, bottom: 20, width: 5, height: 5, borderRadius: 4, backgroundColor: '#393141', zIndex: 4 },
  capybaraFoot: { position: 'absolute', left: 18, bottom: 0, width: 18, height: 9, borderRadius: 7, backgroundColor: '#936044', borderWidth: 2, borderColor: '#393141', zIndex: 3 }, capybaraArm: { position: 'absolute', right: -3, bottom: 20, width: 11, height: 25, borderRadius: 8, backgroundColor: '#B9784E', borderWidth: 3, borderColor: '#393141', transform: [{ rotate: '-25deg' }], zIndex: 5 },
  emptyMoment: { alignItems: 'center', justifyContent: 'center', gap: 11, minHeight: 220, padding: 24, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFDF8' }, emptyMomentCompact: { minHeight: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 15, gap: 13, borderRadius: 16, backgroundColor: '#F8F1E7' },
  emptyMomentText: { alignItems: 'center' }, emptyMomentTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 24, lineHeight: 31, fontWeight: '700', textAlign: 'center' }, emptyMomentCopy: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 5, maxWidth: 280 }, emptyMomentAction: { width: '100%', marginTop: 15 },
});
