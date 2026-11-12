import type { ShapeKind, Vec } from "./types";

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);
export const len = (x: number, y: number) => Math.hypot(x, y);

/** Suavização exponencial independente de framerate */
export const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt));

export function normalizeAngle(a: number) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export function weightedPick<T>(items: T[], weightOf: (item: T) => number, rng: () => number = Math.random): T {
  let total = 0;
  for (const it of items) total += weightOf(it);
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

// ── Hash & RNG determinístico ────────────────────────────────
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Cores ────────────────────────────────────────────────────
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amount em [-1, 1]: negativo escurece, positivo clareia */
export function shade(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  if (amount < 0) {
    const f = 1 + amount;
    return rgbToHex(r * f, g * f, b * f);
  }
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function mix(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Geometria ────────────────────────────────────────────────
function regular(n: number, r: number, start = 0): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * TAU;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

function star(n: number, r: number, inner: number, start = 0): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = start + (i / (n * 2)) * TAU;
    const rr = i % 2 === 0 ? r : inner;
    pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr });
  }
  return pts;
}

/**
 * Pontos de um polígono para a forma indicada, orientado para +x (direita).
 * "circle" e "ring" devem ser tratados especialmente pelo renderizador.
 */
export function shapePoints(shape: ShapeKind, r: number): Vec[] {
  switch (shape) {
    case "triangle":
      return regular(3, r);
    case "square":
      return regular(4, r, Math.PI / 4);
    case "pentagon":
      return regular(5, r);
    case "hexagon":
      return regular(6, r);
    case "heptagon":
      return regular(7, r);
    case "octagon":
      return regular(8, r, Math.PI / 8);
    case "dodecagon":
      return regular(12, r);
    case "diamond":
      return [
        { x: r, y: 0 },
        { x: 0, y: r * 0.62 },
        { x: -r, y: 0 },
        { x: 0, y: -r * 0.62 },
      ];
    case "star5":
      return star(5, r, r * 0.5);
    case "star6":
      return star(6, r, r * 0.55);
    case "hexagram":
      return star(6, r, r * 0.577);
    case "cross": {
      const w = r * 0.36;
      return [
        { x: r, y: -w }, { x: r, y: w }, { x: w, y: w }, { x: w, y: r }, { x: -w, y: r }, { x: -w, y: w },
        { x: -r, y: w }, { x: -r, y: -w }, { x: -w, y: -w }, { x: -w, y: -r }, { x: w, y: -r }, { x: w, y: -w },
      ];
    }
    case "trapezoid":
      return [
        { x: -r * 0.85, y: -r * 0.85 },
        { x: r * 0.85, y: -r * 0.45 },
        { x: r * 0.85, y: r * 0.45 },
        { x: -r * 0.85, y: r * 0.85 },
      ];
    case "bar":
      return [
        { x: -r * 1.05, y: -r * 0.38 },
        { x: r * 1.05, y: -r * 0.38 },
        { x: r * 1.05, y: r * 0.38 },
        { x: -r * 1.05, y: r * 0.38 },
      ];
    case "semicircle": {
      const pts: Vec[] = [];
      for (let i = 0; i <= 14; i++) {
        const a = -Math.PI / 2 + (i / 14) * Math.PI;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      pts.push({ x: -r * 0.25, y: r * 0.55 });
      pts.push({ x: -r * 0.25, y: -r * 0.55 });
      return pts;
    }
    case "circle":
    case "ring":
    default:
      return regular(24, r);
  }
}

export function roman(n: number) {
  return ["", "I", "II", "III", "IV", "V", "VI"][clamp(n, 0, 6)] ?? String(n);
}

export function fmt(n: number, digits = 0) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
