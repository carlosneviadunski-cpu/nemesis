import type { BarrelSpec, EnemyDef, ShapeKind, Weapon } from "./types";
import { DEG, TAU, clamp, mix, rgba, shade, shapePoints } from "./utils";

// ─────────────────────────────────────────────────────────────
// Primitivas de forma
// ─────────────────────────────────────────────────────────────
export function traceShape(ctx: CanvasRenderingContext2D, shape: ShapeKind, cx: number, cy: number, r: number, rot: number) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(cx, cy, r, 0, TAU);
    return;
  }
  if (shape === "ring") {
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.moveTo(cx + r * 0.5, cy);
    ctx.arc(cx, cy, r * 0.5, 0, TAU, true);
    return;
  }
  const pts = shapePoints(shape, r);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const x = cx + p.x * c - p.y * s;
    const y = cy + p.x * s + p.y * c;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeKind,
  cx: number,
  cy: number,
  r: number,
  rot: number,
  fill: string | CanvasGradient,
  stroke?: string,
  lw = 0,
) {
  traceShape(ctx, shape, cx, cy, r, rot);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string, lw: number) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// Anatomia dos inimigos: canos derivados do padrão de tiro
//   • 3 projéteis em leque → 3 canos em leque
//   • longo alcance → cano mais longo (e cadência menor no catálogo)
//   • radial → canos ao redor · cruz → 4 canos · investida → lâmina
//   • teleguiado → casulos lançadores · curador → antena
//   • cadência altíssima → cano de metralhadora (boca alargada)
// Unidades: múltiplos do raio do inimigo.
// ─────────────────────────────────────────────────────────────
const enemyBarrelCache = new Map<string, BarrelSpec[]>();

export function enemyBarrels(def: EnemyDef): BarrelSpec[] {
  const cached = enemyBarrelCache.get(def.id);
  if (cached) return cached;
  const built = buildEnemyBarrels(def);
  enemyBarrelCache.set(def.id, built);
  return built;
}

function buildEnemyBarrels(def: EnemyDef): BarrelSpec[] {
  const L = clamp(1.25 + (def.range - 6) * 0.14, 1.2, 2.8);
  const W = clamp((def.bulletSize / def.radius) * 1.5, 0.28, 0.75);
  switch (def.pattern) {
    case "none":
      return [{ angle: 0, offset: 0, length: 1.8, width: 0.85, style: "spike", group: 0 }];
    case "radial": {
      const n = def.bulletCount;
      return Array.from({ length: n }, (_, k) => ({ angle: (k / n) * TAU, offset: 0, length: 1.35, width: 0.34, style: "rect" as const, group: 0 }));
    }
    case "cross":
      return [0, 1, 2, 3].map((k) => ({ angle: (k * Math.PI) / 2, offset: 0, length: 1.55, width: 0.42, style: "rect" as const, group: 0 }));
    case "spread": {
      const n = def.bulletCount;
      if (n === 2) return [-1, 1].map((s) => ({ angle: 0, offset: s * 0.34, length: L * 0.95, width: W * 0.8, style: "rect" as const, group: 0 }));
      const step = Math.max((def.bulletSpread * DEG) / (n - 1), 0.42);
      return Array.from({ length: n }, (_, k) => {
        const a = (k - (n - 1) / 2) * step;
        const center = Math.abs(a) < 1e-3;
        return { angle: a, offset: 0, length: L * (center ? 1 : 0.86), width: W * 0.85, style: (def.boss ? "cannon" : "rect") as BarrelSpec["style"], group: 0 };
      });
    }
    case "single":
    default: {
      if (def.homing) return [-1, 1].map((s) => ({ angle: s * 0.5, offset: 0, length: 1.35, width: 0.6, style: "pod" as const, group: 0 }));
      if (def.healer) return [{ angle: 0, offset: 0, length: 1.3, width: 0.95, style: "dish", group: 0 }];
      if (def.fireRate >= 3) return [{ angle: 0, offset: 0, length: 1.45, width: 0.42, tipWidth: 0.72, style: "trap", group: 0 }];
      if (def.range >= 12) return [{ angle: 0, offset: 0, length: L, width: W * 0.8, style: "sniper", group: 0 }];
      return [{ angle: 0, offset: 0, length: L, width: W, style: "rect", group: 0 }];
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Desenho de canos (compartilhado por jogador e inimigos)
// unit  → pixels por unidade da especificação
// bodyR → raio do corpo em unidades (jogador 0,5 bloco · inimigo 1 raio)
// ─────────────────────────────────────────────────────────────
export interface BarrelPalette {
  fill: string;
  stroke: string;
  dark: string;
  accent: string;
}

export function drawBarrels(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  unit: number,
  angle: number,
  barrels: BarrelSpec[],
  bodyR: number,
  pal: BarrelPalette,
  recoils?: number[],
) {
  const R = bodyR * unit;
  const lw = Math.max(1, R * 0.14);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  barrels.forEach((b, i) => {
    const rec = (recoils?.[i] ?? 0) * R * 0.28;
    ctx.save();
    ctx.rotate(b.angle);
    ctx.translate(-rec, b.offset * unit);
    const L = b.length * unit;
    const W = b.width * unit;
    const TW = (b.tipWidth ?? b.width) * unit;
    ctx.lineJoin = "round";
    switch (b.style) {
      case "trap":
      case "shotgun": {
        ctx.beginPath();
        ctx.moveTo(0, -W / 2);
        ctx.lineTo(L, -TW / 2);
        ctx.lineTo(L, TW / 2);
        ctx.lineTo(0, W / 2);
        ctx.closePath();
        ctx.fillStyle = pal.fill;
        ctx.fill();
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
        if (b.style === "shotgun") {
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.arc(L - TW * 0.22, k * TW * 0.3, TW * 0.13, 0, TAU);
            ctx.fillStyle = pal.stroke;
            ctx.fill();
          }
        } else {
          // aletas de refrigeração
          for (const f of [0.5, 0.65, 0.8]) {
            ctx.beginPath();
            ctx.rect(L * f, -W * 0.5 - lw * 0.4, lw * 0.9, W + lw * 0.8);
            ctx.fillStyle = pal.stroke;
            ctx.fill();
          }
        }
        break;
      }
      case "sniper": {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        rect(ctx, R * 0.95, -W * 0.95, W * 0.75, W * 1.9, pal.dark, pal.stroke, lw);
        rect(ctx, L - W * 0.6, -W * 0.62, W * 0.6, W * 1.24, pal.dark, pal.stroke, lw * 0.8);
        break;
      }
      case "rocket": {
        rect(ctx, 0, -W / 2, L * 0.84, W, pal.fill, pal.stroke, lw);
        rect(ctx, L * 0.78, -W * 0.72, L * 0.22, W * 1.44, pal.dark, pal.stroke, lw);
        ctx.beginPath();
        ctx.arc(L * 0.98, 0, W * 0.3, 0, TAU);
        ctx.fillStyle = shade(pal.accent, -0.3);
        ctx.fill();
        break;
      }
      case "laser": {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        ctx.beginPath();
        ctx.rect(R * 0.75, -W * 0.17, L - R * 0.75, W * 0.34);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(L, 0, W * 0.5, 0, TAU);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
        break;
      }
      case "burst": {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        for (const f of [0.55, 0.7, 0.85]) {
          ctx.beginPath();
          ctx.rect(L * f, -W / 2, Math.max(1.5, R * 0.12), W);
          ctx.fillStyle = shade(pal.accent, -0.15);
          ctx.fill();
        }
        break;
      }
      case "cannon": {
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
        rect(ctx, R * 0.78, -W * 0.78, W * 0.5, W * 1.56, pal.dark, pal.stroke, lw);
        break;
      }
      case "spike": {
        ctx.beginPath();
        ctx.moveTo(R * 0.25, -W / 2);
        ctx.lineTo(L, 0);
        ctx.lineTo(R * 0.25, W / 2);
        ctx.closePath();
        ctx.fillStyle = pal.fill;
        ctx.fill();
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(R * 0.5, 0);
        ctx.lineTo(L * 0.92, 0);
        ctx.strokeStyle = rgba(pal.accent, 0.8);
        ctx.lineWidth = Math.max(1, lw * 0.6);
        ctx.stroke();
        break;
      }
      case "pod": {
        ctx.beginPath();
        ctx.roundRect(R * 0.2, -W / 2, L - R * 0.2, W, W * 0.45);
        ctx.fillStyle = pal.fill;
        ctx.fill();
        ctx.strokeStyle = pal.stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(L - W * 0.45, 0, W * 0.26, 0, TAU);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        break;
      }
      case "dish": {
        rect(ctx, R * 0.2, -W * 0.14, L - R * 0.2, W * 0.28, pal.fill, pal.stroke, lw * 0.8);
        ctx.beginPath();
        ctx.arc(L, 0, W * 0.5, -Math.PI / 2, Math.PI / 2);
        ctx.strokeStyle = pal.fill;
        ctx.lineWidth = Math.max(1.5, lw * 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(L, 0, W * 0.16, 0, TAU);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        break;
      }
      case "rect":
      default:
        rect(ctx, 0, -W / 2, L, W, pal.fill, pal.stroke, lw);
    }
    ctx.restore();
  });
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// Jogador
// ─────────────────────────────────────────────────────────────
const PLAYER_PAL = { fill: "#a7adb7", stroke: "#3d434d", dark: "#6b7280" };

export function drawPlayerTank(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pxPerBlock: number,
  angle: number,
  weapon: Weapon,
  bodyColor: string,
  recoils?: number[],
  flash = 0,
  moving = 0,
  tier = 0,
) {
  const r = 0.5 * pxPerBlock;
  const lw = Math.max(1, 0.08 * pxPerBlock);

  // Propulsores (atrás)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle + Math.PI);
  for (const s of [-1, 1]) {
    if (moving > 0.05) {
      ctx.beginPath();
      ctx.ellipse(r * 1.05 + moving * r * 0.35, s * r * 0.42, r * 0.15 + moving * r * 0.4, r * 0.12, 0, 0, TAU);
      ctx.fillStyle = rgba("#7dd3fc", 0.3 + 0.45 * moving);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.roundRect(r * 0.5, s * r * 0.42 - r * 0.16, r * 0.5, r * 0.32, r * 0.08);
    ctx.fillStyle = "#3f4652";
    ctx.fill();
    ctx.strokeStyle = "#20242b";
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
  }
  ctx.restore();

  // Canos
  drawBarrels(ctx, cx, cy, pxPerBlock, angle, weapon.barrels, 0.5, { ...PLAYER_PAL, accent: weapon.color }, recoils);

  // Corpo
  const base = flash > 0 ? mix(bodyColor, "#ffffff", flash * 0.8) : bodyColor;
  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, shade(base, 0.35));
  grad.addColorStop(1, shade(base, -0.12));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = shade(base, -0.45);
  ctx.stroke();

  // Anel interno + marcas de tier
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.66, 0, TAU);
  ctx.strokeStyle = rgba("#ffffff", 0.2);
  ctx.lineWidth = Math.max(1, 0.04 * pxPerBlock);
  ctx.stroke();
  if (tier > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    for (let k = 0; k < tier; k++) {
      const a = (k - (tier - 1) / 2) * 0.32;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.rect(r * 0.74, -r * 0.05, r * 0.16, r * 0.1);
      ctx.fillStyle = rgba("#fbbf24", 0.9);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Visor (indicador de frente)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(r * 0.42, -r * 0.22);
  ctx.lineTo(r * 0.62, 0);
  ctx.lineTo(r * 0.42, r * 0.22);
  ctx.closePath();
  ctx.fillStyle = rgba("#ffffff", 0.35);
  ctx.fill();
  ctx.restore();

  // Núcleo na cor da arma
  const core = ctx.createRadialGradient(cx - r * 0.1, cy - r * 0.1, 0, cx, cy, r * 0.32);
  core.addColorStop(0, shade(weapon.color, 0.45));
  core.addColorStop(1, weapon.color);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, TAU);
  ctx.fillStyle = core;
  ctx.fill();
  ctx.strokeStyle = shade(weapon.color, -0.4);
  ctx.lineWidth = Math.max(1, lw * 0.6);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// Inimigos
// ─────────────────────────────────────────────────────────────
export interface EnemyFigureOpts {
  elite?: boolean;
  flash?: number;
  enraged?: boolean;
  time?: number;
  boss?: boolean;
}

export function drawEnemyFigure(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, def: EnemyDef, rot: number, aim: number, o: EnemyFigureOpts = {}) {
  const color = def.color;
  const lw = Math.max(1, r * 0.16);
  const pal: BarrelPalette = o.elite
    ? { fill: "#c9ab5a", stroke: "#6b5518", dark: "#8a6d1f", accent: "#fde68a" }
    : { fill: "#7b838e", stroke: "#2f353e", dark: "#4b5563", accent: color };
  const barrelAngle = def.pattern === "radial" || def.pattern === "cross" ? rot : aim;
  drawBarrels(ctx, cx, cy, r, barrelAngle, enemyBarrels(def), 1, pal);

  const fill = o.flash ? mix(color, "#ffffff", o.flash * 0.85) : color;
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r * 1.05);
  grad.addColorStop(0, shade(fill, 0.3));
  grad.addColorStop(1, shade(fill, -0.15));
  drawShape(ctx, def.shape, cx, cy, r, rot, grad, o.elite ? "#fbbf24" : shade(color, -0.42), lw);

  if (def.shape !== "ring" && r > 7) {
    traceShape(ctx, def.shape, cx, cy, r * 0.52, rot);
    ctx.fillStyle = rgba(shade(color, -0.35), o.flash ? 0.3 : 0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.5, r * 0.15), 0, TAU);
    ctx.fillStyle = rgba("#ffffff", 0.8);
    ctx.fill();
  }
  if (def.boss) {
    const t = o.time ?? 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.22, 0, TAU);
    ctx.strokeStyle = rgba("#fecdd3", 0.55);
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.setLineDash([r * 0.5, r * 0.28]);
    ctx.lineDashOffset = -t * r * 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
