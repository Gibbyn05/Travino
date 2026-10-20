import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {
    ...config,
    name: config.name ?? 'Travino',
    slug: config.slug ?? 'reisefolge',
    plugins: [...(config.plugins ?? []), 'expo-font', ['expo-image-picker', {
      photosPermission: 'Travino uses your photo library only when you choose a profile picture.',
      cameraPermission: 'Travino uses your camera only when you take a profile picture.',
    }]],
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, ...(projectId ? { projectId } : {}) },
    },
  };
};
