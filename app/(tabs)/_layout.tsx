// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Home', 'home-outline', 'home'] as const, ['trip', 'Trip', 'airplane-outline', 'airplane'] as const,
  ['map', 'Map', 'earth-outline', 'earth'] as const, ['today', 'Countdown', 'hourglass-outline', 'hourglass'] as const,
  ['friends', 'Friends', 'people-outline', 'people'] as const, ['profile', 'Profile', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: colors.muted, tabBarHideOnKeyboard: true, tabBarLabelPosition: 'below-icon', tabBarStyle: Platform.OS === 'web' ? { display: 'none' } : { height: 84, marginHorizontal: 12, marginBottom: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 25, borderColor: 'rgba(234,226,216,.9)', borderTopWidth: 1, borderWidth: 1, backgroundColor: 'rgba(255,254,251,.94)', shadowColor: colors.ink, shadowOpacity: .09, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, tabBarItemStyle: { flex: 1, minWidth: 0, borderRadius: 18, paddingHorizontal: 0 }, tabBarIconStyle: { width: 36, height: 36, marginTop: 0 }, tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 5 } }}>
  {tabs.map(([name, title, outline, filled]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarLabel: name === 'today' ? 'Days' : title, tabBarAccessibilityLabel: title, tabBarIcon: ({ color, focused }) => <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.blue : 'transparent' }}><Ionicons name={focused ? filled : outline} color={focused ? '#FFFFFF' : color} size={21}/></View> }}/>)}</Tabs>; }
