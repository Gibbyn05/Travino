import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TravelProvider } from '@/src/store';

export default function RootLayout() {
  return <TravelProvider><StatusBar style="auto"/><Stack initialRouteName="onboarding" screenOptions={{ headerShown: false, animation: 'fade' }}><Stack.Screen name="onboarding"/><Stack.Screen name="(tabs)"/><Stack.Screen name="premium" options={{ presentation: 'modal' }}/></Stack></TravelProvider>;
}
