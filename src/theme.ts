import { StyleSheet } from 'react-native';

// Keep the familiar alias available to the shared overlays.
(StyleSheet as typeof StyleSheet & { absoluteFillObject?: typeof StyleSheet.absoluteFill }).absoluteFillObject = StyleSheet.absoluteFill;

// Light, optimistic travel colours: a clean white canvas, powdery pastels,
// and one cheerful coral action colour. Existing semantic names keep this
// presentation-only.
export const colors = {
  navy: '#263154', teal: '#62B7B3', mist: '#E8F8F5', sand: '#FFE6AE', coral: '#FB8B78',
  background: '#FFFFFF', surface: '#FFFFFF', text: '#263154', muted: '#7C8498', border: '#EEF0F5',
  ink: '#263154', paper: '#FFFFFF', sun: '#FFE6AE', orange: '#FB8B78', lime: '#E2F4BF',
  darkBackground: '#263154', darkSurface: '#37436B',
};

export const radius = { card: 28, pill: 999, small: 18, hero: 32 };
