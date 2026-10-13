import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { TravelProvider, useTravel } from '@/src/store';

export default function RootLayout() {
  return <TravelProvider><StatusBar style="auto"/><AppNavigator/></TravelProvider>;
}

function AppNavigator() {
  const { ready } = useTravel();
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#F8FBFA' }}/>;
  return <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false, animation: 'fade' }}><Stack.Screen name="onboarding"/><Stack.Screen name="(tabs)"/><Stack.Screen name="premium" options={{ presentation: 'modal' }}/></Stack>;
}
