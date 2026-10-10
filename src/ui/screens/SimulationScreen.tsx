import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SimCanvas } from '../../render/SimCanvas';
import { useStore, useUiSnapshot } from '../../sim/SimulationContext';
import { ControlBar } from '../ControlBar';
import { Slider } from '../components/Slider';
import { Btn, Dot } from '../components/Primitives';
import { MAX_G, MAX_SOFTENING, MIN_G, MIN_SOFTENING } from '../../physics/constants';
import { colors, fonts, radius, space } from '../../render/theme';
import { rgba } from '../../render/color';

function ZoomButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.zoomBtn} onPress={onPress}>
      <Text style={styles.zoomLabel}>{label}</Text>
    </Pressable>
  );
}

export function SimulationScreen({ onOpenInspector }: { onOpenInspector?: () => void }) {
  const store = useStore();
  const ui = useUiSnapshot();
  const [showParams, setShowParams] = useState(false);

  const sel = ui.selected;
  const selColor = sel ? (store.getBodies().find((b) => b.id === sel.id)?.color ?? colors.cyan) : colors.cyan;

  return (
    <View style={styles.root}>
      <View style={styles.canvasWrap}>
        <SimCanvas />

        <View style={styles.topLeft} pointerEvents="box-none">
          {sel ? (
            <View style={styles.selChip}>
              <Dot color={selColor} size={8} />
              <Text style={styles.selName} numberOfLines={1}>
                {sel.name}
              </Text>
              <Pressable onPress={onOpenInspector} hitSlop={6}>
                <Text style={styles.selAction}>EDIT</Text>
              </Pressable>
              <Pressable onPress={() => store.removeBody(sel.id)} hitSlop={6}>
                <Text style={[styles.selAction, { color: colors.red }]}>DEL</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                DRAG EMPTY SPACE TO PAN · PINCH TO ZOOM · TAP A BODY TO SELECT
              </Text>
            </View>
          )}
        </View>

        <View style={styles.zoomCol}>
          <ZoomButton label="+" onPress={() => store.zoomBy(1.3)} />
          <ZoomButton label="–" onPress={() => store.zoomBy(1 / 1.3)} />
          <ZoomButton label="FIT" onPress={() => store.fitView()} />
        </View>
      </View>

      {showParams ? (
        <View style={styles.params}>
          <Slider
            label="GRAVITATIONAL CONSTANT G"
            value={ui.G}
            min={MIN_G}
            max={MAX_G}
            step={0.01}
            accent={colors.cyan}
            format={(v) => v.toFixed(2)}
            onChange={(v) => store.setG(v)}
          />
          <Slider
            label="SOFTENING ε"
            value={ui.softening}
            min={MIN_SOFTENING}
            max={MAX_SOFTENING}
            step={0.1}
            accent={colors.blue}
            format={(v) => v.toFixed(1)}
            onChange={(v) => store.setSoftening(v)}
          />
          <View style={styles.paramsRow}>
            <Btn label="Fit view" compact onPress={() => store.fitView()} style={{ flex: 1 }} />
            <Btn
              label="Clear trails"
              compact
              onPress={() => {
                store.clearTrails();
                store.notify('Trails cleared', 'info');
              }}
              style={{ flex: 1 }}
            />
            <Btn
              label="Clear canvas"
              compact
              variant="danger"
              onPress={() => store.clearAll()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      <Pressable style={styles.paramsToggle} onPress={() => setShowParams((v) => !v)}>
        <Text style={styles.paramsToggleText}>
          {showParams ? '▾ PARAMETERS' : '▸ PARAMETERS  ·  G, SOFTENING, CANVAS'}
        </Text>
      </Pressable>

      <ControlBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  canvasWrap: { flex: 1, position: 'relative' },
  topLeft: { position: 'absolute', left: 10, top: 10, right: 60, alignItems: 'flex-start' },
  selChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: rgba(colors.cyan, 0.45),
    backgroundColor: rgba(colors.black, 0.55),
  },
  selName: { color: colors.text, fontSize: 12, maxWidth: 160 },
  selAction: { color: colors.cyan, fontSize: 10, letterSpacing: 1, fontFamily: fonts.mono },
  hint: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: rgba(colors.black, 0.45),
  },
  hintText: { color: colors.textFaint, fontSize: 9, letterSpacing: 0.6, fontFamily: fonts.mono },
  zoomCol: { position: 'absolute', right: 10, top: 10, gap: 6 },
  zoomBtn: {
    width: 34,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: rgba(colors.panel, 0.85),
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: { color: colors.textDim, fontSize: 11, fontFamily: fonts.mono, letterSpacing: 0.5 },
  params: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: space.md,
    paddingTop: space.md,
  },
  paramsRow: { flexDirection: 'row', gap: space.sm, marginTop: 4 },
  paramsToggle: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.panelAlt,
    paddingVertical: 8,
    alignItems: 'center',
  },
  paramsToggleText: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontFamily: fonts.mono },
});
