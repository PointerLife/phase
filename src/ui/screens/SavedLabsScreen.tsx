import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore, useUiSnapshot } from '../../sim/SimulationContext';
import { useSavedLabs } from '../../storage/SavedLabsContext';
import type { LabModel } from '../../storage/types';
import { ScreenScroll } from '../components/ScreenScroll';
import { Btn, Panel } from '../components/Primitives';
import { ModalCard, NamePrompt } from '../components/Field';
import { colors, fonts, space } from '../../render/theme';

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '—';
  }
}

export function SavedLabsScreen({ onLoaded }: { onLoaded?: () => void }) {
  const store = useStore();
  const ui = useUiSnapshot();
  const { labs, loading, error, saveNew, overwrite, remove, rename } = useSavedLabs();

  const [saveOpen, setSaveOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<LabModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabModel | null>(null);

  const defaultName = ui.presetId ? `Preset · ${ui.presetId}` : 'Lab';

  return (
    <ScreenScroll>
      <Panel title="Save Current Simulation">
        <Text style={styles.help}>
          Stores positions, velocities, masses, radii, anchors and the simulation parameters. Stored
          locally on this device.
        </Text>
        <Btn
          label="Save as new lab"
          variant="primary"
          onPress={() => setSaveOpen(true)}
          disabled={ui.bodyCount === 0}
        />
        {ui.bodyCount === 0 ? (
          <Text style={styles.warn}>Nothing to save — the canvas is empty.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Panel>

      <Panel title={`Stored Labs (${labs.length})`}>
        {loading ? (
          <Text style={styles.help}>Reading local storage…</Text>
        ) : labs.length === 0 ? (
          <Text style={styles.help}>
            No saved labs yet. Build something on the canvas, then save it here.
          </Text>
        ) : (
          <View style={styles.list}>
            {labs.map((lab) => {
              const on = lab.id === ui.labId;
              return (
                <View key={lab.id} style={[styles.card, on ? styles.cardOn : null]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {lab.name}
                    </Text>
                    {on ? <Text style={styles.badge}>● LOADED</Text> : null}
                  </View>
                  <Text style={styles.cardMeta}>
                    {lab.bodies.length} bodies · G {lab.G} · soften {lab.softening} ·{' '}
                    {formatDate(lab.updatedAt)}
                  </Text>
                  <View style={styles.actions}>
                    <Btn
                      label="Load"
                      variant="primary"
                      compact
                      onPress={() => {
                        store.loadLabState(lab);
                        onLoaded?.();
                      }}
                      style={styles.actionBtn}
                    />
                    <Btn
                      label="Overwrite"
                      compact
                      onPress={async () => {
                        await overwrite(lab.id, store.snapshotCurrent());
                        store.notify(`Updated "${lab.name}"`, 'info');
                      }}
                      style={styles.actionBtn}
                    />
                    <Btn
                      label="Rename"
                      compact
                      onPress={() => setRenameTarget(lab)}
                      style={styles.actionBtn}
                    />
                    <Btn
                      label="Delete"
                      variant="danger"
                      compact
                      onPress={() => setDeleteTarget(lab)}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Panel>

      <NamePrompt
        visible={saveOpen}
        title="Save simulation"
        initial={defaultName}
        submitLabel="Save"
        onCancel={() => setSaveOpen(false)}
        onSubmit={async (name) => {
          setSaveOpen(false);
          const lab = await saveNew(name, store.snapshotCurrent());
          if (lab) store.notify(`Saved "${lab.name}"`, 'info');
        }}
      />

      <NamePrompt
        visible={renameTarget != null}
        title="Rename lab"
        initial={renameTarget?.name ?? ''}
        submitLabel="Rename"
        onCancel={() => setRenameTarget(null)}
        onSubmit={async (name) => {
          const target = renameTarget;
          setRenameTarget(null);
          if (target) await rename(target.id, name);
        }}
      />

      <ModalCard
        visible={deleteTarget != null}
        title="Delete lab"
        onClose={() => setDeleteTarget(null)}
      >
        <Text style={styles.help}>
          Delete “{deleteTarget?.name}”? This cannot be undone.
        </Text>
        <View style={styles.deleteRow}>
          <Btn label="Cancel" variant="ghost" onPress={() => setDeleteTarget(null)} style={{ flex: 1 }} />
          <Btn
            label="Delete"
            variant="danger"
            style={{ flex: 1 }}
            onPress={async () => {
              const target = deleteTarget;
              setDeleteTarget(null);
              if (target) {
                await remove(target.id);
                store.notify(`Deleted "${target.name}"`, 'info');
              }
            }}
          />
        </View>
      </ModalCard>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.textDim, fontSize: 12, lineHeight: 18, marginBottom: space.md },
  warn: { color: colors.amber, fontSize: 10, fontFamily: fonts.mono, marginTop: space.sm },
  error: { color: colors.red, fontSize: 11, fontFamily: fonts.mono, marginTop: space.sm },
  list: { gap: space.sm },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelAlt,
    borderRadius: 6,
    padding: space.sm + 2,
    gap: 6,
  },
  cardOn: { borderColor: 'rgba(47,230,208,0.5)' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: colors.text, fontSize: 13, flex: 1 },
  badge: { color: colors.cyan, fontSize: 9, fontFamily: fonts.mono, letterSpacing: 1 },
  cardMeta: { color: colors.textFaint, fontSize: 10, fontFamily: fonts.mono },
  actions: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  actionBtn: { flexGrow: 1, flexBasis: 70 },
  deleteRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
});
