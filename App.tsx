import { useState } from 'react';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SimulationProvider, useUiSnapshot } from './src/sim/SimulationContext';
import { SavedLabsProvider } from './src/storage/SavedLabsContext';
import { BottomNav, Header, type TabKey } from './src/ui/Navigation';
import { NoticeToast } from './src/ui/NoticeToast';
import { useResponsive } from './src/ui/useResponsive';
import { colors } from './src/render/theme';
import { ScreenScroll } from './src/ui/components/ScreenScroll';
import { SimulationScreen } from './src/ui/screens/SimulationScreen';
import { ExperimentsScreen } from './src/ui/screens/ExperimentsScreen';
import { InspectorScreen } from './src/ui/screens/InspectorScreen';
import { TelemetryScreen } from './src/ui/screens/TelemetryScreen';
import { SavedLabsScreen } from './src/ui/screens/SavedLabsScreen';
import { BodyPanel, SystemPanel } from './src/ui/TelemetryPanels';

/** Subscribes to telemetry on its own so the app shell never re-renders. */
function ConnectedHeader() {
  const ui = useUiSnapshot();
  return <Header running={ui.running} simTime={ui.simTime} bodies={ui.bodyCount} fps={ui.fps} />;
}

function TabContent({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  switch (tab) {
    case 'labs':
      return <ExperimentsScreen onLoaded={() => setTab('sim')} />;
    case 'inspect':
      return <InspectorScreen />;
    case 'telemetry':
      return <TelemetryScreen />;
    case 'saved':
      return <SavedLabsScreen onLoaded={() => setTab('sim')} />;
    case 'sim':
    default:
      return <SimulationScreen onOpenInspector={() => setTab('inspect')} />;
  }
}

function Root() {
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<TabKey>('sim');

  if (isWide) {
    return (
      <View style={styles.root}>
        <ConnectedHeader />
        <View style={styles.wideBody}>
          <View style={styles.wideCanvas}>
            <SimulationScreen onOpenInspector={() => setTab('inspect')} />
          </View>
          <View style={styles.widePanel}>
            {tab === 'sim' ? (
              <WideSummary />
            ) : (
              <TabContent tab={tab} setTab={setTab} />
            )}
          </View>
        </View>
        <BottomNav active={tab} onChange={setTab} />
        <NoticeToast />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ConnectedHeader />
      <View style={styles.body}>
        <TabContent tab={tab} setTab={setTab} />
      </View>
      <BottomNav active={tab} onChange={setTab} />
      <NoticeToast />
    </View>
  );
}

function WideSummary() {
  const ui = useUiSnapshot();
  return (
    <ScreenScroll>
      <SystemPanel ui={ui} />
      <BodyPanel ui={ui} />
    </ScreenScroll>
  );
}

export default function App() {
  const topPad = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0;
  return (
    <SafeAreaProvider>
      <SimulationProvider>
        <SavedLabsProvider>
          <SafeAreaView
            style={styles.safe}
            edges={Platform.OS === 'android' ? [] : ['top', 'bottom', 'left', 'right']}
          >
            <View style={[styles.fill, { paddingTop: topPad }]}>
              <StatusBar style="light" />
              <Root />
            </View>
          </SafeAreaView>
        </SavedLabsProvider>
      </SimulationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1, backgroundColor: colors.bg },
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  wideBody: { flex: 1, flexDirection: 'row' },
  wideCanvas: { flex: 2, borderRightWidth: 1, borderRightColor: colors.border },
  widePanel: { flex: 1, minWidth: 300, maxWidth: 420 },
});
