import { StyleSheet, Text, View } from 'react-native';
import { CapybaraMoment, type CapybaraVariant } from './capybara';
import { colors } from './theme';

/** One spoken prompt, with room for the mascot and text to grow independently. */
export function CapybaraGuide({ children, variant = 'travel', size = 112, prominent = false, announce = false }: {
  children: string;
  variant?: CapybaraVariant;
  size?: number;
  prominent?: boolean;
  announce?: boolean;
}) {
  return <View style={s.guide}>
    <CapybaraMoment size={size} variant={variant}/>
    <View style={s.bubble}>
      <View pointerEvents="none" accessible={false} aria-hidden style={s.tail}/>
      <Text accessibilityRole="header" accessibilityLiveRegion={announce ? 'polite' : undefined} style={[s.line, prominent && s.prominent]}>{children}</Text>
    </View>
  </View>;
}

const s = StyleSheet.create({
  guide: { alignSelf: 'stretch', alignItems: 'center', gap: 4 },
  bubble: { alignSelf: 'stretch', marginHorizontal: 8, backgroundColor: colors.paper, borderColor: colors.ink, borderWidth: 3, borderTopLeftRadius: 28, borderTopRightRadius: 25, borderBottomLeftRadius: 23, borderBottomRightRadius: 28, paddingHorizontal: 14, paddingVertical: 8, shadowColor: colors.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: .12, shadowRadius: 2, elevation: 2 },
  tail: { position: 'absolute', top: -12, left: '50%', marginLeft: -10, width: 20, height: 20, backgroundColor: colors.paper, borderTopWidth: 3, borderLeftWidth: 3, borderColor: colors.ink, transform: [{ rotate: '45deg' }] },
  line: { color: colors.text, fontFamily: 'Nunito_800ExtraBold_Italic', fontSize: 28, lineHeight: 36, textAlign: 'center' },
  prominent: { fontSize: 32, lineHeight: 40 },
});
