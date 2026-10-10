import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Body } from '../physics/types';
import {
  MAX_BODIES,
  MAX_G,
  MAX_MASS,
  MAX_RADIUS,
  MAX_SOFTENING,
  MAX_SPEED,
  MIN_G,
  MIN_MASS,
  MIN_RADIUS,
  MIN_SOFTENING,
  MIN_SPEED,
} from '../physics/constants';
import { makeId } from '../physics/id';
import type { LabModel } from './types';

export const STORAGE_KEY = '@phase_space/labs/v1';

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function sanitizeBody(raw: unknown): Body | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const x = num(o.x);
  const y = num(o.y);
  const vx = num(o.vx);
  const vy = num(o.vy);
  const mass = num(o.mass);
  const radius = num(o.radius);
  if (x == null || y == null || vx == null || vy == null || mass == null || radius == null) {
    return null;
  }
  const color = typeof o.color === 'string' && HEX.test(o.color) ? o.color : '#2FE6D0';
  return {
    id: typeof o.id === 'string' && o.id.length > 0 ? o.id : makeId(),
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 24) : 'Body',
    mass: clamp(mass, MIN_MASS, MAX_MASS),
    radius: clamp(radius, MIN_RADIUS, MAX_RADIUS),
    x: clamp(x, -1e6, 1e6),
    y: clamp(y, -1e6, 1e6),
    vx: clamp(vx, -1e5, 1e5),
    vy: clamp(vy, -1e5, 1e5),
    color,
    fixed: o.fixed === true,
  };
}

/** Defensively coerce arbitrary parsed JSON into a valid lab, or reject it. */
export function sanitizeLab(raw: unknown): LabModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.bodies)) return null;
  const bodies = o.bodies
    .map(sanitizeBody)
    .filter((b): b is Body => b !== null)
    .slice(0, MAX_BODIES);
  if (bodies.length === 0) return null;

  const now = Date.now();
  const G = num(o.G) ?? 1;
  const softening = num(o.softening) ?? 3;
  const speed = num(o.speed) ?? 1;
  return {
    id: typeof o.id === 'string' && o.id.length > 0 ? o.id : makeId('lab'),
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 40) : 'Untitled Lab',
    createdAt: num(o.createdAt) ?? now,
    updatedAt: num(o.updatedAt) ?? now,
    G: clamp(G, MIN_G, MAX_G),
    softening: clamp(softening, MIN_SOFTENING, MAX_SOFTENING),
    speed: clamp(speed, MIN_SPEED, MAX_SPEED),
    simTime: Math.max(0, num(o.simTime) ?? 0),
    bodies,
  };
}

export function parseLabs(json: string | null): LabModel[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const labs: LabModel[] = [];
  for (const entry of parsed) {
    const lab = sanitizeLab(entry);
    if (lab) labs.push(lab);
  }
  return labs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function readLabs(): Promise<LabModel[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return parseLabs(json);
}

async function writeLabs(labs: LabModel[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(labs));
}

export async function persistLab(lab: LabModel): Promise<LabModel[]> {
  const labs = await readLabs();
  const idx = labs.findIndex((l) => l.id === lab.id);
  if (idx >= 0) labs[idx] = lab;
  else labs.unshift(lab);
  const sorted = labs.sort((a, b) => b.updatedAt - a.updatedAt);
  await writeLabs(sorted);
  return sorted;
}

export async function deleteLab(id: string): Promise<LabModel[]> {
  const labs = await readLabs();
  const next = labs.filter((l) => l.id !== id);
  await writeLabs(next);
  return next;
}

export async function renameLab(id: string, name: string): Promise<LabModel[]> {
  const labs = await readLabs();
  const lab = labs.find((l) => l.id === id);
  if (lab) {
    lab.name = name.trim().slice(0, 40) || lab.name;
    lab.updatedAt = Date.now();
  }
  const sorted = labs.sort((a, b) => b.updatedAt - a.updatedAt);
  await writeLabs(sorted);
  return sorted;
}
