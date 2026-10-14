// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Home', 'home-outline', 'home'] as const, ['trip', 'Trip', 'airplane-outline', 'airplane'] as const,
  ['today', 'Today', 'sunny-outline', 'sunny'] as const, ['map', 'Map', 'earth-outline', 'earth'] as const,
  ['profile', 'Profile', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.orange, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 88, paddingTop: 10, paddingBottom: 10, borderTopColor: 'rgba(229,221,209,.8)', borderTopWidth: 1, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOpacity: .09, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 8 }, tabBarItemStyle: { borderRadius: 18 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '800', marginTop: 3 } }}>
  {tabs.map(([name, title, outline, filled]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? filled : outline} color={color} size={23}/> }}/>)}</Tabs>; }
