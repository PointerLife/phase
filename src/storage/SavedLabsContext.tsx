import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { makeId } from '../physics/id';
import { deleteLab, persistLab, readLabs, renameLab } from './labs';
import type { LabModel } from './types';

interface SavedLabsValue {
  labs: LabModel[];
  loading: boolean;
  error: string | null;
  /** Persist the current simulation snapshot under `name`; returns the new lab. */
  saveNew: (
    name: string,
    snapshot: Omit<LabModel, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
  ) => Promise<LabModel | null>;
  /** Overwrite an existing lab's initial conditions with the current snapshot. */
  overwrite: (
    id: string,
    snapshot: Omit<LabModel, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  reload: () => Promise<void>;
}

const SavedLabsContext = createContext<SavedLabsValue | null>(null);

export function SavedLabsProvider({ children }: { children: ReactNode }) {
  const [labs, setLabs] = useState<LabModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setLabs(await readLabs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read saved labs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveNew = useCallback<SavedLabsValue['saveNew']>(async (name, snapshot) => {
    try {
      setError(null);
      const now = Date.now();
      const lab: LabModel = {
        ...snapshot,
        id: makeId('lab'),
        name: name.trim().slice(0, 40) || 'Untitled Lab',
        createdAt: now,
        updatedAt: now,
      };
      setLabs(await persistLab(lab));
      return lab;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save lab');
      return null;
    }
  }, []);

  const overwrite = useCallback<SavedLabsValue['overwrite']>(async (id, snapshot) => {
    try {
      setError(null);
      const existing = labs.find((l) => l.id === id);
      const lab: LabModel = {
        ...snapshot,
        id,
        name: existing?.name ?? 'Untitled Lab',
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      setLabs(await persistLab(lab));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update lab');
    }
  }, [labs]);

  const remove = useCallback<SavedLabsValue['remove']>(async (id) => {
    try {
      setError(null);
      setLabs(await deleteLab(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete lab');
    }
  }, []);

  const rename = useCallback<SavedLabsValue['rename']>(async (id, name) => {
    try {
      setError(null);
      setLabs(await renameLab(id, name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename lab');
    }
  }, []);

  const value = useMemo<SavedLabsValue>(
    () => ({ labs, loading, error, saveNew, overwrite, remove, rename, reload }),
    [labs, loading, error, saveNew, overwrite, remove, rename, reload],
  );

  return <SavedLabsContext.Provider value={value}>{children}</SavedLabsContext.Provider>;
}

export function useSavedLabs(): SavedLabsValue {
  const ctx = useContext(SavedLabsContext);
  if (!ctx) throw new Error('useSavedLabs must be used inside <SavedLabsProvider>');
  return ctx;
}
