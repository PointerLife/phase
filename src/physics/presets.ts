import type { Body } from './types';
import { DEFAULT_G, DEFAULT_SOFTENING } from './constants';

/** Palette used across presets and newly spawned bodies. */
export const BODY_COLORS = [
  '#2FE6D0',
  '#F5A623',
  '#4C8DFF',
  '#A06BFF',
  '#39D98A',
  '#FF5FA2',
  '#FF7A45',
  '#39C6D9',
] as const;

export type BodySeed = Omit<Body, 'id'>;

export interface Preset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  G: number;
  softening: number;
  speed: number;
  /** Deterministic: every call returns a fresh, identical set of seeds. */
  build: () => BodySeed[];
}

function seed(
  name: string,
  mass: number,
  radius: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
  fixed = false,
): BodySeed {
  return { name, mass, radius, x, y, vx, vy, color, fixed };
}

/**
 * Body on a circular orbit of radius `r` around a central mass, starting at
 * `angle` (radians). Angular velocity is perpendicular to the radius vector.
 * `mass` is the body's own (usually negligible) mass.
 */
function orbiting(
  name: string,
  centralMass: number,
  G: number,
  r: number,
  angle: number,
  mass: number,
  radius: number,
  color: string,
): BodySeed {
  const v = Math.sqrt((G * centralMass) / r);
  return seed(
    name,
    mass,
    radius,
    r * Math.cos(angle),
    r * Math.sin(angle),
    -v * Math.sin(angle),
    v * Math.cos(angle),
    color,
  );
}

const TWO_BODY: Preset = {
  id: 'binary',
  name: 'Binary Orbit',
  tagline: 'Two suns, one barycentre',
  description:
    'Two equal stars orbit their common centre of mass. Both bodies trace the same ellipse; the barycentre stays fixed because the system carries zero net momentum.',
  G: DEFAULT_G,
  softening: DEFAULT_SOFTENING,
  speed: 1,
  build: () => {
    const G = DEFAULT_G;
    const m1 = 1200;
    const m2 = 1200;
    const d = 140; // separation
    // Relative speed of a circular two-body orbit.
    const vRel = Math.sqrt((G * (m1 + m2)) / d);
    const v1 = (vRel * m2) / (m1 + m2);
    const v2 = (vRel * m1) / (m1 + m2);
    return [
      seed('Star A', m1, 13, -d / 2, 0, 0, v1, '#F5A623'),
      seed('Star B', m2, 13, d / 2, 0, 0, -v2, '#4C8DFF'),
    ];
  },
};

const THREE_BODY: Preset = {
  id: 'three-body',
  name: 'Three-Body Problem',
  tagline: "Burrau's chaotic trio",
  description:
    'The Pythagorean three-body problem: masses 3, 4 and 5 released from the corners of a 3-4-5 triangle. A close triple encounter ejects one body and leaves the other two bound — a textbook demonstration of deterministic chaos.',
  G: DEFAULT_G,
  softening: 2,
  speed: 1,
  build: () => {
    const s = 40; // spatial scale; velocities are zero so the shape is preserved
    return [
      seed('Mass 3', 3, 9, 1 * s, 3 * s, 0, 0, '#2FE6D0'),
      seed('Mass 4', 4, 11, -2 * s, -1 * s, 0, 0, '#F5A623'),
      seed('Mass 5', 5, 13, 1 * s, -1 * s, 0, 0, '#FF5FA2'),
    ];
  },
};

const SOLAR_SYSTEM: Preset = {
  id: 'solar-system',
  name: 'Solar System Approximation',
  tagline: 'A star and five worlds',
  description:
    'A central star with five planets on near-circular orbits. Masses, radii, spacing and starting angles are simplified and exaggerated for legibility — this is a stylised model, not an ephemeris.',
  G: DEFAULT_G,
  softening: 4,
  speed: 1,
  build: () => {
    const G = DEFAULT_G;
    const starMass = 20000;
    const bodies: BodySeed[] = [
      seed('Helios', starMass, 17, 0, 0, 0, 0, '#F5A623', true),
    ];
    const planets: Array<[string, number, number, number, number, string]> = [
      // name, orbit radius, own mass, visual radius, start angle, colour
      ['Cinder', 66, 3, 5, 0.4, '#FF7A45'],
      ['Mira', 100, 12, 8, 2.4, '#39C6D9'],
      ['Terra', 150, 15, 9, 4.1, '#4C8DFF'],
      ['Rust', 205, 6, 6, 5.6, '#FF5FA2'],
      ['Colossus', 300, 420, 15, 1.2, '#A06BFF'],
    ];
    for (const [name, r, mass, radius, angle, color] of planets) {
      bodies.push(orbiting(name, starMass, G, r, angle, mass, radius, color));
    }
    return bodies;
  },
};

const GRAVITY_ASSIST: Preset = {
  id: 'gravity-assist',
  name: 'Gravity Assist',
  tagline: 'Free Δv from a passing world',
  description:
    'A light probe crosses the path of a massive planet on a straight track. Passing behind the planet bends the trajectory and raises the probe\u2019s speed; passing in front lowers it. Change the probe\u2019s initial velocity in the Inspector and watch the flyby speed change.',
  G: DEFAULT_G,
  softening: 2,
  speed: 1,
  build: () => [
    // Not `fixed`: the planet must travel so the flyby can transfer momentum.
    // Its mass dwarfs the probe, so the probe cannot perturb it appreciably.
    seed('Flyby Planet', 9000, 15, 220, 0, -6.5, 0, '#F5A623'),
    seed('Probe', 0.0005, 3, -320, 55, 9.5, 0, '#2FE6D0'),
  ],
};

export const PRESETS: Preset[] = [
  TWO_BODY,
  THREE_BODY,
  SOLAR_SYSTEM,
  GRAVITY_ASSIST,
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
