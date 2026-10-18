import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {
    ...config,
    name: config.name ?? 'Reisefølge',
    slug: config.slug ?? 'reisefolge',
    plugins: [...(config.plugins ?? []), 'expo-font'],
    extra: {
      ...config.extra,
      eas: { ...config.extra?.eas, ...(projectId ? { projectId } : {}) },
    },
  };
};