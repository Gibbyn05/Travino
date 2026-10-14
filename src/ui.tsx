// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './theme';

export function PageTitle({ children, eyebrow }: { children: string; eyebrow?: string }) {
  return <View style={styles.titleWrap}>{eyebrow && <View style={styles.eyebrowRow}><View style={styles.eyebrowDot}/><Text style={styles.eyebrow}>{eyebrow}</Text></View>}<Text style={styles.title}>{children}</Text></View>;
}
export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Section({ title, action, children }: { title: string; action?: string; children: ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.action}>{action}</Text>}</View>{children}</View>;
}
export function PrimaryButton({ title, onPress, icon = 'add' }: { title: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}><Ionicons name={icon} size={20} color="#fff"/><Text style={styles.primaryText}>{title}</Text></Pressable>;
}
export function Avatar({ name, image }: { name: string; image?: ImageSourcePropType }) {
  return image ? <Image source={image} style={styles.avatar}/> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>;
}
export function Chip({ label, warm = false }: { label: string; warm?: boolean }) { return <View style={[styles.chip, warm && styles.warmChip]}><Text style={[styles.chipText, warm && { color: colors.navy }]}>{label}</Text></View>; }

export const styles = StyleSheet.create({
  titleWrap: { gap: 7, marginBottom: 30 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange }, eyebrow: { color: colors.teal, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.navy, fontSize: 42, fontWeight: '900', letterSpacing: -1.8, lineHeight: 46 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 20, borderWidth: 1, borderColor: 'rgba(229,221,209,.72)', shadowColor: colors.ink, shadowOpacity: .065, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  section: { gap: 14, marginTop: 36 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 3 },
  sectionTitle: { color: colors.navy, fontSize: 22, fontWeight: '900', letterSpacing: -.7 }, action: { color: colors.orange, fontSize: 13, fontWeight: '900', letterSpacing: .1 },
  primary: { minHeight: 58, paddingHorizontal: 22, borderRadius: 20, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: colors.orange, shadowOpacity: .24, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, primaryPressed: { opacity: .9, transform: [{ scale: .98 }], shadowOpacity: .1 },
  primaryText: { color: '#FFFDF8', fontSize: 16, fontWeight: '900', letterSpacing: -.25 }, avatar: { height: 36, width: 36, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }, avatarText: { color: colors.ink, fontWeight: '900' },
  chip: { backgroundColor: colors.mist, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, warmChip: { backgroundColor: colors.sun }, chipText: { color: colors.teal, fontSize: 12, fontWeight: '900' },
});
