import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme';
export default function PremiumScreen() { return <View style={s.page}><Pressable onPress={() => router.back()}><Text style={s.close}>Lukk</Text></Pressable><View style={s.content}><Text style={s.title}>Premium settes opp</Text><Text style={s.copy}>Kjøp aktiveres først når App Store-produktet og RevenueCat er konfigurert. Ingen kjøp eller prøveabonnement simuleres i appen.</Text></View></View>; }
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 72 }, close: { color: colors.orange, fontSize: 15, fontWeight: '900' }, content: { flex: 1, justifyContent: 'center', gap: 16, maxWidth: 340 }, title: { color: colors.navy, fontSize: 40, fontWeight: '900', letterSpacing: -1.6, lineHeight: 45 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 25 } });
