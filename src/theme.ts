import { Appearance, StyleSheet } from 'react-native';

// React Native 0.86 exposes `absoluteFill`; keep this familiar alias for shared overlays.
(StyleSheet as typeof StyleSheet & { absoluteFillObject?: typeof StyleSheet.absoluteFill }).absoluteFillObject = StyleSheet.absoluteFill;

const dark = Appearance.getColorScheme() === 'dark';

export const colors = dark ? {
  navy: '#F6F1E8', teal: '#71B9AA', mist: '#254543', sand: '#73583C', coral: '#E59B7F',
  background: '#182D2F', surface: '#213B3D', text: '#F6F1E8', muted: '#C4D0C8', border: '#355354',
  darkBackground: '#182D2F', darkSurface: '#213B3D',
} : {
  navy: '#29484A', teal: '#398C82', mist: '#E6F0E9', sand: '#F4D7A4', coral: '#D98268',
  background: '#FCF8F2', surface: '#FFFDF9', text: '#344346', muted: '#71807A', border: '#E9E1D8',
  darkBackground: '#182D2F', darkSurface: '#213B3D',
};

export const radius = { card: 24, pill: 999, small: 16 };
