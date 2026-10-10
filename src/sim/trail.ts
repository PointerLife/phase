/**
 * A fixed-capacity ring buffer of world-space points used to draw an orbital
 * trail. Stored as interleaved [x0, y0, x1, y1, ...] in a Float32Array so the
 * renderer can walk it without allocating.
 */
export class Trail {
  readonly data: Float32Array;
  head = 0;
  count = 0;

  constructor(readonly capacity: number) {
    this.data = new Float32Array(capacity * 2);
  }

  push(x: number, y: number): void {
    const i = this.head * 2;
    this.data[i] = x;
    this.data[i + 1] = y;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count += 1;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }

  /** Index of the oldest retained sample. */
  get start(): number {
    return this.count < this.capacity ? 0 : this.head;
  }
}
