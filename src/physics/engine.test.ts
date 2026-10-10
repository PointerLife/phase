import { describe, expect, test } from 'bun:test';
import { NBodyEngine } from './engine';
import { FIXED_DT } from './constants';
import { PRESETS, type BodySeed } from './presets';
import { makeId } from './id';
import type { Body } from './types';

function materialize(seeds: BodySeed[]): Body[] {
  return seeds.map((s) => ({ ...s, id: makeId() }));
}

function makeEngine(seeds: BodySeed[], G: number, softening: number): NBodyEngine {
  return new NBodyEngine(materialize(seeds), G, softening);
}

describe('NBodyEngine', () => {
  test('two equal masses orbit their barycentre with a stable separation', () => {
    const preset = PRESETS.find((p) => p.id === 'binary')!;
    const engine = makeEngine(preset.build(), preset.G, preset.softening);
    const d0 = Math.hypot(
      engine.bodies[0].x - engine.bodies[1].x,
      engine.bodies[0].y - engine.bodies[1].y,
    );
    let minD = d0;
    let maxD = d0;
    for (let i = 0; i < 240 * 20; i++) {
      engine.step(FIXED_DT);
      const d = Math.hypot(
        engine.bodies[0].x - engine.bodies[1].x,
        engine.bodies[0].y - engine.bodies[1].y,
      );
      minD = Math.min(minD, d);
      maxD = Math.max(maxD, d);
    }
    // A circular orbit should not drift by more than a fraction of a percent.
    expect(maxD - minD).toBeLessThan(d0 * 0.01);
  });

  test('total momentum is conserved', () => {
    const preset = PRESETS.find((p) => p.id === 'three-body')!;
    const engine = makeEngine(preset.build(), preset.G, preset.softening);
    const p0 = engine.momentum();
    for (let i = 0; i < 240 * 5; i++) engine.step(FIXED_DT);
    const p1 = engine.momentum();
    expect(Math.abs(p1.px - p0.px)).toBeLessThan(1e-6);
    expect(Math.abs(p1.py - p0.py)).toBeLessThan(1e-6);
  });

  test('total energy drifts only slightly over many steps', () => {
    const preset = PRESETS.find((p) => p.id === 'binary')!;
    const engine = makeEngine(preset.build(), preset.G, preset.softening);
    const e0 = engine.energy().total;
    for (let i = 0; i < 240 * 30; i++) engine.step(FIXED_DT);
    const e1 = engine.energy().total;
    expect(Math.abs(e1 - e0) / Math.max(1, Math.abs(e0))).toBeLessThan(0.01);
  });

  test('softening keeps a near-collision finite', () => {
    const bodies = materialize([
      { name: 'a', mass: 100, radius: 5, x: 0, y: 0, vx: 0, vy: 0, color: '#fff', fixed: false },
      { name: 'b', mass: 100, radius: 5, x: 0.01, y: 0, vx: 0, vy: 0, color: '#fff', fixed: false },
    ]);
    const engine = new NBodyEngine(bodies, 1, 2);
    let maxSpeed = 0;
    for (let i = 0; i < 240 * 5; i++) {
      engine.step(FIXED_DT);
      for (const b of engine.bodies) {
        maxSpeed = Math.max(maxSpeed, Math.hypot(b.vx, b.vy));
      }
    }
    for (const b of engine.bodies) {
      expect(Number.isFinite(b.x)).toBe(true);
      expect(Number.isFinite(b.y)).toBe(true);
      expect(Number.isFinite(b.vx)).toBe(true);
    }
    // With eps = 2 the peak speed is bounded and finite (no singularity).
    expect(maxSpeed).toBeLessThan(1e6);
  });

  test('fixed bodies attract but do not move', () => {
    const bodies = materialize([
      { name: 'anchor', mass: 1000, radius: 10, x: 0, y: 0, vx: 0, vy: 0, color: '#fff', fixed: true },
      { name: 'probe', mass: 1, radius: 3, x: 100, y: 0, vx: 0, vy: 0, color: '#fff', fixed: false },
    ]);
    const engine = new NBodyEngine(bodies, 1, 1);
    for (let i = 0; i < 240; i++) engine.step(FIXED_DT);
    expect(engine.bodies[0].x).toBe(0);
    expect(engine.bodies[0].y).toBe(0);
    // a = G*M/r^2 = 1000/100^2 = 0.1 wu/s^2 toward the origin -> vx ~ -0.1.
    expect(engine.bodies[1].x).toBeLessThan(99.99);
    expect(engine.bodies[1].vx).toBeLessThan(-0.05);
  });

  test('every preset builds finite, deterministic initial conditions', () => {
    for (const preset of PRESETS) {
      const a = preset.build();
      const b = preset.build();
      expect(a.length).toBeGreaterThan(0);
      expect(a).toEqual(b);
      for (const s of a) {
        expect(Number.isFinite(s.x)).toBe(true);
        expect(Number.isFinite(s.y)).toBe(true);
        expect(Number.isFinite(s.vx)).toBe(true);
        expect(Number.isFinite(s.vy)).toBe(true);
        expect(s.mass).toBeGreaterThan(0);
        expect(s.radius).toBeGreaterThan(0);
      }
    }
  });

  test('gravity assist raises the probe speed across the encounter', () => {
    const preset = PRESETS.find((p) => p.id === 'gravity-assist')!;
    const engine = makeEngine(preset.build(), preset.G, preset.softening);
    const probe = engine.bodies[1];
    const planet = engine.bodies[0];
    const v0 = Math.hypot(probe.vx, probe.vy);

    let minDist = Infinity;
    // Run until the probe has travelled well past the planet.
    for (let i = 0; i < 240 * 120; i++) {
      engine.step(FIXED_DT);
      const d = Math.hypot(probe.x - planet.x, probe.y - planet.y);
      minDist = Math.min(minDist, d);
      if (probe.x > 900) break;
    }
    const v1 = Math.hypot(probe.vx, probe.vy);
    // Sanity: an actual flyby occurred.
    expect(minDist).toBeLessThan(120);
    // And the probe left faster than it arrived.
    expect(v1).toBeGreaterThan(v0 * 1.05);
  });
});
