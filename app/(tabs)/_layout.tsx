// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Home', 'home-outline', 'home'] as const, ['trip', 'Trip', 'airplane-outline', 'airplane'] as const,
  ['today', 'Today', 'sunny-outline', 'sunny'] as const, ['map', 'Map', 'earth-outline', 'earth'] as const,
  ['profile', 'Profile', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 84, paddingTop: 9, paddingBottom: 8, borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.surface, shadowColor: colors.navy, shadowOpacity: .04, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 5 }, tabBarItemStyle: { borderRadius: 16 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 } }}>
  {tabs.map(([name, title, outline, filled]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? filled : outline} color={color} size={23}/> }}/>)}</Tabs>; }
