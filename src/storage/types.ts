import type { Body } from '../physics/types';

/** A persisted experiment: full initial conditions plus simulation parameters. */
export interface LabModel {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** gravitational constant (scaled units) */
  G: number;
  /** Plummer softening length (wu) */
  softening: number;
  /** playback time multiplier */
  speed: number;
  /** simulation time at which the snapshot was taken */
  simTime: number;
  bodies: Body[];
}
