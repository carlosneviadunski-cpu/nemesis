import { drawEnemyFigure, drawPlayerTank, drawShape } from "./anatomy";
import type { Game } from "./engine";
import { MATERIALS, RARITY_META } from "./materials";
import type { Obstacle } from "./types";
import { TAU, clamp, mulberry32, rgba, shade } from "./utils";

export const VIEW_BLOCKS = 25;

const STATE_COLORS = { attack: "#ef4444", retreat: "#f59e0b", dodge: "#22d3ee" } as const;
const PLAYER_COLOR = "#38bdf8";

interface Dust {
  x: number;
  y: number;
  z: number;
  r: number;
}
interface Nebula {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
}
interface Decal {
  x: number;
  y: number;
  r: number;
  kind: "ring" | "hex" | "tri" | "cross";
  rot: number;
}

// ── Renderizador principal (tela cheia) ──────────────────────
export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 800;
  height = 600;
  dpr = 1;
  scale = 24;
  viewHalfW = 16;
  viewHalfH = 12;
  shake = 0;
  private shakeX = 0;
  private shakeY = 0;
  private dust: Dust[] = [];
  private nebulae: Nebula[] = [];
  private decals: Decal[] = [];
  private obstacles: Obstacle[] = [];
  private arenaHalf = 50;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    for (let i = 0; i < 90; i++) this.dust.push({ x: Math.random(), y: Math.random(), z: 0.15 + Math.random() * 0.35, r: 0.6 + Math.random() * 1.6 });
  }

  /** Recebe o mundo (tamanho da arena e pilares) e gera a decoração do mapa. */
  setWorld(arenaHalf: number, obstacles: Obstacle[]) {
    this.arenaHalf = arenaHalf;
    this.obstacles = obstacles;
    const rng = mulberry32(obstacles.length * 7919 + Math.floor(arenaHalf));
    const H = arenaHalf;
    const palette = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa"];
    this.nebulae = [];
    for (let i = 0; i < 9; i++) {
      this.nebulae.push({ x: (rng() * 2 - 1) * H * 0.9, y: (rng() * 2 - 1) * H * 0.9, r: 14 + rng() * 16, color: palette[Math.floor(rng() * palette.length)], alpha: 0.06 + rng() * 0.07 });
    }
    this.decals = [];
    const kinds: Decal["kind"][] = ["ring", "hex", "tri", "cross"];
    for (let i = 0; i < 26; i++) {
      this.decals.push({ x: (rng() * 2 - 1) * (H - 4), y: (rng() * 2 - 1) * (H - 4), r: 2 + rng() * 4.5, kind: kinds[Math.floor(rng() * kinds.length)], rot: rng() * TAU });
    }
  }

  resize(w: number, h = w) {
    this.width = Math.max(100, Math.floor(w));
    this.height = Math.max(100, Math.floor(h));
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    this.dpr = Math.min(coarse ? 1.5 : 2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.scale = Math.min(this.width, this.height) / VIEW_BLOCKS;
    this.viewHalfW = this.width / this.scale / 2;
    this.viewHalfH = this.height / this.scale / 2;
  }

  render(g: Game, dt: number) {
    const { ctx, width, height, scale } = this;
    const hw = width / 2;
    const hh = height / 2;
    const cam = g.camera;

    this.shake = Math.max(0, this.shake - dt * 3);
    this.shakeX = (Math.random() - 0.5) * this.shake * scale * 0.35;
    this.shakeY = (Math.random() - 0.5) * this.shake * scale * 0.35;
    const X = (wx: number) => (wx - cam.x) * scale + hw + this.shakeX;
    const Y = (wy: number) => (wy - cam.y) * scale + hh + this.shakeY;
    const vw = this.viewHalfW + 2;
    const vh = this.viewHalfH + 2;
    const inView = (x: number, y: number, m = 0) => Math.abs(x - cam.x) < vw + m && Math.abs(y - cam.y) < vh + m;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#090c13");
    bg.addColorStop(1, "#06080d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Poeira (paralaxe profunda)
    for (const d of this.dust) {
      const sx = (((d.x * width - cam.x * scale * d.z) % width) + width) % width;
      const sy = (((d.y * height - cam.y * scale * d.z) % height) + height) % height;
      ctx.globalAlpha = 0.12 + d.z * 0.4;
      ctx.fillStyle = "#9fb3c8";
      ctx.beginPath();
      ctx.arc(sx, sy, d.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const H = this.arenaHalf;
    const ax = X(-H);
    const ay = Y(-H);
    const aw = H * 2 * scale;

    // Piso da arena
    ctx.fillStyle = "#11161f";
    ctx.fillRect(ax, ay, aw, aw);

    // Nebulosas
    for (const n of this.nebulae) {
      if (!inView(n.x, n.y, n.r)) continue;
      const grad = ctx.createRadialGradient(X(n.x), Y(n.y), 0, X(n.x), Y(n.y), n.r * scale);
      grad.addColorStop(0, rgba(n.color, n.alpha));
      grad.addColorStop(1, rgba(n.color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(X(n.x) - n.r * scale, Y(n.y) - n.r * scale, n.r * scale * 2, n.r * scale * 2);
    }

    // Grade
    const gx0 = Math.max(-H, Math.floor(cam.x - vw));
    const gx1 = Math.min(H, Math.ceil(cam.x + vw));
    const gy0 = Math.max(-H, Math.floor(cam.y - vh));
    const gy1 = Math.min(H, Math.ceil(cam.y + vh));
    for (const major of [false, true]) {
      ctx.beginPath();
      for (let gx = gx0; gx <= gx1; gx++) {
        if ((gx % 5 === 0) !== major) continue;
        const sx = Math.round(X(gx)) + 0.5;
        ctx.moveTo(sx, Math.max(0, ay));
        ctx.lineTo(sx, Math.min(height, ay + aw));
      }
      for (let gy = gy0; gy <= gy1; gy++) {
        if ((gy % 5 === 0) !== major) continue;
        const sy = Math.round(Y(gy)) + 0.5;
        ctx.moveTo(Math.max(0, ax), sy);
        ctx.lineTo(Math.min(width, ax + aw), sy);
      }
      ctx.strokeStyle = major ? "rgba(140,170,210,0.12)" : "rgba(140,170,210,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Decalques de piso
    for (const d of this.decals) {
      if (!inView(d.x, d.y, d.r)) continue;
      const sx = X(d.x);
      const sy = Y(d.y);
      const r = d.r * scale;
      ctx.strokeStyle = "rgba(160,190,230,0.07)";
      ctx.lineWidth = Math.max(1, scale * 0.08);
      ctx.beginPath();
      if (d.kind === "ring") {
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.moveTo(sx + r * 0.6, sy);
        ctx.arc(sx, sy, r * 0.6, 0, TAU);
      } else if (d.kind === "hex") {
        for (let k = 0; k < 6; k++) {
          const a = d.rot + (k / 6) * TAU;
          k ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        ctx.closePath();
      } else if (d.kind === "tri") {
        for (let k = 0; k < 3; k++) {
          const a = d.rot + (k / 3) * TAU;
          k ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        ctx.closePath();
      } else {
        ctx.moveTo(sx - r, sy);
        ctx.lineTo(sx + r, sy);
        ctx.moveTo(sx, sy - r);
        ctx.lineTo(sx, sy + r);
      }
      ctx.stroke();
    }

    // Núcleo central (ponto de partida)
    if (inView(0, 0, 6)) {
      const cx0 = X(0);
      const cy0 = Y(0);
      const cg = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, 5 * scale);
      cg.addColorStop(0, "rgba(56,189,248,0.12)");
      cg.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(cx0 - 5 * scale, cy0 - 5 * scale, 10 * scale, 10 * scale);
      ctx.strokeStyle = "rgba(56,189,248,0.18)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([scale * 0.6, scale * 0.4]);
      ctx.lineDashOffset = -g.time * scale * 0.5;
      ctx.beginPath();
      ctx.arc(cx0, cy0, 3.2 * scale, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Fora da arena + borda neon
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(ax, ay, aw, aw);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(244,63,94,0.25)";
    ctx.lineWidth = 14;
    ctx.strokeRect(ax, ay, aw, aw);
    ctx.strokeStyle = "rgba(251,113,133,0.95)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(ax, ay, aw, aw);
    // marcadores de canto
    const cl = 2 * scale;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    for (const [cx, cy, sx, sy] of [
      [ax, ay, 1, 1],
      [ax + aw, ay, -1, 1],
      [ax, ay + aw, 1, -1],
      [ax + aw, ay + aw, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * cl, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * cl);
      ctx.stroke();
    }

    this.drawObstacles(g, X, Y, inView);
    this.drawDrops(g, X, Y, inView);
    this.drawRings(g, X, Y);
    this.drawGhosts(g, X, Y);
    this.drawEnemies(g, X, Y, inView);
    this.drawBullets(g, X, Y, inView);
    this.drawBeams(g, X, Y);
    this.drawLightning(g, X, Y);
    this.drawPlayer(g, X, Y);
    this.drawParticles(g, X, Y);
    this.drawTexts(g, X, Y);
    this.drawOffscreen(g);
    this.drawMinimap(g);
    this.drawOverlays(g);
  }

  private drawObstacles(_g: Game, X: (v: number) => number, Y: (v: number) => number, inView: (x: number, y: number, m?: number) => boolean) {
    const { ctx, scale } = this;
    for (const o of this.obstacles) {
      if (!inView(o.x, o.y, o.r + 1)) continue;
      const sx = X(o.x);
      const sy = Y(o.y);
      const r = o.r * scale;
      const poly = (cx: number, cy: number, rr: number) => {
        ctx.beginPath();
        for (let k = 0; k < o.sides; k++) {
          const a = o.rot + (k / o.sides) * TAU;
          k ? ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath();
      };
      // brilho de base
      const glow = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, r * 1.6);
      glow.addColorStop(0, "rgba(96,165,250,0.12)");
      glow.addColorStop(1, "rgba(96,165,250,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - r * 1.6, sy - r * 1.6, r * 3.2, r * 3.2);
      // sombra / lateral
      poly(sx + r * 0.08, sy + r * 0.12, r);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();
      poly(sx, sy + r * 0.06, r);
      ctx.fillStyle = "#1a2130";
      ctx.fill();
      // topo
      poly(sx, sy, r);
      const top = ctx.createLinearGradient(sx - r, sy - r, sx + r, sy + r);
      top.addColorStop(0, "#3a4458");
      top.addColorStop(1, "#1f2634");
      ctx.fillStyle = top;
      ctx.fill();
      ctx.strokeStyle = "rgba(147,197,253,0.55)";
      ctx.lineWidth = Math.max(1.5, scale * 0.07);
      ctx.lineJoin = "round";
      ctx.stroke();
      // detalhe interno
      poly(sx, sy, r * 0.55);
      ctx.strokeStyle = "rgba(147,197,253,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, r * 0.12), 0, TAU);
      ctx.fillStyle = "rgba(147,197,253,0.5)";
      ctx.fill();
    }
  }

  private drawDrops(g: Game, X: (v: number) => number, Y: (v: number) => number, inView: (x: number, y: number, m?: number) => boolean) {
    const { ctx, scale } = this;
    for (const d of g.drops) {
      if (!inView(d.x, d.y)) continue;
      const m = MATERIALS[d.material];
      if (!m) continue;
      const rc = RARITY_META[m.rarity].color;
      const remaining = d.ttl - d.age;
      if (remaining < 6 && Math.floor(d.age * 6) % 2 === 0) continue;
      const bob = Math.sin(d.age * 3 + d.id) * 0.06 * scale;
      const sx = X(d.x);
      const sy = Y(d.y) + bob;
      const r = 0.22 * scale;
      const order = RARITY_META[m.rarity].order;
      ctx.globalAlpha = 0.16 + 0.08 * Math.sin(d.age * 4) + order * 0.04;
      ctx.beginPath();
      ctx.arc(sx, sy, r * (1.8 + order * 0.25), 0, TAU);
      ctx.fillStyle = rc;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (order >= 3) {
        ctx.beginPath();
        ctx.arc(sx, sy, r * 2.4, 0, TAU);
        ctx.strokeStyle = rgba(rc, 0.5 + 0.3 * Math.sin(d.age * 5));
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -d.age * 20;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      drawShape(ctx, m.shape, sx, sy, r, d.age * 1.5, m.color, rc, Math.max(1, 0.06 * scale));
    }
  }

  private drawRings(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    for (const r of g.rings) {
      const t = 1 - r.life / r.maxLife;
      ctx.beginPath();
      ctx.arc(X(r.x), Y(r.y), Math.max(0.01, r.maxR * t * scale), 0, TAU);
      ctx.strokeStyle = rgba(r.color, (1 - t) * 0.8);
      ctx.lineWidth = Math.max(1, r.width * scale * (1 - t * 0.5));
      ctx.stroke();
    }
  }

  private drawGhosts(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    for (const gh of g.ghosts) {
      ctx.globalAlpha = (gh.life / gh.maxLife) * 0.35;
      drawPlayerTank(ctx, X(gh.x), Y(gh.y), scale, gh.aim, g.weapon, "#67e8f9");
    }
    ctx.globalAlpha = 1;
  }

  private drawEnemies(g: Game, X: (v: number) => number, Y: (v: number) => number, inView: (x: number, y: number, m?: number) => boolean) {
    const { ctx, scale } = this;
    const lw = Math.max(1, 0.08 * scale);
    for (const e of g.enemies) {
      if (e.dead || !inView(e.x, e.y, e.radius * 3)) continue;
      const def = e.def;
      const sx = X(e.x);
      const sy = Y(e.y);
      const spawning = e.scaleIn < 1;
      const r = e.radius * scale * (spawning ? 0.6 + 0.4 * e.scaleIn : 1);

      if (spawning) {
        ctx.globalAlpha = 0.25 + 0.55 * e.scaleIn;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius * scale * (1.8 - 0.8 * e.scaleIn), 0, TAU);
        ctx.strokeStyle = e.elite ? "#fbbf24" : def.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -g.time * 30;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // sombra
      ctx.beginPath();
      ctx.arc(sx, sy + r * 0.12, r * 1.05, 0, TAU);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fill();

      if (e.state === "dodge") {
        ctx.globalAlpha = 0.22;
        drawShape(ctx, def.shape, sx - e.vx * 0.06 * scale, sy - e.vy * 0.06 * scale, r, e.rot, def.color);
        ctx.globalAlpha = spawning ? 0.25 + 0.55 * e.scaleIn : 1;
      }

      drawEnemyFigure(ctx, sx, sy, r, def, e.rot, e.aim, { elite: e.elite, flash: e.hitFlash, enraged: e.enraged, time: g.time, boss: def.boss });
      ctx.globalAlpha = 1;

      if (e.enraged) {
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.2, 0, TAU);
        ctx.strokeStyle = rgba("#ef4444", 0.5 + 0.4 * Math.sin(g.time * 12));
        ctx.lineWidth = Math.max(1.5, lw * 0.8);
        ctx.stroke();
      }
      if (e.elite) {
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.36, 0, TAU);
        ctx.strokeStyle = rgba("#fbbf24", 0.75 + 0.25 * Math.sin(g.time * 6));
        ctx.lineWidth = Math.max(1.5, lw * 0.7);
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -g.time * 25;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.slow > 0) {
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.15, 0, TAU);
        ctx.strokeStyle = "rgba(103,232,249,0.7)";
        ctx.lineWidth = Math.max(1, lw * 0.6);
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.burn) {
        ctx.globalAlpha = 0.5 + Math.random() * 0.3;
        ctx.beginPath();
        ctx.arc(sx + (Math.random() - 0.5) * r * 0.6, sy + (Math.random() - 0.5) * r * 0.6, r * 0.35, 0, TAU);
        ctx.fillStyle = "#fb923c";
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (def.healer) {
        ctx.beginPath();
        ctx.arc(sx, sy, 4 * scale, 0, TAU);
        ctx.strokeStyle = "rgba(45,212,191,0.22)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (e.hp < e.maxHp - 0.5) {
        const bw = Math.max(2 * r, 0.9 * scale);
        const bh = Math.max(3, 0.12 * scale);
        const bx = sx - bw / 2;
        const by = sy + r + 0.3 * scale;
        const ratio = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, bh);
        ctx.fill();
        ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#facc15" : "#f87171";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw * ratio, bh, bh);
        ctx.fill();
      }

      if (g.showAi && !spawning) {
        ctx.beginPath();
        ctx.arc(sx, sy - r - 0.35 * scale, Math.max(2, 0.1 * scale), 0, TAU);
        ctx.fillStyle = STATE_COLORS[e.state];
        ctx.fill();
      }
    }
  }

  private drawBullets(g: Game, X: (v: number) => number, Y: (v: number) => number, inView: (x: number, y: number, m?: number) => boolean) {
    const { ctx, scale } = this;
    for (const b of g.bullets) {
      if (!inView(b.x, b.y)) continue;
      const sx = X(b.x);
      const sy = Y(b.y);
      const r = Math.max(1.5, b.radius * scale);
      const lw = Math.max(1, 0.06 * scale);
      ctx.beginPath();
      ctx.arc(sx, sy, r * (b.owner === "player" ? 2.2 : 1.8), 0, TAU);
      ctx.fillStyle = rgba(b.color, b.owner === "player" ? (b.crit ? 0.3 : 0.16) : 0.1);
      ctx.fill();
      if (b.rocket) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.beginPath();
        ctx.roundRect(-r * 1.5, -r, r * 3, r * 2, r);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.strokeStyle = shade(b.color, -0.4);
        ctx.lineWidth = lw;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 1.5, -r);
        ctx.lineTo(r * 2.3, 0);
        ctx.lineTo(r * 1.5, r);
        ctx.closePath();
        ctx.fillStyle = shade(b.color, -0.25);
        ctx.fill();
        ctx.restore();
      } else if (b.homing && b.owner === "enemy") {
        drawShape(ctx, "diamond", sx, sy, r * 1.4, Math.atan2(b.vy, b.vx), b.color, shade(b.color, -0.4), lw);
      } else if (b.isFragment) {
        drawShape(ctx, "triangle", sx, sy, r, b.spin, b.color, shade(b.color, -0.4), lw);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.fillStyle = b.crit ? shade(b.color, 0.45) : b.color;
        ctx.fill();
        ctx.strokeStyle = shade(b.color, -0.4);
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }
  }

  private drawBeams(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    for (const b of g.beams) {
      const a = b.life / b.maxLife;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(X(b.x1), Y(b.y1));
      ctx.lineTo(X(b.x2), Y(b.y2));
      ctx.strokeStyle = rgba(b.color, 0.25 * a);
      ctx.lineWidth = Math.max(2, b.width * scale * 2.4);
      ctx.stroke();
      ctx.strokeStyle = rgba(b.color, 0.9 * a);
      ctx.lineWidth = Math.max(1.5, b.width * scale);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
      ctx.lineWidth = Math.max(1, b.width * scale * 0.35);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
  }

  private drawLightning(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    for (const l of g.lightnings) {
      const a = l.life / l.maxLife;
      ctx.beginPath();
      l.points.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
      ctx.strokeStyle = rgba(l.color, 0.9 * a);
      ctx.lineWidth = Math.max(1.5, 0.08 * scale);
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawPlayer(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    const p = g.player;
    const sx = X(p.x);
    const sy = Y(p.y);
    if (g.gameOver) return;
    const ratio = p.hp / p.maxHp;
    if (ratio < 0.35) {
      ctx.beginPath();
      ctx.arc(sx, sy, scale * (0.75 + 0.1 * Math.sin(g.time * 8)), 0, TAU);
      ctx.strokeStyle = rgba("#ef4444", 0.4 + 0.3 * Math.sin(g.time * 8));
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (p.invuln > 0) {
      ctx.beginPath();
      ctx.arc(sx, sy, scale * 0.82, 0, TAU);
      ctx.strokeStyle = rgba("#67e8f9", 0.5 + 0.4 * Math.sin(g.time * 30));
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(sx, sy + 0.1 * scale, 0.58 * scale, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fill();
    const moving = clamp(Math.hypot(p.vx, p.vy) / p.speed, 0, 1);
    drawPlayerTank(ctx, sx, sy, scale, p.aim, g.weapon, PLAYER_COLOR, p.barrelRecoil, p.hitFlash, moving, g.weapon.tier);
    // Barra de vida
    const bw = 1.3 * scale;
    const bh = Math.max(3, 0.13 * scale);
    const bx = sx - bw / 2;
    const by = sy + 0.5 * scale + 0.3 * scale;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, bh);
    ctx.fill();
    ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#facc15" : "#f87171";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw * clamp(ratio, 0, 1), bh, bh);
    ctx.fill();
    if (p.dashCooldown > 0) {
      const t = 1 - p.dashCooldown / g.dashCooldownMax;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.72 * scale, -Math.PI / 2, -Math.PI / 2 + TAU * t);
      ctx.strokeStyle = rgba("#67e8f9", 0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawParticles(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    for (const p of g.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      const s = p.size * scale * (0.4 + 0.6 * a);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const sx = X(p.x);
      const sy = Y(p.y);
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(sx, sy, s, 0, TAU);
        ctx.fill();
      } else if (p.shape === "square") {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(s * 1.4, 0);
        ctx.lineTo(-s * 0.7, s * 0.8);
        ctx.lineTo(-s * 0.7, -s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawTexts(g: Game, X: (v: number) => number, Y: (v: number) => number) {
    const { ctx, scale } = this;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of g.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `800 ${Math.max(10, t.size * scale)}px Inter, system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(t.text, X(t.x), Y(t.y));
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, X(t.x), Y(t.y));
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
  }

  private drawOffscreen(g: Game) {
    const { ctx, width, height, scale } = this;
    const hw = width / 2;
    const hh = height / 2;
    const inset = 0.9 * scale;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = e.x - g.camera.x;
      const dy = e.y - g.camera.y;
      if (Math.abs(dx) <= this.viewHalfW && Math.abs(dy) <= this.viewHalfH) continue;
      const t = Math.min((hw - inset) / Math.abs(dx * scale || 1e-6), (hh - inset) / Math.abs(dy * scale || 1e-6));
      const sx = hw + dx * scale * t;
      const sy = hh + dy * scale * t;
      const ang = Math.atan2(dy, dx);
      const s = e.def.boss ? 11 : e.elite ? 9 : 7;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.7, s * 0.7);
      ctx.lineTo(-s * 0.7, -s * 0.7);
      ctx.closePath();
      ctx.fillStyle = e.elite ? "#fbbf24" : e.def.color;
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  private drawMinimap(g: Game) {
    const { ctx, width } = this;
    const mm = Math.max(84, Math.min(130, Math.min(width, this.height) * 0.17));
    const pad = 12;
    const x0 = width - mm - pad;
    const y0 = g.minimapTop;
    const H = this.arenaHalf;
    const k = mm / (H * 2);
    ctx.fillStyle = "rgba(5,8,14,0.72)";
    ctx.beginPath();
    ctx.roundRect(x0, y0, mm, mm, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const o of this.obstacles) {
      ctx.fillStyle = "rgba(147,197,253,0.35)";
      ctx.beginPath();
      ctx.arc(x0 + (o.x + H) * k, y0 + (o.y + H) * k, Math.max(1.2, o.r * k), 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.strokeRect(x0 + (g.camera.x + H - this.viewHalfW) * k, y0 + (g.camera.y + H - this.viewHalfH) * k, this.viewHalfW * 2 * k, this.viewHalfH * 2 * k);
    for (const d of g.drops) {
      ctx.fillStyle = RARITY_META[MATERIALS[d.material]?.rarity ?? "common"].color;
      ctx.fillRect(x0 + (d.x + H) * k - 1, y0 + (d.y + H) * k - 1, 2, 2);
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.elite ? "#fbbf24" : e.def.color;
      ctx.beginPath();
      ctx.arc(x0 + (e.x + H) * k, y0 + (e.y + H) * k, e.def.boss ? 4 : 2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(x0 + (g.player.x + H) * k, y0 + (g.player.y + H) * k, 3, 0, TAU);
    ctx.fill();
  }

  private drawOverlays(g: Game) {
    const { ctx, width, height } = this;
    const R = Math.max(width, height);
    const vg = ctx.createRadialGradient(width / 2, height / 2, R * 0.42, width / 2, height / 2, R * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    const p = g.player;
    const ratio = p.hp / p.maxHp;
    const hurt = Math.max(p.hitFlash * 0.5, ratio < 0.35 && !g.gameOver ? ((0.35 - ratio) / 0.35) * (0.7 + 0.3 * Math.sin(g.time * 6)) * 0.45 : 0);
    if (hurt > 0.01) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, R * 0.3, width / 2, height / 2, R * 0.72);
      grad.addColorStop(0, "rgba(239,68,68,0)");
      grad.addColorStop(1, `rgba(239,68,68,${Math.min(0.6, hurt)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
