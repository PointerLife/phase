import { describe, expect, test } from 'bun:test';
import { parseLabs, sanitizeLab } from './labs';

const validEntry = {
  id: 'lab1',
  name: 'Orbit',
  createdAt: 100,
  updatedAt: 200,
  G: 1.5,
  softening: 3,
  speed: 1,
  simTime: 12,
  bodies: [
    {
      id: 'b1',
      name: 'Star',
      mass: 100,
      radius: 10,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: '#F5A623',
      fixed: true,
    },
  ],
};

describe('lab persistence', () => {
  test('a well-formed entry survives sanitisation unchanged (modulo clamps)', () => {
    const lab = sanitizeLab(validEntry);
    expect(lab).not.toBeNull();
    expect(lab!.bodies.length).toBe(1);
    expect(lab!.bodies[0].mass).toBe(100);
    expect(lab!.bodies[0].fixed).toBe(true);
    expect(lab!.G).toBe(1.5);
  });

  test('labs with no valid bodies are rejected', () => {
    expect(sanitizeLab({ ...validEntry, bodies: [] })).toBeNull();
    expect(sanitizeLab({ ...validEntry, bodies: [{ name: 'x' }] })).toBeNull();
  });

  test('non-objects and missing arrays are rejected', () => {
    expect(sanitizeLab(null)).toBeNull();
    expect(sanitizeLab('nope')).toBeNull();
    expect(sanitizeLab({})).toBeNull();
  });

  test('out-of-range numbers are clamped; garbage is tolerated', () => {
    const lab = sanitizeLab({
      ...validEntry,
      G: 99,
      speed: -5,
      bodies: [
        {
          ...validEntry.bodies[0],
          mass: 1e12,
          radius: -40,
          color: 'not-a-color',
        },
      ],
    });
    expect(lab).not.toBeNull();
    expect(lab!.G).toBeLessThanOrEqual(10);
    expect(lab!.speed).toBeGreaterThanOrEqual(0);
    expect(lab!.bodies[0].mass).toBeLessThanOrEqual(1e7);
    expect(lab!.bodies[0].radius).toBeGreaterThan(0);
    expect(lab!.bodies[0].color).toMatch(/^#/);
  });

  test('a body with non-finite coordinates is dropped', () => {
    const lab = sanitizeLab({
      ...validEntry,
      bodies: [{ ...validEntry.bodies[0], x: Number.NaN }],
    });
    // The only body is invalid, so nothing survives.
    expect(lab).toBeNull();
  });

  test('parseLabs tolerates corrupt storage JSON', () => {
    expect(parseLabs(null)).toEqual([]);
    expect(parseLabs('{broken')).toEqual([]);
    expect(parseLabs('42')).toEqual([]);
    expect(parseLabs(JSON.stringify([validEntry, null, { bodies: [] }]))).toHaveLength(1);
  });
});