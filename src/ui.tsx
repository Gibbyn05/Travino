// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
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
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}><Ionicons name={icon} size={20} color="#fff"/><Text style={styles.primaryText}>{title}</Text></Pressable>;
}
export function Avatar({ name, image }: { name: string; image?: ImageSourcePropType }) {
  return image ? <Image source={image} style={styles.avatar}/> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>;
}
export function Chip({ label, warm = false }: { label: string; warm?: boolean }) { return <View style={[styles.chip, warm && styles.warmChip]}><Text style={[styles.chipText, warm && { color: colors.navy }]}>{label}</Text></View>; }

export const styles = StyleSheet.create({
  titleWrap: { gap: 5, marginBottom: 25 }, eyebrow: { color: colors.teal, fontSize: 12, fontWeight: '800', letterSpacing: .8, textTransform: 'uppercase' },
  title: { color: colors.navy, fontSize: 34, fontWeight: '800', letterSpacing: -1.15, lineHeight: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 19, borderWidth: 1, borderColor: colors.border, shadowColor: colors.navy, shadowOpacity: .045, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  section: { gap: 13, marginTop: 32 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 2 },
  sectionTitle: { color: colors.navy, fontSize: 20, fontWeight: '800', letterSpacing: -.45 }, action: { color: colors.teal, fontSize: 14, fontWeight: '800' },
  primary: { minHeight: 56, paddingHorizontal: 20, borderRadius: 19, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, shadowColor: colors.teal, shadowOpacity: .16, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, primaryPressed: { opacity: .9, transform: [{ scale: .985 }], shadowOpacity: .06 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -.15 }, avatar: { height: 34, width: 34, borderRadius: 17, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }, avatarText: { color: colors.navy, fontWeight: '800' },
  chip: { backgroundColor: colors.mist, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7 }, warmChip: { backgroundColor: colors.sand }, chipText: { color: colors.teal, fontSize: 12, fontWeight: '800' },
});
