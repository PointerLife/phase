import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, labelStyle, space } from '../render/theme';

export type TabKey = 'sim' | 'labs' | 'inspect' | 'telemetry' | 'saved';

export const TABS: Array<{ key: TabKey; label: string; glyph: string }> = [
  { key: 'sim', label: 'SIM', glyph: '●' },
  { key: 'labs', label: 'LABS', glyph: '◆' },
  { key: 'inspect', label: 'INSPECT', glyph: '○' },
  { key: 'telemetry', label: 'TELEM', glyph: '≈' },
  { key: 'saved', label: 'STORED', glyph: '■' },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Text
            key={t.key}
            onPress={() => onChange(t.key)}
            suppressHighlighting
            style={[styles.item, on ? styles.itemOn : null]}
          >
            <Text style={[styles.glyph, on ? styles.glyphOn : null]}>{t.glyph}</Text>
            {'\n'}
            <Text style={[styles.label, on ? styles.labelOn : null]}>{t.label}</Text>
          </Text>
        );
      })}
    </View>
  );
}

export function Header({
  running,
  simTime,
  bodies,
  fps,
  right,
}: {
  running: boolean;
  simTime: number;
  bodies: number;
  fps: number;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={[styles.statusDot, { backgroundColor: running ? colors.green : colors.amber }]} />
        <Text style={styles.brand}>PHASE SPACE</Text>
        {right ? <View style={styles.headerRight}>{right}</View> : null}
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          T {formatTime(simTime)} · N {bodies} bodies · {fps} fps
        </Text>
        <Text style={[styles.state, { color: running ? colors.green : colors.amber }]}>
          {running ? 'RUNNING' : 'PAUSED'}
        </Text>
      </View>
    </View>
  );
}

export function formatTime(t: number): string {
  if (!Number.isFinite(t)) return '0.00';
  if (t >= 1000) return t.toFixed(0);
  return t.toFixed(2);
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.panel,
    paddingTop: 8,
    paddingBottom: 6,
  },
  item: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 2,
  },
  itemOn: {},
  glyph: { color: colors.textFaint, fontSize: 13 },
  glyphOn: { color: colors.cyan },
  label: { ...labelStyle, fontSize: 9, letterSpacing: 1.2 },
  labelOn: { color: colors.cyan },
  header: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  brand: {
    color: colors.text,
    fontSize: 14,
    letterSpacing: 3.2,
    fontWeight: '700',
  },
  headerRight: { marginLeft: 'auto' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  meta: { color: colors.textFaint, fontSize: 10, fontFamily: fonts.mono, letterSpacing: 0.5 },
  state: { fontSize: 10, fontFamily: fonts.mono, letterSpacing: 1.4 },
});
