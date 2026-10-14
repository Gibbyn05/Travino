// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './theme';

export function PageTitle({ children, eyebrow }: { children: string; eyebrow?: string }) {
  return <View style={styles.titleWrap}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.title}>{children}</Text></View>;
}
export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Section({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.action}>{action}</Text>}</View>{children}</View>;
}
export function PrimaryButton({ title, onPress, icon = 'add' }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}><LinearGradient colors={[colors.blue, '#2482F5', colors.blueBright]} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={styles.primaryFill}><Ionicons name={icon} size={19} color="#fff"/><Text style={styles.primaryText}>{title}</Text></LinearGradient></Pressable>;
}
export function Avatar({ name, image }: { name: string; image?: ImageSourcePropType }) {
  return image ? <Image source={image} style={styles.avatar}/> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>;
}
export function Chip({ label, warm = false }: { label: string; warm?: boolean }) { return <View style={[styles.chip, warm && styles.warmChip]}><Text style={[styles.chipText, warm && { color: colors.navy }]}>{label}</Text></View>; }

export const styles = StyleSheet.create({
  titleWrap: { gap: 5, marginBottom: 24 }, eyebrow: { color: colors.muted, fontSize: 14, fontWeight: '400', letterSpacing: -.1 },
  title: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -1.5, lineHeight: 39 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 20, borderWidth: 1, borderColor: colors.border, shadowColor: colors.ink, shadowOpacity: .035, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 1 },
  section: { gap: 14, marginTop: 32 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 1 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '700', letterSpacing: -.7 }, action: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  primary: { minHeight: 54, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOpacity: .16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, primaryFill: { minHeight: 54, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, primaryPressed: { opacity: .88, transform: [{ scale: .99 }] },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', letterSpacing: -.15 }, avatar: { height: 36, width: 36, borderRadius: 18, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }, avatarText: { color: colors.purple, fontWeight: '700' },
  chip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }, warmChip: { backgroundColor: colors.purpleSoft, borderColor: colors.purpleSoft }, chipText: { color: colors.blue, fontSize: 12, fontWeight: '500' },
});
