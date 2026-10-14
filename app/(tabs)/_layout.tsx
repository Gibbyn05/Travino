// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { colors } from '@/src/theme';

const tabs = [
  ['index', 'Home', 'home-outline', 'home'] as const, ['trip', 'Trip', 'airplane-outline', 'airplane'] as const,
  ['today', 'Today', 'sunny-outline', 'sunny'] as const, ['map', 'Map', 'earth-outline', 'earth'] as const,
  ['profile', 'Profile', 'person-outline', 'person'] as const,
];
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 86, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOpacity: .035, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 2 }, tabBarItemStyle: { borderRadius: 18 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 1 } }}>
  {tabs.map(([name, title, outline]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, focused }) => <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? colors.blueSoft : 'transparent' }}><Ionicons name={outline} color={color} size={21}/></View> }}/>)}</Tabs>; }
