/** A single gravitating body. Positions are in world units (wu). */
export interface Body {
  id: string;
  name: string;
  /** mu */
  mass: number;
  /** visual radius, wu */
  radius: number;
  /** position, wu */
  x: number;
  y: number;
  /** velocity, wu/s */
  vx: number;
  vy: number;
  /** hex colour used by the renderer */
  color: string;
  /** anchored bodies do not move but still attract others */
  fixed: boolean;
}

/** Tunable numerical / physical parameters of an experiment. */
export interface EngineParams {
  G: number;
  /** Plummer softening length (wu) guarding against close-encounter blow-up. */
  softening: number;
}

export interface EnergyReport {
  kinetic: number;
  potential: number;
  total: number;
}

/** Per-body values surfaced to telemetry. */
export interface BodyTelemetry {
  id: string;
  name: string;
  mass: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  ax: number;
  ay: number;
  accel: number;
  kinetic: number;
}
