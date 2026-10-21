import { ImageSourcePropType } from 'react-native';

/**
 * The single asset map for the welcome flow. Replacing the mascot art later
 * only requires changing these sources, not the individual onboarding steps.
 */
export const onboardingIllustrations: Record<'home' | 'map' | 'plane' | 'name' | 'age' | 'from' | 'welcome', ImageSourcePropType> = {
  home: require('../assets/onboarding/travino-onboarding-white-home-transparent.png'),
  map: require('../assets/onboarding/travino-onboarding-white-map2-transparent.png'),
  plane: require('../assets/onboarding/travino-onboarding-white-plane-transparent.png'),
  name: require('../assets/onboarding/travino-onboarding-field-name-transparent.png'),
  age: require('../assets/onboarding/travino-onboarding-field-age-transparent.png'),
  from: require('../assets/onboarding/travino-onboarding-field-from-transparent.png'),
  welcome: require('../assets/onboarding/travino-onboarding-white-welcome-transparent.png'),
};
