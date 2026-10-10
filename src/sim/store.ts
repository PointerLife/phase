import { NBodyEngine } from '../physics/engine';
import type { Body, BodyTelemetry, EnergyReport } from '../physics/types';
import {
  DEFAULT_G,
  DEFAULT_SOFTENING,
  ENERGY_HISTORY,
  FIXED_DT,
  MAX_BODIES,
  MAX_G,
  MAX_MASS,
  MAX_RADIUS,
  MAX_SOFTENING,
  MAX_SPEED,
  MAX_SUBSTEPS,
  MIN_G,
  MIN_MASS,
  MIN_RADIUS,
  MIN_SOFTENING,
  MIN_SPEED,
  SPEED_HISTORY,
  TRAIL_CAPACITY,
  TRAIL_SAMPLE_DT,
} from '../physics/constants';
import { BODY_COLORS, getPreset, type BodySeed } from '../physics/presets';
import { makeId } from '../physics/id';
import { Trail } from './trail';
import type { LabModel } from '../storage/types';

export interface Viewport {
  /** screen pixels per world unit */
  scale: number;
  /** world coordinate at the centre of the canvas */
  cx: number;
  cy: number;
}

export interface EnergySample {
  t: number;
  ke: number;
  pe: number;
  te: number;
}

export interface SpeedSample {
  t: number;
  speed: number;
}

export interface Notice {
  kind: 'info' | 'error';
  text: string;
  at: number;
}

export interface UiSnapshot {
  running: boolean;
  simTime: number;
  bodyCount: number;
  G: number;
  softening: number;
  speed: number;
  energy: EnergyReport;
  momentumX: number;
  momentumY: number;
  selectedId: string | null;
  selected: BodyTelemetry | null;
  zoom: number;
  presetId: string | null;
  labId: string | null;
  labName: string | null;
  hasBaseline: boolean;
  energyHistory: EnergySample[];
  speedHistory: SpeedSample[];
  fps: number;
  stepsPerSecond: number;
  notice: Notice | null;
}

const HISTORY_DT = 0.08;
const UI_INTERVAL_MS = 100;
const DEFAULT_CANVAS = { w: 390, h: 620 };

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function copyBodies(bodies: readonly Body[]): Body[] {
  return bodies.map((b) => ({ ...b }));
}

function telemetryFor(body: Body, engine: NBodyEngine, index: number): BodyTelemetry {
  const { ax, ay } = engine.accelerationOf(index);
  const speed = Math.hypot(body.vx, body.vy);
  return {
    id: body.id,
    name: body.name,
    mass: body.mass,
    radius: body.radius,
    x: body.x,
    y: body.y,
    vx: body.vx,
    vy: body.vy,
    speed,
    ax,
    ay,
    accel: Math.hypot(ax, ay),
    kinetic: 0.5 * body.mass * speed * speed,
  };
}

/**
 * Owns the authoritative simulation state and the animation loop.
 *
 * Deliberately kept outside React: the loop mutates the engine in place and
 * publishes a monotonically increasing `renderVersion` to canvas subscribers
 * (every frame) plus a throttled `UiSnapshot` to telemetry subscribers. This
 * keeps per-frame physics off the React reconciliation path for the whole UI.
 */
export class SimulationStore {
  private engine: NBodyEngine;
  private params = { G: DEFAULT_G, softening: DEFAULT_SOFTENING };
  private speed = 1;
  private running = false;
  private simTime = 0;
  private selectedId: string | null = null;
  private viewport: Viewport = { scale: 1.6, cx: 0, cy: 0 };
  private canvas = { ...DEFAULT_CANVAS };
  private trails = new Map<string, Trail>();
  private baseline: Body[] | null = null;
  private presetId: string | null = null;
  private labId: string | null = null;
  private labName: string | null = null;
  private notice: Notice | null = null;
  private colorIndex = 0;

  private energyHistory: EnergySample[] = [];
  private speedHistory: SpeedSample[] = [];

  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private lastTrailTime = 0;
  private lastHistoryTime = 0;
  private lastUiEmit = 0;
  private lastFpsTime = 0;
  private framesThisSecond = 0;
  private stepsThisSecond = 0;
  private fps = 0;
  private stepsPerSecond = 0;
  private canvasInitialised = false;

  private renderVersion = 0;
  private renderListeners = new Set<() => void>();
  private uiListeners = new Set<() => void>();
  private uiSnapshot!: UiSnapshot;
  /** Set whenever visible state changes, so a paused canvas can stay idle. */
  private dirty = true;

  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.engine = new NBodyEngine([], this.params.G, this.params.softening);
    this.uiSnapshot = this.buildSnapshot();
    this.loadPreset('binary', { fit: true });
    this.start();
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    if (this.rafId != null) return;
    this.lastTime = now();
    this.lastFpsTime = this.lastTime;
    this.rafId = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.renderListeners.clear();
    this.uiListeners.clear();
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  private frame = (t: number): void => {
    this.rafId = requestAnimationFrame(this.frame);
    const dtReal = Math.min((t - this.lastTime) / 1000, 0.05);
    this.lastTime = t;

    if (this.running && this.speed > 0) {
      this.accumulator += dtReal * this.speed;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
        this.engine.step(FIXED_DT);
        this.simTime += FIXED_DT;
        this.accumulator -= FIXED_DT;
        steps += 1;
      }
      if (steps >= MAX_SUBSTEPS) this.accumulator = 0; // avoid death spiral
      if (steps > 0) {
        this.stepsThisSecond += steps;
        this.sampleTrails();
        this.sampleHistory();
      }
    }

    this.framesThisSecond += 1;
    // Only re-render the canvas when the simulation is advancing or something
    // changed (pan, zoom, selection, mutation). A paused, idle canvas stays put.
    if (this.running || this.dirty) {
      this.dirty = false;
      this.renderVersion += 1;
      this.emitRender();
    }

    if (t - this.lastUiEmit >= UI_INTERVAL_MS) {
      this.lastUiEmit = t;
      this.rebuildSnapshot();
      this.emitUi();
    }
    if (t - this.lastFpsTime >= 1000) {
      this.fps = this.framesThisSecond;
      this.stepsPerSecond = this.stepsThisSecond;
      this.framesThisSecond = 0;
      this.stepsThisSecond = 0;
      this.lastFpsTime = t;
    }
  };

  // ------------------------------------------------------------- subscriptions

  subscribeRender = (cb: () => void): (() => void) => {
    this.renderListeners.add(cb);
    return () => {
      this.renderListeners.delete(cb);
    };
  };

  getRenderVersion = (): number => this.renderVersion;

  subscribeUi = (cb: () => void): (() => void) => {
    this.uiListeners.add(cb);
    return () => {
      this.uiListeners.delete(cb);
    };
  };

  getUiSnapshot = (): UiSnapshot => this.uiSnapshot;

  private emitRender(): void {
    for (const cb of this.renderListeners) cb();
  }

  private emitUi(): void {
    this.dirty = true;
    for (const cb of this.uiListeners) cb();
  }

  private rebuildSnapshot(): void {
    this.uiSnapshot = this.buildSnapshot();
  }

  private buildSnapshot(): UiSnapshot {
    const bodies = this.engine.bodies;
    const energy = this.engine.energy();
    const momentum = this.engine.momentum();
    const selectedIndex = this.selectedId
      ? bodies.findIndex((b) => b.id === this.selectedId)
      : -1;
    const selected =
      selectedIndex >= 0 ? telemetryFor(bodies[selectedIndex], this.engine, selectedIndex) : null;
    return {
      running: this.running,
      simTime: this.simTime,
      bodyCount: bodies.length,
      G: this.params.G,
      softening: this.params.softening,
      speed: this.speed,
      energy,
      momentumX: momentum.px,
      momentumY: momentum.py,
      selectedId: this.selectedId,
      selected,
      zoom: this.viewport.scale,
      presetId: this.presetId,
      labId: this.labId,
      labName: this.labName,
      hasBaseline: this.baseline != null,
      energyHistory: this.energyHistory,
      speedHistory: this.speedHistory,
      fps: this.fps,
      stepsPerSecond: this.stepsPerSecond,
      notice: this.notice,
    };
  }

  // ---------------------------------------------------------------- accessors

  getBodies(): Body[] {
    return this.engine.bodies;
  }

  getViewport(): Viewport {
    return this.viewport;
  }

  getTrail(id: string): Trail | undefined {
    return this.trails.get(id);
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  getSimTime(): number {
    return this.simTime;
  }

  // ------------------------------------------------------------------ playback

  play(): void {
    this.running = true;
    this.rebuildSnapshot();
    this.emitUi();
  }

  pause(): void {
    this.running = false;
    this.rebuildSnapshot();
    this.emitUi();
  }

  toggleRun(): void {
    if (this.running) this.pause();
    else this.play();
  }

  /** Advance exactly one fixed timestep. Pauses first for predictable stepping. */
  stepOnce(): void {
    this.pause();
    this.engine.step(FIXED_DT);
    this.simTime += FIXED_DT;
    this.sampleTrails();
    this.sampleHistory();
    this.rebuildSnapshot();
    this.emitUi();
    this.renderVersion += 1;
    this.emitRender();
  }

  setSpeed(v: number): void {
    this.speed = clamp(v, MIN_SPEED, MAX_SPEED);
    this.rebuildSnapshot();
    this.emitUi();
  }

  setG(v: number): void {
    this.params.G = clamp(v, MIN_G, MAX_G);
    this.engine.G = this.params.G;
    this.engine.recompute();
    this.rebuildSnapshot();
    this.emitUi();
  }

  setSoftening(v: number): void {
    this.params.softening = clamp(v, MIN_SOFTENING, MAX_SOFTENING);
    this.engine.softening = this.params.softening;
    this.engine.recompute();
    this.rebuildSnapshot();
    this.emitUi();
  }

  // ------------------------------------------------------------ body mutation

  private defaultName(): string {
    return `Body ${this.engine.bodies.length + 1}`;
  }

  addBodyAt(x: number, y: number, seed?: Partial<BodySeed>): Body | null {
    if (this.engine.bodies.length >= MAX_BODIES) {
      this.notify(`Body limit reached (${MAX_BODIES})`, 'error');
      return null;
    }
    const color = BODY_COLORS[this.colorIndex % BODY_COLORS.length];
    this.colorIndex += 1;
    const body: Body = {
      id: makeId(),
      name: seed?.name ?? this.defaultName(),
      mass: clamp(seed?.mass ?? 200, MIN_MASS, MAX_MASS),
      radius: clamp(seed?.radius ?? 8, MIN_RADIUS, MAX_RADIUS),
      x,
      y,
      vx: seed?.vx ?? 0,
      vy: seed?.vy ?? 0,
      color: seed?.color ?? color,
      fixed: seed?.fixed ?? false,
    };
    this.engine.setBodies([...this.engine.bodies, body]);
    this.trails.set(body.id, new Trail(TRAIL_CAPACITY));
    this.selectedId = body.id;
    this.rebuildSnapshot();
    this.emitUi();
    return body;
  }

  removeBody(id: string): void {
    if (!this.engine.bodies.some((b) => b.id === id)) return;
    this.engine.setBodies(this.engine.bodies.filter((b) => b.id !== id));
    this.trails.delete(id);
    if (this.selectedId === id) this.selectedId = null;
    this.rebuildSnapshot();
    this.emitUi();
  }

  updateBody(id: string, patch: Partial<Body>): void {
    const body = this.engine.bodies.find((b) => b.id === id);
    if (!body) return;
    if (patch.name !== undefined) body.name = patch.name.slice(0, 24) || body.name;
    if (patch.mass !== undefined) body.mass = clamp(patch.mass, MIN_MASS, MAX_MASS);
    if (patch.radius !== undefined) body.radius = clamp(patch.radius, MIN_RADIUS, MAX_RADIUS);
    if (patch.x !== undefined) body.x = clamp(patch.x, -1e6, 1e6);
    if (patch.y !== undefined) body.y = clamp(patch.y, -1e6, 1e6);
    if (patch.vx !== undefined) body.vx = clamp(patch.vx, -1e5, 1e5);
    if (patch.vy !== undefined) body.vy = clamp(patch.vy, -1e5, 1e5);
    if (patch.color !== undefined) body.color = patch.color;
    if (patch.fixed !== undefined) body.fixed = patch.fixed;
    this.engine.recompute();
    this.rebuildSnapshot();
    this.emitUi();
  }

  moveBodyTo(id: string, x: number, y: number): void {
    const body = this.engine.bodies.find((b) => b.id === id);
    if (!body) return;
    body.x = x;
    body.y = y;
    this.engine.recompute();
    this.dirty = true;
  }

  pickBody(worldX: number, worldY: number, toleranceWorld: number): Body | null {
    let best: Body | null = null;
    let bestDist = Infinity;
    for (const b of this.engine.bodies) {
      const d = Math.hypot(b.x - worldX, b.y - worldY);
      const hit = b.radius + toleranceWorld;
      if (d <= hit && d < bestDist) {
        best = b;
        bestDist = d;
      }
    }
    return best;
  }

  select(id: string | null): void {
    if (id !== null && !this.engine.bodies.some((b) => b.id === id)) return;
    if (id !== this.selectedId) {
      this.selectedId = id;
      this.speedHistory = [];
      this.rebuildSnapshot();
      this.emitUi();
    }
  }

  // ------------------------------------------------------------------ viewport

  setCanvasSize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    this.canvas = { w, h };
    this.dirty = true;
    if (!this.canvasInitialised) {
      this.canvasInitialised = true;
      this.fitView();
    }
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const { scale, cx, cy } = this.viewport;
    return {
      x: (sx - this.canvas.w / 2) / scale + cx,
      y: cy - (sy - this.canvas.h / 2) / scale,
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const { scale, cx, cy } = this.viewport;
    return {
      x: (wx - cx) * scale + this.canvas.w / 2,
      y: this.canvas.h / 2 - (wy - cy) * scale,
    };
  }

  panBy(dxScreen: number, dyScreen: number): void {
    this.viewport.cx -= dxScreen / this.viewport.scale;
    this.viewport.cy += dyScreen / this.viewport.scale;
    this.dirty = true;
  }

  zoomAt(screenX: number, screenY: number, factor: number): void {
    const before = this.screenToWorld(screenX, screenY);
    this.viewport.scale = clamp(this.viewport.scale * factor, 0.005, 400);
    const after = this.screenToWorld(screenX, screenY);
    this.viewport.cx += before.x - after.x;
    this.viewport.cy += before.y - after.y;
    this.dirty = true;
  }

  zoomBy(factor: number): void {
    this.zoomAt(this.canvas.w / 2, this.canvas.h / 2, factor);
  }

  resetView(): void {
    this.viewport = { scale: 1.6, cx: 0, cy: 0 };
    this.dirty = true;
  }

  fitView(padding = 1.4): void {
    const bodies = this.engine.bodies;
    if (bodies.length === 0) {
      this.resetView();
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const b of bodies) {
      minX = Math.min(minX, b.x - b.radius);
      maxX = Math.max(maxX, b.x + b.radius);
      minY = Math.min(minY, b.y - b.radius);
      maxY = Math.max(maxY, b.y + b.radius);
    }
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const scale = clamp(
      Math.min(this.canvas.w / (bw * padding), this.canvas.h / (bh * padding)),
      0.005,
      400,
    );
    this.viewport = { scale, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    this.dirty = true;
  }

  // --------------------------------------------------------------- experiments

  loadPreset(id: string, opts: { fit?: boolean; run?: boolean } = {}): boolean {
    const preset = getPreset(id);
    if (!preset) {
      this.notify(`Unknown experiment "${id}"`, 'error');
      return false;
    }
    this.params = { G: preset.G, softening: preset.softening };
    this.engine.G = preset.G;
    this.engine.softening = preset.softening;
    this.speed = preset.speed;
    const bodies = preset.build().map((s) => ({ ...s, id: makeId() }));
    this.applyBodies(bodies);
    this.presetId = id;
    this.labId = null;
    this.labName = null;
    this.baseline = copyBodies(bodies);
    this.simTime = 0;
    this.accumulator = 0;
    this.selectedId = null;
    this.clearTrails();
    this.clearHistory();
    if (opts.fit) this.fitView();
    this.running = opts.run ?? true;
    this.rebuildSnapshot();
    this.emitUi();
    return true;
  }

  clearAll(): void {
    this.applyBodies([]);
    this.baseline = null;
    this.presetId = null;
    this.labId = null;
    this.labName = null;
    this.simTime = 0;
    this.accumulator = 0;
    this.selectedId = null;
    this.running = false;
    this.clearTrails();
    this.clearHistory();
    this.rebuildSnapshot();
    this.emitUi();
  }

  /** Commit the current bodies as this experiment's t = 0 state. */
  captureBaseline(): void {
    this.baseline = copyBodies(this.engine.bodies);
    this.simTime = 0;
    this.clearHistory();
    this.notify('Initial conditions captured', 'info');
    this.rebuildSnapshot();
    this.emitUi();
  }

  /** Restore the experiment's t = 0 state (a loaded preset or saved lab). */
  resetToInitial(): void {    if (this.baseline) {
      this.applyBodies(copyBodies(this.baseline));
    } else {
      this.applyBodies([]);
    }
    this.simTime = 0;
    this.accumulator = 0;
    this.selectedId = null;
    this.running = false;
    this.clearTrails();
    this.clearHistory();
    this.notify('Reset to initial conditions', 'info');
    this.rebuildSnapshot();
    this.emitUi();
  }

  clearTrails(): void {
    for (const t of this.trails.values()) t.clear();
    this.dirty = true;
  }

  private clearHistory(): void {
    this.energyHistory = [];
    this.speedHistory = [];
  }

  private applyBodies(bodies: Body[]): void {
    this.engine.setBodies(bodies);
    const ids = new Set(bodies.map((b) => b.id));
    for (const id of [...this.trails.keys()]) {
      if (!ids.has(id)) this.trails.delete(id);
    }
    for (const b of bodies) {
      if (!this.trails.has(b.id)) this.trails.set(b.id, new Trail(TRAIL_CAPACITY));
    }
  }

  // ------------------------------------------------------------------ snapshot

  snapshotCurrent(): Omit<LabModel, 'id' | 'name' | 'createdAt' | 'updatedAt'> {
    return {
      G: this.params.G,
      softening: this.params.softening,
      speed: this.speed,
      simTime: this.simTime,
      bodies: copyBodies(this.engine.bodies),
    };
  }

  loadLabState(lab: LabModel, opts: { fit?: boolean } = {}): void {
    this.params = { G: lab.G, softening: lab.softening };
    this.engine.G = lab.G;
    this.engine.softening = lab.softening;
    this.speed = lab.speed;
    const bodies = copyBodies(lab.bodies);
    this.applyBodies(bodies);
    this.presetId = null;
    this.labId = lab.id;
    this.labName = lab.name;
    this.baseline = copyBodies(bodies);
    this.simTime = 0;
    this.accumulator = 0;
    this.selectedId = null;
    this.running = false;
    this.clearTrails();
    this.clearHistory();
    if (opts.fit !== false) this.fitView();
    this.notify(`Loaded "${lab.name}"`, 'info');
    this.rebuildSnapshot();
    this.emitUi();
  }

  // -------------------------------------------------------------------- notice

  notify(text: string, kind: 'info' | 'error' = 'info'): void {
    this.notice = { kind, text, at: Date.now() };
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.notice = null;
      this.rebuildSnapshot();
      this.emitUi();
    }, 2600);
  }

  // ------------------------------------------------------------------ sampling

  private sampleTrails(): void {
    if (this.simTime - this.lastTrailTime < TRAIL_SAMPLE_DT) return;
    this.lastTrailTime = this.simTime;
    for (const b of this.engine.bodies) {
      this.trails.get(b.id)?.push(b.x, b.y);
    }
  }

  private sampleHistory(): void {
    if (this.simTime - this.lastHistoryTime < HISTORY_DT) return;
    this.lastHistoryTime = this.simTime;
    const e = this.engine.energy();
    this.energyHistory.push({ t: this.simTime, ke: e.kinetic, pe: e.potential, te: e.total });
    if (this.energyHistory.length > ENERGY_HISTORY) this.energyHistory.shift();

    if (this.selectedId) {
      const body = this.engine.bodies.find((b) => b.id === this.selectedId);
      if (body) {
        this.speedHistory.push({ t: this.simTime, speed: Math.hypot(body.vx, body.vy) });
        if (this.speedHistory.length > SPEED_HISTORY) this.speedHistory.shift();
      }
    }
  }
}

function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}
