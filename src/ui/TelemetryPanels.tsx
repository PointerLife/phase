import { StyleSheet, Text, View } from 'react-native';
import type { UiSnapshot } from '../sim/store';
import { colors, fonts, labelStyle, space } from '../render/theme';
import { Dot, Panel, Readout } from './components/Primitives';
import { MiniGraph } from './components/MiniGraph';

export function fmt(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e6)) return v.toExponential(2);
  return v.toFixed(digits);
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function SystemPanel({ ui }: { ui: UiSnapshot }) {
  const momentum = Math.hypot(ui.momentumX, ui.momentumY);
  return (
    <Panel title="System Readout">
      <Row>
        <Readout label="Sim time" value={fmt(ui.simTime, 2)} unit="s" />
        <Readout label="Bodies" value={String(ui.bodyCount)} />
        <Readout
          label="State"
          value={ui.running ? 'RUN' : 'HOLD'}
          color={ui.running ? colors.green : colors.amber}
        />
      </Row>
      <Row>
        <Readout label="Kinetic" value={fmt(ui.energy.kinetic)} unit="EU" color={colors.cyan} />
        <Readout label="Potential" value={fmt(ui.energy.potential)} unit="EU" color={colors.blue} />
      </Row>
      <Row>
        <Readout label="Total energy" value={fmt(ui.energy.total)} unit="EU" color={colors.amber} />
        <Readout label="|Momentum|" value={fmt(momentum)} unit="mu·wu/s" />
      </Row>
      <Row>
        <Readout label="G" value={fmt(ui.G, 3)} unit="wu³/mu·s²" />
        <Readout label="Softening" value={fmt(ui.softening, 2)} unit="wu" />
      </Row>
      <Row>
        <Readout label="Integrator" value="Verlet" />
        <Readout label="Steps/s" value={String(ui.stepsPerSecond)} />
        <Readout label="Frame rate" value={`${ui.fps} fps`} />
      </Row>
    </Panel>
  );
}

export function BodyPanel({
  ui,
  hint = 'Tap a body on the canvas, or pick one from the Inspector.',
}: {
  ui: UiSnapshot;
  hint?: string;
}) {
  const s = ui.selected;
  if (!s) {
    return (
      <Panel title="Body Inspector">
        <Text style={styles.empty}>{hint}</Text>
      </Panel>
    );
  }
  return (
    <Panel
      title="Body Inspector"
      right={<Dot color={ui.selected ? colors.cyan : colors.textDim} />}
    >
      <Text style={styles.bodyName}>{s.name}</Text>
      <Row>
        <Readout label="Position x" value={fmt(s.x, 2)} unit="wu" />
        <Readout label="Position y" value={fmt(s.y, 2)} unit="wu" />
      </Row>
      <Row>
        <Readout label="Velocity x" value={fmt(s.vx, 3)} unit="wu/s" />
        <Readout label="Velocity y" value={fmt(s.vy, 3)} unit="wu/s" />
      </Row>
      <Row>
        <Readout label="Speed" value={fmt(s.speed, 3)} unit="wu/s" color={colors.cyan} />
        <Readout label="Accel" value={fmt(s.accel, 3)} unit="wu/s²" color={colors.amber} />
      </Row>
      <Row>
        <Readout label="Mass" value={fmt(s.mass, 3)} unit="mu" />
        <Readout label="Radius" value={fmt(s.radius, 2)} unit="wu" />
        <Readout label="Kinetic" value={fmt(s.kinetic)} unit="EU" />
      </Row>
    </Panel>
  );
}

export function GraphsPanel({ ui }: { ui: UiSnapshot }) {
  const ke = ui.energyHistory.map((h) => h.ke);
  const pe = ui.energyHistory.map((h) => h.pe);
  const te = ui.energyHistory.map((h) => h.te);
  const speed = ui.speedHistory.map((h) => h.speed);
  return (
    <Panel title="Live Graphs" right={<Legend />}>
      <MiniGraph
        title="ENERGY vs TIME (EU)"
        series={[
          { values: ke, color: colors.cyan },
          { values: pe, color: colors.blue },
          { values: te, color: colors.amber },
        ]}
        height={86}
        formatValue={(v) => v.toPrecision(3)}
      />
      <MiniGraph
        title={ui.selected ? `SPEED · ${ui.selected.name.toUpperCase()} (wu/s)` : 'SPEED (wu/s)'}
        series={[{ values: speed, color: colors.cyan }]}
        height={66}
        emptyText="select a body to trace speed"
        formatValue={(v) => v.toPrecision(3)}
      />
    </Panel>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <Dot color={colors.cyan} size={6} />
        <Text style={styles.legendText}>KE</Text>
      </View>
      <View style={styles.legendItem}>
        <Dot color={colors.blue} size={6} />
        <Text style={styles.legendText}>PE</Text>
      </View>
      <View style={styles.legendItem}>
        <Dot color={colors.amber} size={6} />
        <Text style={styles.legendText}>TE</Text>
      </View>
    </View>
  );
}

export function UnitsNote() {
  return (
    <Text style={styles.units}>
      Scaled units — length wu, time s, mass mu, energy EU. G is a free parameter, so readouts are
      relative to the current experiment rather than SI.
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, marginBottom: 8 },
  empty: { color: colors.textFaint, fontSize: 11, fontFamily: fonts.mono, lineHeight: 17 },
  bodyName: {
    color: colors.text,
    fontSize: 15,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  legend: { flexDirection: 'row', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendText: { ...labelStyle, fontSize: 9 },
  units: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    textTransform: 'none',
  },
});
