import { describe, expect, test } from 'bun:test';
import { SimulationStore } from './store';

// Minimal rAF polyfill so the store's animation loop is driven deterministically.
let pendingCb: ((t: number) => void) | null = null;
let rafIdCounter = 0;

(globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) => {
  pendingCb = cb;
  rafIdCounter += 1;
  return rafIdCounter;
};
(globalThis as Record<string, unknown>).cancelAnimationFrame = () => {
  pendingCb = null;
};

/** Drive the simulated clock forward `frames` of ~60fps. */
function runFrames(frames: number): void {
  let t = performance.now();
  for (let i = 0; i < frames; i++) {
    t += 1000 / 60;
    const cb = pendingCb;
    expect(cb).not.toBeNull();
    cb!(t);
  }
}

describe('SimulationStore', () => {
  test('boots paused=false with the default binary preset loaded', () => {
    const store = new SimulationStore();
    try {
      const ui = store.getUiSnapshot();
      expect(store.getBodies().length).toBe(2);
      expect(ui.running).toBe(true);
      expect(ui.presetId).toBe('binary');
    } finally {
      store.dispose();
    }
  });

  test('play / pause / step / speed are consistent', () => {
    const store = new SimulationStore();
    try {
      store.pause();
      expect(store.getUiSnapshot().running).toBe(false);

      const t0 = store.getSimTime();
      store.stepOnce();
      expect(store.getSimTime()).toBe(t0 + 1 / 240);
      expect(store.getUiSnapshot().running).toBe(false); // stepping pauses

      store.setSpeed(4);
      expect(store.getUiSnapshot().speed).toBe(4);
      store.play();
      expect(store.getUiSnapshot().running).toBe(true);
    } finally {
      store.dispose();
    }
  });

  test('the animation loop advances physics, trails and telemetry history', () => {
    const store = new SimulationStore();
    try {
      store.pause();
      store.setSpeed(2);
      store.play();
      const t0 = store.getSimTime();
      runFrames(120); // ~2 wall seconds at 2x
      const ui = store.getUiSnapshot();
      expect(store.getSimTime()).toBeGreaterThan(t0 + 1);
      expect(ui.energyHistory.length).toBeGreaterThan(0);
      // Every body must have accumulated a trail.
      for (const b of store.getBodies()) {
        const trail = store.getTrail(b.id);
        expect(trail).toBeDefined();
        expect(trail!.count).toBeGreaterThan(0);
      }
      expect(ui.stepsPerSecond).toBeGreaterThan(0);
      expect(ui.fps).toBeGreaterThan(0);
    } finally {
      store.dispose();
    }
  });

  test('add / select / edit / delete bodies keeps ids consistent', () => {
    const store = new SimulationStore();
    try {
      store.pause();
      const body = store.addBodyAt(0, 0);
      expect(body).not.toBeNull();
      expect(store.getBodies().length).toBe(3);
      store.select(body!.id);
      expect(store.getUiSnapshot().selectedId).toBe(body!.id);

      store.updateBody(body!.id, { mass: -500, radius: 99999 });
      const updated = store.getBodies().find((b) => b.id === body!.id);
      expect(updated!.mass).toBeGreaterThan(0);
      expect(updated!.radius).toBeLessThanOrEqual(120);

      store.removeBody(body!.id);
      expect(store.getBodies().length).toBe(2);
      expect(store.getUiSnapshot().selectedId).toBeNull();
    } finally {
      store.dispose();
    }
  });

  test('preset reload, reset and baseline capture behave correctly', () => {
    const store = new SimulationStore();
    try {
      store.loadPreset('three-body', { fit: true });
      expect(store.getBodies().length).toBe(3);
      const t0 = store.getSimTime();
      store.stepOnce();
      expect(store.getSimTime()).toBeGreaterThan(t0);
      store.captureBaseline();
      const afterCapture = store.getSimTime();
      expect(afterCapture).toBe(0);
      store.play();
      runFrames(30);
      store.resetToInitial();
      const ui = store.getUiSnapshot();
      expect(ui.simTime).toBe(0);
      expect(ui.running).toBe(false);
      expect(ui.bodyCount).toBe(3);
    } finally {
      store.dispose();
    }
  });

  test('clearAll empties the canvas and stops playback', () => {
    const store = new SimulationStore();
    try {
      store.clearAll();
      const ui = store.getUiSnapshot();
      expect(ui.bodyCount).toBe(0);
      expect(ui.running).toBe(false);
      expect(store.getBodies().length).toBe(0);
    } finally {
      store.dispose();
    }
  });

  test('snapshot → lab round trip preserves state', () => {
    const store = new SimulationStore();
    try {
      store.loadPreset('gravity-assist', { fit: true });
      store.pause();
      const snap = store.snapshotCurrent();
      expect(snap.bodies.length).toBe(2);

      store.clearAll();
      expect(store.getBodies().length).toBe(0);

      store.loadLabState({ ...snap, id: 'lab1', name: 'Test', createdAt: 0, updatedAt: 0 });
      const ui = store.getUiSnapshot();
      expect(ui.bodyCount).toBe(2);
      expect(ui.labId).toBe('lab1');
      expect(store.getBodies()[0].vx).toBeCloseTo(snap.bodies[0].vx, 10);
    } finally {
      store.dispose();
    }
  });

  test('invalid numbers are clamped when editing', () => {
    const store = new SimulationStore();
    try {
      const body = store.getBodies()[0];
      store.updateBody(body.id, { vx: Number.NaN, vy: Number.POSITIVE_INFINITY });
      const after = store.getBodies()[0];
      expect(Number.isFinite(after.vx)).toBe(true);
      expect(Number.isFinite(after.vy)).toBe(true);
    } finally {
      store.dispose();
    }
  });
});