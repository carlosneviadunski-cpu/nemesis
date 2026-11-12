import type { PlayerMods } from "./types";
import { weightedPick } from "./utils";

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  rare?: boolean;
  max?: number;
  apply: (m: PlayerMods) => void;
}

export function createMods(): PlayerMods {
  return {
    maxHp: 0,
    maxHpPct: 0,
    regen: 0,
    speed: 0,
    damage: 0,
    fireRate: 0,
    bulletSpeed: 0,
    pierce: 0,
    crit: 0,
    magnet: 0,
    luck: 0,
    bodyDamage: 0,
    dashCd: 0,
    lifesteal: 0,
  };
}

export const UPGRADES: UpgradeDef[] = [
  { id: "vigor", name: "Vigor", desc: "+20 de vida máxima (e cura 20).", icon: "❤", color: "#4ade80", apply: (m) => void (m.maxHp += 20) },
  { id: "regen", name: "Regeneração", desc: "+1% de vida por segundo fora de combate.", icon: "✚", color: "#86efac", max: 5, apply: (m) => void (m.regen += 0.01) },
  { id: "speed", name: "Propulsores", desc: "+8% de velocidade de movimento.", icon: "➤", color: "#38bdf8", max: 6, apply: (m) => void (m.speed += 0.08) },
  { id: "damage", name: "Munição Reforçada", desc: "+12% de dano em todas as armas.", icon: "⚔", color: "#f87171", apply: (m) => void (m.damage += 0.12) },
  { id: "firerate", name: "Mecanismo Rápido", desc: "+10% de cadência de tiro.", icon: "⟳", color: "#fbbf24", max: 6, apply: (m) => void (m.fireRate += 0.1) },
  { id: "velocity", name: "Canos Longos", desc: "+12% de velocidade e alcance dos projéteis.", icon: "⇒", color: "#a5f3fc", max: 5, apply: (m) => void (m.bulletSpeed += 0.12) },
  { id: "pierce", name: "Ponta Perfurante", desc: "+1 de perfuração em todas as armas.", icon: "◆", color: "#e2e8f0", rare: true, max: 3, apply: (m) => void (m.pierce += 1) },
  { id: "crit", name: "Olho Clínico", desc: "+8% de chance de acerto crítico (2× dano).", icon: "✦", color: "#fb923c", max: 6, apply: (m) => void (m.crit += 0.08) },
  { id: "magnet", name: "Ímã de Sucata", desc: "+1,5 blocos de raio de coleta de materiais.", icon: "◎", color: "#c084fc", max: 4, apply: (m) => void (m.magnet += 1.5) },
  { id: "luck", name: "Sorte do Sucateiro", desc: "+12% de chance de drops extras.", icon: "☘", color: "#34d399", max: 5, apply: (m) => void (m.luck += 0.12) },
  {
    id: "body", name: "Blindagem", desc: "+10% de vida máxima e +60% de dano de colisão.", icon: "⬢", color: "#94a3b8", max: 5,
    apply: (m) => {
      m.bodyDamage += 0.6;
      m.maxHpPct += 0.1;
    },
  },
  { id: "dash", name: "Impulso Rápido", desc: "-18% de recarga do impulso.", icon: "⤳", color: "#67e8f9", max: 3, apply: (m) => void (m.dashCd += 0.18) },
  { id: "lifesteal", name: "Sifão Vital", desc: "Recupera 2% do dano causado como vida.", icon: "☥", color: "#a855f7", rare: true, max: 3, apply: (m) => void (m.lifesteal += 0.02) },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** Sorteia n melhorias distintas ainda disponíveis (raras aparecem com menos frequência). */
export function rollUpgrades(counts: Record<string, number>, n = 3): UpgradeDef[] {
  const pool = UPGRADES.filter((u) => !u.max || (counts[u.id] ?? 0) < u.max);
  const out: UpgradeDef[] = [];
  while (out.length < n && pool.length) {
    const u = weightedPick(pool, (x) => (x.rare ? 0.45 : 1));
    pool.splice(pool.indexOf(u), 1);
    out.push(u);
  }
  return out;
}

export function xpToNext(level: number) {
  return Math.round(45 * Math.pow(1.22, level - 1) + 25 * (level - 1));
}
