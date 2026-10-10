import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { SimulationStore, type UiSnapshot } from './store';

const StoreContext = createContext<SimulationStore | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const ref = useRef<SimulationStore | null>(null);
  if (ref.current == null) {
    ref.current = new SimulationStore();
  }
  useEffect(() => {
    const store = ref.current;
    return () => store?.dispose();
  }, []);
  return <StoreContext.Provider value={ref.current}>{children}</StoreContext.Provider>;
}

export function useStore(): SimulationStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <SimulationProvider>');
  return store;
}

/** Re-renders roughly 10x/second with fresh telemetry values. */
export function useUiSnapshot(): UiSnapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribeUi, store.getUiSnapshot, store.getUiSnapshot);
}

/** Re-renders every animation frame; used only by the canvas. */
export function useRenderVersion(): number {
  const store = useStore();
  return useSyncExternalStore(store.subscribeRender, store.getRenderVersion, store.getRenderVersion);
}
