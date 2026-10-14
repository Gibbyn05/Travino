import { StyleSheet } from 'react-native';

// Keep the familiar alias available to the shared overlays.
(StyleSheet as typeof StyleSheet & { absoluteFillObject?: typeof StyleSheet.absoluteFill }).absoluteFillObject = StyleSheet.absoluteFill;

// DAYO-inspired light palette. Existing semantic names keep presentation-only
// changes compatible with all existing screens and interactions.
export const colors = {
  blue: '#1670EF', blueBright: '#2E90FA', blueSoft: '#EFF8FF',
  purple: '#9363EF', purpleSoft: '#F3EDFF', pink: '#F53D88', pinkSoft: '#FFF0F6',
  // Soft map fills derived from the app's blue, purple, and pink accents.
  visitedCountryPalette: ['#DCEBFF', '#E6DCFF', '#FFE0EC', '#D5EFFF', '#EEE6FF', '#FFD6E6'],
  navy: '#1D1D28', teal: '#1670EF', mist: '#EFF8FF', sand: '#FFF5E8', coral: '#F53D88',
  background: '#FDFDFD', surface: '#FFFFFF', text: '#1D1D28', muted: '#717680', border: '#E9EAEB',
  ink: '#1D1D28', paper: '#FFFFFF', sun: '#FFF3D6', orange: '#1670EF', lime: '#EDE5FF',
  darkBackground: '#1D1D28', darkSurface: '#353448',
};

export const radius = { card: 24, pill: 999, small: 16, hero: 28 };
