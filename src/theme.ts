import { StyleSheet } from 'react-native';

// Keep the familiar alias available to the shared overlays.
(StyleSheet as typeof StyleSheet & { absoluteFillObject?: typeof StyleSheet.absoluteFill }).absoluteFillObject = StyleSheet.absoluteFill;

// DAYO-inspired light palette. Existing semantic names keep presentation-only
// changes compatible with all existing screens and interactions.
export const colors = {
  blue: '#1670EF', blueBright: '#2E90FA', blueSoft: '#EFF8FF',
  purple: '#9363EF', purpleSoft: '#F3EDFF', pink: '#F53D88', pinkSoft: '#FFF0F6',
  // Soft map fills derived from the app's blue, purple, and pink accents.
  visitedCountryPalette: ['#DCEBFF', '#E6DCFF', '#FFE0EC', '#D5EFFF', '#EEE6FF', '#FFD6E6', '#D8F3E4', '#FFF0C7', '#DDF2F6', '#FFE3D4'],
  navy: '#1D1D28', teal: '#1670EF', mist: '#EFF8FF', sand: '#FFF5E8', coral: '#F53D88',
  background: '#FCF8F1', surface: '#FFFEFB', text: '#1D1D28', muted: '#555E6C', border: '#EAE2D8',
  ink: '#1D1D28', paper: '#FFFFFF', sun: '#FFF3D6', orange: '#1670EF', lime: '#EDE5FF',
  darkBackground: '#1D1D28', darkSurface: '#353448',
};

export const radius = { card: 18, pill: 999, small: 14, hero: 24 };

// Nunito stays rounded and warm, with wider, calmer letter shapes than Fredoka.
// Body copy stays in the platform system font.
export const fonts = {
  heading: 'Nunito_800ExtraBold',
};
