// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Home', 'home-outline', 'home'] as const, ['trip', 'Trip', 'airplane-outline', 'airplane'] as const,
  ['today', 'Today', 'sunny-outline', 'sunny'] as const, ['map', 'Map', 'earth-outline', 'earth'] as const,
  ['profile', 'Profile', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 82, paddingTop: 9, paddingBottom: 9, borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOpacity: .035, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 2 }, tabBarItemStyle: { borderRadius: 18 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 } }}>
  {tabs.map(([name, title, outline, filled]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? filled : outline} color={color} size={23}/> }}/>)}</Tabs>; }
