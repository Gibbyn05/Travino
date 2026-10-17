import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts } from '@expo-google-fonts/fredoka';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { TravelProvider, useTravel } from '@/src/store';
import { colors } from '@/src/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.background }}/>;
  return <TravelProvider><StatusBar style="auto"/><AppNavigator/></TravelProvider>;
}

function AppNavigator() {
  const { ready } = useTravel();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }}/>;
  return <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false, animation: 'fade' }}><Stack.Screen name="onboarding"/><Stack.Screen name="(tabs)"/><Stack.Screen name="premium" options={{ presentation: 'modal' }}/><Stack.Screen name="activity-browser" options={{ animation: 'slide_from_right' }}/></Stack>;
}
