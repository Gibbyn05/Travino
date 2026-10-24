import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

const illustrations = {
  travel: require('../assets/mascot/capybara-travel.png'),
  packing: require('../assets/mascot/capybara-packing.png'),
  celebrate: require('../assets/mascot/capybara-celebrate.png'),
  memories: require('../assets/mascot/capybara-memories.png'),
  profile: require('../assets/mascot/capybara-profile.png'),
  friends: require('../assets/mascot/capybara-friends.png'),
};

export type CapybaraVariant = keyof typeof illustrations;

/** Decorative guidance: stays inside its own space and never intercepts a tap. */
export function CapybaraMoment({ size = 120, variant = 'travel' }: { size?: number; variant?: CapybaraVariant }) {
  const motion = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [loadedVariant, setLoadedVariant] = useState<CapybaraVariant | null>(null);
  const imageReady = loadedVariant === variant;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => { if (active) setReduceMotion(true); });
    const preference = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const visibility = AppState.addEventListener('change', setAppState);
    return () => { active = false; preference.remove(); visibility.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    motion.setValue(0);
    if (!imageReady || reduceMotion !== false || appState !== 'active') return;
    const timing = (toValue: number, duration: number) => Animated.timing(motion, {
      toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    // Wait for the art and screen transition, then greet twice and rest.
    const greeting = Animated.sequence([
      Animated.delay(300),
      Animated.loop(Animated.sequence([timing(1, 500), timing(-.35, 500), timing(0, 400)]), { iterations: 2 }),
    ]);
    greeting.start();
    return () => { greeting.stop(); motion.setValue(0); };
  }, [appState, imageReady, motion, reduceMotion, variant]));

  return <View testID={`capybara-${variant}`} pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, flexShrink: 0 }}>
    <Animated.View style={[s.art, { transform: [
      { translateY: motion.interpolate({ inputRange: [-1, 0, 1], outputRange: [2, 0, variant === 'celebrate' ? -4 : -3] }) },
      { rotate: motion.interpolate({ inputRange: [-1, 1], outputRange: ['-1deg', '1deg'] }) },
    ] }]}>
      <Image source={illustrations[variant]} onLoad={() => setLoadedVariant(variant)} resizeMode="contain" accessible={false} style={s.image}/>
    </Animated.View>
  </View>;
}

const s = StyleSheet.create({
  art: { flex: 1, padding: 4 },
  image: { width: '100%', height: '100%' },
});
