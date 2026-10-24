// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ImageBackground, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from './theme';
import { stockCoverForCountry } from './country-images';
import { CapybaraMoment, CapybaraVariant } from './capybara';
export { CapybaraMoment } from './capybara';

const titleColors = [colors.blue, '#7350BD', '#B34383'];
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
export function EmptyMoment({ title, copy, actionTitle, onPress, icon = 'arrow-forward', compact = false, mascot = 'travel', style }: { title: string; copy: string; actionTitle?: string; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap; compact?: boolean; mascot?: CapybaraVariant; style?: object }) {
  return <View style={[styles.emptyMoment, compact && styles.emptyMomentCompact, style]}>
    <View style={[styles.emptyMomentHeading, compact && styles.emptyMomentHeadingCompact]}>
      <CapybaraMoment size={compact ? 88 : 144} variant={mascot}/>
      <Text accessibilityRole="header" style={[styles.emptyMomentTitle, compact && styles.emptyMomentTitleCompact]}>{title}</Text>
    </View>
    <Text style={[styles.emptyMomentCopy, compact && styles.emptyMomentCopyCompact]}>{copy}</Text>
    {actionTitle && onPress ? <View style={styles.emptyMomentAction}><PrimaryButton title={actionTitle} onPress={onPress} icon={icon}/></View> : null}
  </View>;
}

export const styles = StyleSheet.create({
  titleWrap: { gap: 5, marginBottom: 24 }, eyebrow: { color: colors.muted, fontSize: 18, fontWeight: '400', letterSpacing: -.1, lineHeight: 26},
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, fontWeight: '700', letterSpacing: 0, lineHeight: 50 },
  titleAccent: { marginTop: -8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, borderWidth: 1, borderColor: colors.border, shadowColor: colors.ink, shadowOpacity: .025, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  section: { gap: 14, marginTop: 32 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 1 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, fontWeight: '700', letterSpacing: 0 }, action: { color: colors.blue, fontSize: 17, fontWeight: '600', lineHeight: 24},
  primary: { minHeight: 60, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOpacity: .16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, primaryFill: { minHeight: 60, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, primaryPressed: { opacity: .88, transform: [{ scale: .97 }] }, primaryDisabled: { shadowOpacity: 0 },
  primaryText: { color: '#FFFFFF', fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center', flexShrink: 1 }, primaryTextDisabled: { color: '#9E9A94' }, avatar: { height: 36, width: 36, borderRadius: 18, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }, avatarText: { color: colors.purple, fontWeight: '700' },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, warmChip: { backgroundColor: colors.purpleSoft, borderColor: colors.purpleSoft }, chipText: { color: colors.blue, fontSize: 16, fontWeight: '500', lineHeight: 23},
  emptyMoment: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFDF8' },
  emptyMomentCompact: { alignItems: 'stretch', padding: 18, gap: 10, borderRadius: 18, backgroundColor: '#F8F1E7' },
  emptyMomentHeading: { width: '100%', alignItems: 'center', gap: 8 }, emptyMomentHeadingCompact: { flexDirection: 'row', gap: 14 },
  emptyMomentTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 26, lineHeight: 34, textAlign: 'center' }, emptyMomentTitleCompact: { flex: 1, minWidth: 0, fontSize: 24, lineHeight: 31, textAlign: 'left' },
  emptyMomentCopy: { color: colors.muted, fontSize: 18, lineHeight: 26, textAlign: 'center', maxWidth: 300 }, emptyMomentCopyCompact: { textAlign: 'left', maxWidth: '100%' }, emptyMomentAction: { width: '100%', marginTop: 8 },
});
