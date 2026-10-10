import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore, useUiSnapshot } from '../../sim/SimulationContext';
import { ScreenScroll } from '../components/ScreenScroll';
import { Btn, Panel } from '../components/Primitives';
import { NumberField, TextField, Toggle } from '../components/Field';
import { BODY_COLORS } from '../../physics/presets';
import {
  MAX_MASS,
  MAX_RADIUS,
  MIN_MASS,
  MIN_RADIUS,
} from '../../physics/constants';
import { colors, fonts, labelStyle, radius, space } from '../../render/theme';
import { rgba } from '../../render/color';

export function InspectorScreen() {
  const store = useStore();
  const ui = useUiSnapshot();
  const bodies = store.getBodies();
  const selected = ui.selected;
  const selectedBody = selected ? bodies.find((b) => b.id === selected.id) : undefined;

  return (
    <ScreenScroll>
      <Panel
        title="Bodies"
        right={
          <Btn
            label="+ Add"
            compact
            onPress={() => {
              const vp = store.getViewport();
              store.addBodyAt(vp.cx, vp.cy);
            }}
          />
        }
      >
        {bodies.length === 0 ? (
          <Text style={styles.empty}>
            The canvas is empty. Add a body, or load an experiment from LABS.
          </Text>
        ) : (
          <View style={styles.list}>
            {bodies.map((b) => {
              const on = b.id === ui.selectedId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => store.select(b.id)}
                  style={[styles.listItem, on ? styles.listItemOn : null]}
                >
                  <View style={[styles.swatch, { backgroundColor: b.color }]} />
                  <Text style={styles.itemName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {b.mass.toPrecision(3)} mu
                    {b.fixed ? ' · fixed' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Panel>

      {selected ? (
        <Panel title="Properties" right={<Text style={styles.id}>{selected.id.slice(-6)}</Text>}>
          <TextField
            label="Name"
            value={selected.name}
            onChange={(v) => store.updateBody(selected.id, { name: v })}
          />
          <NumberField
            label="Mass"
            value={selected.mass}
            min={MIN_MASS}
            max={MAX_MASS}
            allowNegative={false}
            suffix="mu"
            onChange={(v) => store.updateBody(selected.id, { mass: v })}
          />
          <NumberField
            label="Radius"
            value={selected.radius}
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            allowNegative={false}
            suffix="wu"
            onChange={(v) => store.updateBody(selected.id, { radius: v })}
          />
          <View style={styles.grid2}>
            <View style={styles.half}>
              <NumberField
                label="Pos x"
                value={selected.x}
                onChange={(v) => store.updateBody(selected.id, { x: v })}
              />
            </View>
            <View style={styles.half}>
              <NumberField
                label="Pos y"
                value={selected.y}
                onChange={(v) => store.updateBody(selected.id, { y: v })}
              />
            </View>
          </View>
          <View style={styles.grid2}>
            <View style={styles.half}>
              <NumberField
                label="Vel x"
                value={selected.vx}
                suffix="wu/s"
                onChange={(v) => store.updateBody(selected.id, { vx: v })}
              />
            </View>
            <View style={styles.half}>
              <NumberField
                label="Vel y"
                value={selected.vy}
                suffix="wu/s"
                onChange={(v) => store.updateBody(selected.id, { vy: v })}
              />
            </View>
          </View>

          <Text style={[labelStyle, styles.pickLabel]}>Colour</Text>
          <View style={styles.colorRow}>
            {BODY_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => store.updateBody(selected.id, { color: c })}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  c === selectedBody?.color ? styles.colorSwatchOn : null,
                ]}
              />
            ))}
          </View>

          <View style={styles.spacer} />
          <Toggle
            label="Anchored (fixed)"
            value={selectedBody?.fixed ?? false}
            onChange={(v) => store.updateBody(selected.id, { fixed: v })}
          />
          <Text style={styles.note}>
            Anchored bodies still attract others but never move — useful for a central star.
          </Text>

          <View style={styles.spacer} />
          <Btn
            label="Delete body"
            variant="danger"
            onPress={() => store.removeBody(selected.id)}
          />
        </Panel>
      ) : (
        <Panel title="Properties">
          <Text style={styles.empty}>Select a body to edit its mass, radius and velocity.</Text>
        </Panel>
      )}

      <Panel title="Session">
        <View style={styles.sessionRow}>
          <Btn
            label="Set as initial"
            onPress={() => store.captureBaseline()}
            style={{ flex: 1 }}
          />
          <Btn
            label="Reset"
            onPress={() => store.resetToInitial()}
            style={{ flex: 1 }}
          />
          <Btn
            label="Clear canvas"
            variant="danger"
            onPress={() => store.clearAll()}
            style={{ flex: 1 }}
          />
        </View>
        <Text style={styles.note}>
          “Set as initial” stores the current layout as this experiment’s t&nbsp;=&nbsp;0 state, which
          RESET restores. Edits made while paused take effect immediately but are only permanent after
          capturing or saving.
        </Text>
      </Panel>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textFaint, fontSize: 11, fontFamily: fonts.mono, lineHeight: 17 },
  list: { gap: 4 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelAlt,
  },
  listItemOn: { borderColor: rgba(colors.cyan, 0.6), backgroundColor: rgba(colors.cyan, 0.08) },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  itemName: { color: colors.text, fontSize: 12, flex: 1 },
  itemMeta: { color: colors.textFaint, fontSize: 10, fontFamily: fonts.mono },
  grid2: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1 },
  pickLabel: { marginTop: space.sm, marginBottom: 6 },
  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchOn: { borderColor: colors.white },
  spacer: { height: space.sm },
  note: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: fonts.mono,
    marginTop: space.sm,
  },
  sessionRow: { flexDirection: 'row', gap: space.sm },
  id: { color: colors.textFaint, fontSize: 10, fontFamily: fonts.mono },
});
