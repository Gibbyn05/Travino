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
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && { opacity: .82 }]}><Ionicons name={icon} size={20} color="#fff"/><Text style={styles.primaryText}>{title}</Text></Pressable>;
}
export function Avatar({ name, image }: { name: string; image?: ImageSourcePropType }) {
  return image ? <Image source={image} style={styles.avatar}/> : <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1)}</Text></View>;
}
export function Chip({ label, warm = false }: { label: string; warm?: boolean }) { return <View style={[styles.chip, warm && styles.warmChip]}><Text style={[styles.chipText, warm && { color: colors.navy }]}>{label}</Text></View>; }

export const styles = StyleSheet.create({
  titleWrap: { gap: 3, marginBottom: 20 }, eyebrow: { color: colors.teal, fontSize: 13, fontWeight: '700', letterSpacing: .4 },
  title: { color: colors.navy, fontSize: 32, fontWeight: '800', letterSpacing: -.8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 18, borderWidth: 1, borderColor: colors.border },
  section: { gap: 12, marginTop: 28 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { color: colors.navy, fontSize: 19, fontWeight: '750', letterSpacing: -.3 }, action: { color: colors.teal, fontSize: 14, fontWeight: '700' },
  primary: { height: 54, borderRadius: 18, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' }, avatar: { height: 32, width: 32, borderRadius: 16, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }, avatarText: { color: colors.navy, fontWeight: '800' },
  chip: { backgroundColor: colors.mist, alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }, warmChip: { backgroundColor: colors.sand }, chipText: { color: colors.teal, fontSize: 12, fontWeight: '750' },
});
