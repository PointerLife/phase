import type { Body, EnergyReport } from './types';

/**
 * Deterministic N-body Newtonian gravity integrator using velocity Verlet.
 *
 * The engine owns a flat, pre-allocated set of scratch buffers so that
 * `step()` performs no heap allocation (important inside the render loop).
 *
 * Forces use Plummer softening:
 *      a_i = sum_j  G * m_j * (r_j - r_i) / (|r|^2 + eps^2)^(3/2)
 * which removes the r -> 0 singularity on close encounters while leaving
 * well-separated interactions essentially exact.
 *
 * Potential energy uses the *matching* softened potential
 *      U = -sum_{i<j} G m_i m_j / sqrt(|r|^2 + eps^2)
 * so that the reported total energy is conserved to the same order as the
 * integrator, rather than jumping whenever a body drifts near another.
 */
export class NBodyEngine {
  bodies: Body[];
  G: number;
  softening: number;

  private ax: Float64Array;
  private ay: Float64Array;
  private nx: Float64Array;
  private ny: Float64Array;

  constructor(bodies: Body[], G: number, softening: number) {
    this.bodies = bodies;
    this.G = G;
    this.softening = softening;
    const n = Math.max(bodies.length, 1);
    this.ax = new Float64Array(n);
    this.ay = new Float64Array(n);
    this.nx = new Float64Array(n);
    this.ny = new Float64Array(n);
    this.recompute();
  }

  /** Replace the body set (e.g. loading a preset). Reallocates if needed. */
  setBodies(bodies: Body[]): void {
    this.bodies = bodies;
    const n = Math.max(bodies.length, 1);
    if (this.ax.length !== n) {
      this.ax = new Float64Array(n);
      this.ay = new Float64Array(n);
      this.nx = new Float64Array(n);
      this.ny = new Float64Array(n);
    }
    this.recompute();
  }

  /** Recompute accelerations at the current positions. */
  recompute(): void {
    const n = this.bodies.length;
    if (n > this.ax.length) {
      const cap = Math.max(n, this.ax.length * 2);
      this.ax = new Float64Array(cap);
      this.ay = new Float64Array(cap);
      this.nx = new Float64Array(cap);
      this.ny = new Float64Array(cap);
    }
    this.fillAccel(this.ax, this.ay);
  }

  /**
   * One velocity-Verlet step.
   *   1. x(t+dt) = x + v dt + 1/2 a dt^2
   *   2. a(t+dt) = A(x(t+dt))
   *   3. v(t+dt) = v + 1/2 (a(t) + a(t+dt)) dt
   */
  step(dt: number): void {
    const b = this.bodies;
    const n = b.length;
    const ax = this.ax;
    const ay = this.ay;
    const h = dt;
    const h2 = 0.5 * dt * dt;

    for (let i = 0; i < n; i++) {
      const bi = b[i];
      if (bi.fixed) continue;
      bi.x += bi.vx * h + ax[i] * h2;
      bi.y += bi.vy * h + ay[i] * h2;
    }

    const nx = this.nx;
    const ny = this.ny;
    this.fillAccel(nx, ny);

    const hh = 0.5 * dt;
    for (let i = 0; i < n; i++) {
      const bi = b[i];
      if (bi.fixed) continue;
      bi.vx += (ax[i] + nx[i]) * hh;
      bi.vy += (ay[i] + ny[i]) * hh;
    }

    // Swap the acceleration buffers: the freshly computed values become current.
    this.ax = nx;
    this.ay = ny;
    this.nx = ax;
    this.ny = ay;
  }

  /** Fill `outX`/`outY` with the gravitational acceleration of every body. */
  private fillAccel(outX: Float64Array, outY: Float64Array): void {
    const b = this.bodies;
    const n = b.length;
    for (let i = 0; i < n; i++) {
      outX[i] = 0;
      outY[i] = 0;
    }
    const G = this.G;
    const eps2 = this.softening * this.softening;

    for (let i = 0; i < n; i++) {
      const bi = b[i];
      const bix = bi.x;
      const biy = bi.y;
      for (let j = i + 1; j < n; j++) {
        const bj = b[j];
        const dx = bj.x - bix;
        const dy = bj.y - biy;
        const r2 = dx * dx + dy * dy + eps2;
        const invR = 1 / Math.sqrt(r2);
        const invR3 = invR * invR * invR;
        // Only the G/sqrt() work is shared; scale by each mass for the two bodies.
        const f = G * invR3;
        const ai = f * bj.mass;
        const aj = f * bi.mass;
        outX[i] += ai * dx;
        outY[i] += ai * dy;
        outX[j] -= aj * dx;
        outY[j] -= aj * dy;
      }
    }
  }

  /** Current acceleration of body `i` (for telemetry). */
  accelerationOf(i: number): { ax: number; ay: number } {
    return { ax: this.ax[i] ?? 0, ay: this.ay[i] ?? 0 };
  }

  kineticEnergy(): number {
    let ke = 0;
    const b = this.bodies;
    for (let i = 0; i < b.length; i++) {
      const bi = b[i];
      ke += 0.5 * bi.mass * (bi.vx * bi.vx + bi.vy * bi.vy);
    }
    return ke;
  }

  potentialEnergy(): number {
    let pe = 0;
    const b = this.bodies;
    const G = this.G;
    const eps2 = this.softening * this.softening;
    for (let i = 0; i < b.length; i++) {
      const bi = b[i];
      for (let j = i + 1; j < b.length; j++) {
        const bj = b[j];
        const dx = bj.x - bi.x;
        const dy = bj.y - bi.y;
        pe -= (G * bi.mass * bj.mass) / Math.sqrt(dx * dx + dy * dy + eps2);
      }
    }
    return pe;
  }

  energy(): EnergyReport {
    const kinetic = this.kineticEnergy();
    const potential = this.potentialEnergy();
    return { kinetic, potential, total: kinetic + potential };
  }

  /** Total linear momentum vector (conserved absent external forces). */
  momentum(): { px: number; py: number } {
    let px = 0;
    let py = 0;
    const b = this.bodies;
    for (let i = 0; i < b.length; i++) {
      px += b[i].mass * b[i].vx;
      py += b[i].mass * b[i].vy;
    }
    return { px, py };
  }

  centerOfMass(): { x: number; y: number } {
    let m = 0;
    let x = 0;
    let y = 0;
    const b = this.bodies;
    for (let i = 0; i < b.length; i++) {
      m += b[i].mass;
      x += b[i].mass * b[i].x;
      y += b[i].mass * b[i].y;
    }
    if (m <= 0) return { x: 0, y: 0 };
    return { x: x / m, y: y / m };
  }
}
