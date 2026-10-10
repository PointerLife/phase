import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore, useUiSnapshot } from '../sim/SimulationContext';
import { colors, fonts, labelStyle, radius, space } from '../render/theme';
import { rgba } from '../render/color';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function ControlBar() {
  const store = useStore();
  const ui = useUiSnapshot();

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => store.resetToInitial()}>
          <Text style={styles.btnLabel}>RESET</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.play, ui.running ? styles.playOn : styles.playOff]}
          onPress={() => store.toggleRun()}
        >
          <Text style={[styles.btnLabel, { color: ui.running ? colors.amber : colors.cyan }]}>
            {ui.running ? '❙❙ PAUSE' : '▶ PLAY'}
          </Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => store.stepOnce()}>
          <Text style={styles.btnLabel}>STEP</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {SPEED_OPTIONS.map((s) => {
          const on = Math.abs(ui.speed - s) < 1e-6;
          return (
            <Pressable
              key={s}
              style={[styles.chip, on ? styles.chipOn : null]}
              onPress={() => {
                store.setSpeed(s);
                if (!ui.running) store.play();
              }}
            >
              <Text style={[styles.chipText, on ? styles.chipTextOn : null]}>{s}×</Text>
            </Pressable>
          );
        })}
        <Text style={styles.speedLabel}>RATE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: 6,
  },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.raised,
    alignItems: 'center',
  },
  play: {},
  playOn: { borderColor: rgba(colors.amber, 0.5), backgroundColor: rgba(colors.amber, 0.08) },
  playOff: { borderColor: rgba(colors.cyan, 0.5), backgroundColor: rgba(colors.cyan, 0.1) },
  btnLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  chip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelAlt,
    alignItems: 'center',
  },
  chipOn: { borderColor: rgba(colors.cyan, 0.6), backgroundColor: rgba(colors.cyan, 0.12) },
  chipText: { color: colors.textDim, fontSize: 11, fontFamily: fonts.mono },
  chipTextOn: { color: colors.cyan },
  speedLabel: { ...labelStyle, fontSize: 9, marginLeft: 2 },
});
