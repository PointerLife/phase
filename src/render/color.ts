/**
 * Colour helpers. Skia accepts a normalised RGBA Float32Array as a colour, which
 * avoids any ambiguity about CSS parsing. Values are cached so the renderer sees
 * stable references frame to frame.
 */
const cache = new Map<string, Float32Array>();

export function colorOf(hex: string, alpha = 1): Float32Array {
  const key = `${hex}|${alpha}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const out = new Float32Array([
    Number.isFinite(r) ? r : 0,
    Number.isFinite(g) ? g : 0,
    Number.isFinite(b) ? b : 0,
    alpha,
  ]);
  cache.set(key, out);
  return out;
}

/** rgba() string for use in RN styles. */
export function rgba(hex: string, alpha: number): string {
  let h = hex.startsWith('#') ? hex.slice(1) : hex;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
