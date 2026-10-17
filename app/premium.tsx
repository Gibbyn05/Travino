import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/src/theme';
import { AccentText } from '@/src/ui';
export default function PremiumScreen() { return <View style={s.page}><Pressable onPress={() => router.back()}><Text style={s.close}>Close</Text></Pressable><View style={s.content}><AccentText text="Premium is being set up" style={s.title}/><Text style={s.copy}>Purchases are enabled once the App Store product and RevenueCat are configured. No purchase or trial subscription is simulated in the app.</Text></View></View>; }
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 72 }, close: { color: colors.blue, fontSize: 15, fontWeight: '600' }, content: { flex: 1, justifyContent: 'center', gap: 16, maxWidth: 340 }, title: { color: colors.text, fontFamily: fonts.heading, fontSize: 38, fontWeight: '700', letterSpacing: -.5, lineHeight: 48 }, copy: { color: colors.muted, fontSize: 16, lineHeight: 25 } });
