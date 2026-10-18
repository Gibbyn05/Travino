import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { useFonts } from '@expo-google-fonts/nunito';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TravelProvider, useTravel } from '@/src/store';
import { colors } from '@/src/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_800ExtraBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.background }}/>;
  return <SafeAreaProvider><TravelProvider><StatusBar style="auto"/><AppNavigator/></TravelProvider></SafeAreaProvider>;
}

function AppNavigator() {
  const { ready } = useTravel();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }}/>;
  return <Stack initialRouteName={Platform.OS === 'web' ? '(tabs)' : 'onboarding'} screenOptions={{ headerShown: false, animation: 'fade' }}><Stack.Screen name="onboarding"/><Stack.Screen name="(tabs)"/><Stack.Screen name="new-trip" options={{ animation: 'slide_from_right' }}/><Stack.Screen name="premium" options={{ presentation: 'modal' }}/><Stack.Screen name="activity-browser" options={{ animation: 'slide_from_right' }}/></Stack>;
}
