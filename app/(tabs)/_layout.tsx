// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Hjem', 'home-outline', 'home'] as const, ['trip', 'Turen', 'airplane-outline', 'airplane'] as const,
  ['today', 'I dag', 'sunny-outline', 'sunny'] as const, ['map', 'Kart', 'map-outline', 'map'] as const,
  ['profile', 'Profil', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 82, paddingTop: 8, borderTopColor: colors.border, backgroundColor: colors.surface }, tabBarLabelStyle: { fontSize: 11, fontWeight: '650' } }}>
  {tabs.map(([name, title, outline, filled]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? filled : outline} color={color} size={23}/> }}/>)}</Tabs>; }
