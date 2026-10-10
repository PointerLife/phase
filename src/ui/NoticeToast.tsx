import { StyleSheet, Text, View } from 'react-native';
import { useUiSnapshot } from '../sim/SimulationContext';
import { colors, fonts, radius, space } from '../render/theme';
import { rgba } from '../render/color';

/** Transient feedback for actions like save / load / limit reached. */
export function NoticeToast() {
  const ui = useUiSnapshot();
  if (!ui.notice) return null;
  const isError = ui.notice.kind === 'error';
  const tint = isError ? colors.red : colors.cyan;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.toast, { borderColor: rgba(tint, 0.5), backgroundColor: rgba(tint, 0.12) }]}>
        <Text style={[styles.text, { color: tint }]}>{ui.notice.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
  toast: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    maxWidth: '92%',
  },
  text: { fontSize: 11, fontFamily: fonts.mono, letterSpacing: 0.6, textAlign: 'center' },
});
