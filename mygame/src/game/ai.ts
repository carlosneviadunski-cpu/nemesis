import type { Bullet, Enemy } from "./types";
import { clamp } from "./utils";

/**
 * Máquina de estados comportamental dos inimigos.
 *
 *  ATACAR  → persegue/mantém distância preferida, faz movimento lateral e dispara.
 *  RECUAR  → foge quando a vida está baixa (< limiar) ou após sofrer muito dano em pouco tempo.
 *  ESQUIVAR→ detecta projéteis do jogador em rota de colisão e desloca-se perpendicularmente
 *            (a chance depende do reflexo de cada espécie: dodgeSkill).
 */

export interface AIContext {
  px: number;
  py: number;
  pvx: number;
  pvy: number;
  playerBullets: Bullet[];
  arenaHalf: number;
  time: number;
}

interface Threat {
  side: number;
  vx: number;
  vy: number;
}

/** Procura o projétil mais iminente em rota de colisão com o inimigo. */
function detectThreat(e: Enemy, bullets: Bullet[]): Threat | null {
  let best: Threat | null = null;
  let bestT = Infinity;
  for (const b of bullets) {
    const rx = e.x - b.x;
    const ry = e.y - b.y;
    const dd = rx * rx + ry * ry;
    if (dd > 81) continue; // só considera projéteis a até 9 blocos
    const sp2 = b.vx * b.vx + b.vy * b.vy;
    if (sp2 < 1e-6) continue;
    const dot = rx * b.vx + ry * b.vy;
    if (dot <= 0) continue; // projétil se afastando
    const t = dot / sp2; // tempo até o ponto de maior aproximação
    if (t > 1.05) continue;
    const cross = b.vx * ry - b.vy * rx;
    const miss = Math.abs(cross) / Math.sqrt(sp2);
    if (miss < e.radius + b.radius + 0.45 && t < bestT) {
      bestT = t;
      best = { side: cross >= 0 ? 1 : -1, vx: b.vx, vy: b.vy };
    }
  }
  return best;
}

/**
 * Atualiza o estado e a intenção de movimento/mira do inimigo.
 * Retorna true quando o inimigo deseja disparar neste frame.
 */
export function updateEnemyAI(e: Enemy, ctx: AIContext, dt: number): boolean {
  const def = e.def;
  const dx = ctx.px - e.x;
  const dy = ctx.py - e.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const ux = dx / d;
  const uy = dy / d;
  const hpRatio = e.hp / e.maxHp;

  e.recentDamage = Math.max(0, e.recentDamage - e.maxHp * 0.4 * dt);
  e.dodgeCooldown -= dt;
  e.stateTimer -= dt;
  e.strafeTimer -= dt;
  if (e.strafeTimer <= 0) {
    e.strafeDir *= -1;
    e.strafeTimer = 1.2 + Math.random() * 1.8;
  }

  // ── 1. Detecção de ameaça → ESQUIVAR ──────────────────────
  if (e.state !== "dodge" && e.dodgeCooldown <= 0 && def.dodgeSkill > 0) {
    const threat = detectThreat(e, ctx.playerBullets);
    if (threat) {
      e.dodgeCooldown = 0.3;
      if (Math.random() < def.dodgeSkill) {
        const sp = Math.hypot(threat.vx, threat.vy) || 1;
        e.prevState = e.state;
        e.savedTimer = e.stateTimer;
        e.state = "dodge";
        e.stateTimer = 0.3 + Math.random() * 0.2;
        e.dodgeX = (-threat.vy / sp) * threat.side;
        e.dodgeY = (threat.vx / sp) * threat.side;
        // não se joga contra a parede
        if (Math.abs(e.x + e.dodgeX * 2) > ctx.arenaHalf - 1 || Math.abs(e.y + e.dodgeY * 2) > ctx.arenaHalf - 1) {
          e.dodgeX *= -1;
          e.dodgeY *= -1;
        }
      }
    }
  }

  // ── 2. Gatilho de RECUAR ──────────────────────────────────
  if (e.state === "attack" && !e.enraged) {
    const panicked = e.recentDamage > e.maxHp * 0.3;
    if ((hpRatio < def.retreatThreshold || panicked) && e.retreatCount < 3) {
      e.state = "retreat";
      e.stateTimer = 2.4 + Math.random() * 2;
      e.retreatCount++;
      e.recentDamage = 0;
    }
  }

  // ── 3. Comportamento por estado ───────────────────────────
  let mx = 0;
  let my = 0;
  let boost = 1;

  switch (e.state) {
    case "dodge": {
      mx = e.dodgeX;
      my = e.dodgeY;
      boost = 2.0;
      if (e.stateTimer <= 0) {
        e.state = e.prevState === "dodge" ? "attack" : e.prevState;
        e.stateTimer = e.savedTimer;
        e.dodgeCooldown = 0.4 + (1 - def.dodgeSkill) * 1.0;
      }
      break;
    }
    case "retreat": {
      const wob = Math.sin(ctx.time * 3 + e.id) * 0.6;
      mx = -ux + -uy * wob;
      my = -uy + ux * wob;
      boost = 1.15;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt); // recupera fôlego ao recuar

      const margin = 2.2;
      const nearX = Math.abs(e.x) > ctx.arenaHalf - margin && Math.sign(e.x) === Math.sign(mx);
      const nearY = Math.abs(e.y) > ctx.arenaHalf - margin && Math.sign(e.y) === Math.sign(my);
      if (nearX && nearY) {
        // encurralado: luta com desespero
        e.state = "attack";
        e.retreatCount = 3;
      } else if (nearX) {
        mx = 0;
        my = my === 0 ? e.strafeDir : Math.sign(my);
      } else if (nearY) {
        my = 0;
        mx = mx === 0 ? e.strafeDir : Math.sign(mx);
      }

      if (e.stateTimer <= 0) {
        const safe = d > def.range * 1.3 + 2;
        if (hpRatio > def.retreatThreshold + 0.1 || e.retreatCount >= 2 || safe || Math.random() < 0.5) {
          e.state = "attack";
        } else {
          e.stateTimer = 1.5 + Math.random();
        }
      }
      break;
    }
    case "attack":
    default: {
      if (def.pattern === "none") {
        // Investidor corpo a corpo
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0) {
          e.charging = 0.55;
          e.chargeTimer = 2.2 + Math.random() * 1.5;
        }
        if (e.charging > 0) {
          e.charging -= dt;
          boost = 1.9;
        }
        const lead = clamp(d / 8, 0, 0.6);
        const tx = ctx.px + ctx.pvx * lead - e.x;
        const ty = ctx.py + ctx.pvy * lead - e.y;
        const tl = Math.hypot(tx, ty) || 1;
        mx = tx / tl;
        my = ty / tl;
        if (d > 5 && e.charging <= 0) {
          mx += -uy * e.strafeDir * 0.45;
          my += ux * e.strafeDir * 0.45;
        }
      } else {
        const pref = e.enraged ? Math.min(def.preferredRange, 3.5) : def.preferredRange;
        // sem linha de visão (pilar no caminho): aproxima-se para contornar o obstáculo
        const radial = !e.los ? 1 : d > pref + 1.5 ? 1 : d < pref - 1.5 ? -1 : 0;
        const tangential = def.orbit ? 1.0 : radial === 0 ? 0.9 : 0.25;
        mx = ux * radial + -uy * e.strafeDir * tangential;
        my = uy * radial + ux * e.strafeDir * tangential;
        const m = 1.5;
        if (Math.abs(e.x + mx) > ctx.arenaHalf - m || Math.abs(e.y + my) > ctx.arenaHalf - m) {
          e.strafeDir *= -1;
          e.strafeTimer = 1.5;
        }
      }
      break;
    }
  }

  const ml = Math.hypot(mx, my);
  if (ml > 1e-4) {
    mx /= ml;
    my /= ml;
  }
  if (e.enraged && e.state === "retreat") e.state = "attack";
  e.moveX = mx * boost * (e.enraged ? 1.2 : 1);
  e.moveY = my * boost * (e.enraged ? 1.2 : 1);
  e.agility = e.state === "dodge" ? 18 : def.pattern === "none" ? 8 : 6;

  // ── Mira com antecipação (accuracy = quanto antecipa) ─────
  let aimX = ctx.px;
  let aimY = ctx.py;
  if (def.bulletSpeed > 0 && def.accuracy > 0) {
    const t = Math.min(2, d / def.bulletSpeed);
    aimX += ctx.pvx * t * def.accuracy;
    aimY += ctx.pvy * t * def.accuracy;
  }
  e.aim = Math.atan2(aimY - e.y, aimX - e.x);

  return def.pattern !== "none" && e.state !== "dodge" && e.los && d <= def.range + 0.5 && e.fireCooldown <= 0;
}
