import { Appearance, StyleSheet } from 'react-native';

// React Native 0.86 exposes `absoluteFill`; keep this familiar alias for shared overlays.
(StyleSheet as typeof StyleSheet & { absoluteFillObject?: typeof StyleSheet.absoluteFill }).absoluteFillObject = StyleSheet.absoluteFill;

const dark = Appearance.getColorScheme() === 'dark';

export const colors = dark ? {
  navy: '#F4F8F7', teal: '#55AEA7', mist: '#23434A', sand: '#6D5730', coral: '#F09B7D',
  background: '#10242C', surface: '#18323B', text: '#F4F8F7', muted: '#B6CAC5', border: '#2D4B52',
  darkBackground: '#10242C', darkSurface: '#18323B',
} : {
  navy: '#193B47', teal: '#2C8C88', mist: '#E8F2EF', sand: '#FFE3B0', coral: '#EE8A68',
  background: '#F8FBFA', surface: '#FFFFFF', text: '#1A2931', muted: '#667976', border: '#E3ECE9',
  darkBackground: '#10242C', darkSurface: '#18323B',
};

export const radius = { card: 22, pill: 999, small: 14 };
