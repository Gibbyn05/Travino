import { ImageSourcePropType } from 'react-native';

/**
 * The single asset map for the welcome flow. Replacing the mascot art later
 * only requires changing these sources, not the individual onboarding steps.
 */
export const onboardingIllustrations: Record<'home' | 'map' | 'plane' | 'name' | 'age' | 'from' | 'welcome', ImageSourcePropType> = {
  home: require('../assets/onboarding/home.png'),
  map: require('../assets/onboarding/map.png'),
  plane: require('../assets/onboarding/plane.png'),
  name: require('../assets/onboarding/name.png'),
  age: require('../assets/onboarding/age.png'),
  from: require('../assets/onboarding/from.png'),
  // The requested white welcome artwork was not included with the supplied files.
  // Keep the fallback here so it can be swapped without touching the screen layout.
  welcome: require('../assets/onboarding/plane.png'),
};
