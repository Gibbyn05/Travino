// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Home', 'home-outline', 'home'] as const, ['trip', 'Trip', 'airplane-outline', 'airplane'] as const,
  ['today', 'Today', 'sunny-outline', 'sunny'] as const, ['profile', 'Profile', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.teal, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 82, paddingTop: 8, borderTopColor: colors.border, backgroundColor: colors.surface }, tabBarLabelStyle: { fontSize: 11, fontWeight: '650' } }}>
  {tabs.map(([name, title, outline, filled]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? filled : outline} color={color} size={23}/> }}/>)}</Tabs>; }
