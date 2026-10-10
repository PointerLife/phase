import { StyleSheet, Text, View } from 'react-native';
import { useUiSnapshot } from '../../sim/SimulationContext';
import { ScreenScroll } from '../components/ScreenScroll';
import { BodyPanel, GraphsPanel, SystemPanel, UnitsNote } from '../TelemetryPanels';
import { colors, fonts, labelStyle, space } from '../../render/theme';

export function TelemetryScreen() {
  const ui = useUiSnapshot();
  return (
    <ScreenScroll>
      <SystemPanel ui={ui} />
      <BodyPanel ui={ui} />
      <GraphsPanel ui={ui} />
      <View style={styles.note}>
        <Text style={labelStyle}>UNITS</Text>
        <UnitsNote />
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  note: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
  },
});
