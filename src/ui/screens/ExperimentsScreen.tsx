import { StyleSheet, Text, View } from 'react-native';
import { PRESETS } from '../../physics/presets';
import { useStore, useUiSnapshot } from '../../sim/SimulationContext';
import { ScreenScroll } from '../components/ScreenScroll';
import { Btn, Panel, Readout } from '../components/Primitives';
import { colors, fonts, space } from '../../render/theme';

export function ExperimentsScreen({ onLoaded }: { onLoaded?: () => void }) {
  const store = useStore();
  const ui = useUiSnapshot();

  return (
    <ScreenScroll>
      {PRESETS.map((p) => {
        const active = ui.presetId === p.id;
        const seeds = p.build();
        const totalMass = seeds.reduce((a, s) => a + s.mass, 0);
        return (
          <Panel
            key={p.id}
            title={p.name}
            right={
              active ? <Text style={styles.active}>● ACTIVE</Text> : undefined
            }
          >
            <Text style={styles.tagline}>{p.tagline}</Text>
            <Text style={styles.description}>{p.description}</Text>
            <View style={styles.metaRow}>
              <Readout label="Bodies" value={String(seeds.length)} />
              <Readout label="Total mass" value={totalMass.toPrecision(3)} unit="mu" />
              <Readout label="G" value={String(p.G)} />
              <Readout label="Soften" value={String(p.softening)} />
            </View>
            <View style={styles.actions}>
              <Btn
                label="Load experiment"
                variant="primary"
                onPress={() => {
                  store.loadPreset(p.id, { fit: true, run: true });
                  onLoaded?.();
                }}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={styles.hint}>
              Deterministic initial conditions — loading always starts the same run. Edit bodies in
              the Inspector afterwards.
            </Text>
          </Panel>
        );
      })}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  tagline: {
    color: colors.cyan,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  description: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: space.md,
  },
  metaRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  actions: { flexDirection: 'row', gap: space.sm },
  hint: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: fonts.mono,
    marginTop: space.sm,
  },
  active: { color: colors.cyan, fontSize: 10, letterSpacing: 1.2, fontFamily: fonts.mono },
});
