/**
 * PHASE SPACE unit system
 * -----------------------
 * The simulator works in *scaled* (arbitrary but internally consistent) units,
 * not SI. This keeps the numbers pleasant on screen while every physical
 * relation (F = G m1 m2 / r^2, energy, momentum) stays exact.
 *
 *   length  : wu   (world units)
 *   time    : s    (simulation seconds)
 *   mass    : mu   (mass units)
 *   G       : wu^3 * mu^-1 * s^-2
 *   energy  : EU   = mu * wu^2 / s^2
 *
 * Because G is exposed as a control, "one world unit" is only meaningful
 * relative to the current experiment. Energy readouts are therefore reported
 * in EU, and are most useful for spotting conservation / drift.
 */

export const UNITS_NOTE =
  'Scaled units: position in wu, time in s, mass in mu, energy in EU.';

export const DEFAULT_G = 1;
export const DEFAULT_SOFTENING = 3;

/** Fixed physics timestep. Physics never runs on the render clock. */
export const FIXED_DT = 1 / 240;
/** Upper bound on sub-steps per frame so a stalled frame cannot spiral. */
export const MAX_SUBSTEPS = 24;

export const MIN_G = 0;
export const MAX_G = 10;

export const MIN_SOFTENING = 0.5;
export const MAX_SOFTENING = 40;

export const MIN_MASS = 0.001;
export const MAX_MASS = 1e7;

export const MIN_RADIUS = 1;
export const MAX_RADIUS = 120;

export const MIN_SPEED = 0;
export const MAX_SPEED = 8;
/** Playback time multipliers offered in the UI. 0 is a single-step mode. */
export const SPEED_STEPS = [0, 0.25, 0.5, 1, 2, 4] as const;

export const MAX_BODIES = 64;

/** Orbital trail ring-buffer length (points per body). */
export const TRAIL_CAPACITY = 140;
/** Wall-clock-free trail sampling interval, in simulation seconds. */
export const TRAIL_SAMPLE_DT = 0.06;

/** Length of the rolling telemetry history buffers. */
export const ENERGY_HISTORY = 240;
export const SPEED_HISTORY = 240;
