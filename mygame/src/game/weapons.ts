import { EFFECT_META, MATERIALS, RARITY_META } from "./materials";
import type { Archetype, BarrelSpec, EffectKind, Weapon, WeaponEffect, WeaponStatKey, WeaponStats } from "./types";
import { clamp, hashString, mix, mulberry32 } from "./utils";

export const ARCHETYPE_META: Record<
  Archetype,
  { name: string; gender: "m" | "f"; desc: string; mult: Partial<WeaponStats>; add?: Partial<WeaponStats>; recoil: number; burst: number; isBeam: boolean; builtIn?: EffectKind }
> = {
  machinegun: {
    name: "Metralhadora", gender: "f", desc: "Cadência altíssima e dispersão alta. Dano baixo por tiro.",
    mult: { damage: 0.5, rpm: 2.8, spread: 2.6, range: 0.85 }, recoil: 0.3, burst: 1, isBeam: false,
  },
  sniper: {
    name: "Fuzil Sniper", gender: "m", desc: "Projéteis velozes e perfurantes com dano alto. Cadência baixa.",
    mult: { damage: 3.4, rpm: 0.3, spread: 0.15, bulletSpeed: 2.1, range: 1.9 }, add: { pierce: 2 }, recoil: 1.2, burst: 1, isBeam: false,
  },
  shotgun: {
    name: "Espingarda", gender: "f", desc: "Vários projéteis em leque. Devastadora de perto.",
    mult: { damage: 0.75, rpm: 0.55, spread: 4.5, range: 0.5, bulletSpeed: 1.25 }, add: { count: 5 }, recoil: 1.6, burst: 1, isBeam: false,
  },
  rocket: {
    name: "Lança-Foguetes", gender: "m", desc: "Foguetes lentos que explodem em área.",
    mult: { damage: 3.0, rpm: 0.3, bulletSpeed: 0.6, bulletSize: 2.0, range: 1.2, spread: 0.6 }, recoil: 1.4, burst: 1, isBeam: false, builtIn: "explosive",
  },
  laser: {
    name: "Laser", gender: "m", desc: "Feixe instantâneo e contínuo que atravessa inimigos.",
    mult: { damage: 0.28, rpm: 4.0, spread: 0.1, bulletSize: 0.5, range: 1.3 }, add: { pierce: 3 }, recoil: 0.05, burst: 1, isBeam: true,
  },
  multicannon: {
    name: "Canhão Múltiplo", gender: "m", desc: "Canos em leque disparam simultaneamente.",
    mult: { damage: 0.85, rpm: 0.8, spread: 0.8 }, recoil: 0.9, burst: 1, isBeam: false,
  },
  twin: {
    name: "Canhão Gêmeo", gender: "m", desc: "Dois canos alternados dobram a cadência.",
    mult: { damage: 0.85, rpm: 1.7, spread: 1.2 }, recoil: 0.4, burst: 1, isBeam: false,
  },
  burst: {
    name: "Fuzil de Rajada", gender: "m", desc: "Rajadas de 3 tiros rápidos e precisos.",
    mult: { damage: 0.95, rpm: 1.1, spread: 0.7, bulletSpeed: 1.2 }, recoil: 0.5, burst: 3, isBeam: false,
  },
  flak: {
    name: "Canhão Flak", gender: "m", desc: "Projéteis que se fragmentam em estilhaços.",
    mult: { damage: 0.8, rpm: 0.7, bulletSize: 1.5, bulletSpeed: 0.9 }, recoil: 0.8, burst: 1, isBeam: false, builtIn: "fragment",
  },
  cannon: {
    name: "Canhão Pesado", gender: "m", desc: "Projéteis grandes e lentos com dano e empurrão altos.",
    mult: { damage: 1.9, rpm: 0.6, bulletSize: 1.8, bulletSpeed: 0.85, spread: 0.8 }, recoil: 1.0, burst: 1, isBeam: false,
  },
};

export const ARCHETYPE_LIST = Object.keys(ARCHETYPE_META) as Archetype[];
const EFFECT_LIST = Object.keys(EFFECT_META) as EffectKind[];

const BASE_STATS: WeaponStats = {
  damage: 12,
  rpm: 150,
  bulletSpeed: 11,
  spread: 5,
  bulletSize: 0.22,
  pierce: 1,
  range: 12,
  count: 1,
};

const STAT_LIMITS: Record<WeaponStatKey, [number, number]> = {
  damage: [2, 400],
  rpm: [25, 900],
  bulletSpeed: [4, 34],
  spread: [0, 45],
  bulletSize: [0.08, 0.6],
  pierce: [1, 12],
  range: [4, 24],
  count: [1, 12],
};

// ── Layout dos canos (visual dinâmico) ───────────────────────
export function buildBarrels(arch: Archetype, s: WeaponStats): BarrelSpec[] {
  const L = clamp(0.6 + s.bulletSpeed / 28, 0.62, 1.55);
  const W = clamp(s.bulletSize * 2.1, 0.2, 0.72);
  switch (arch) {
    case "machinegun":
      return [{ angle: 0, offset: 0, length: L * 0.92, width: W * 0.85, tipWidth: W * 1.55, style: "trap", group: 0 }];
    case "sniper":
      return [{ angle: 0, offset: 0, length: L * 1.22, width: W * 0.72, style: "sniper", group: 0 }];
    case "shotgun":
      return [{ angle: 0, offset: 0, length: L * 0.78, width: W * 1.25, tipWidth: W * 1.7, style: "shotgun", group: 0 }];
    case "rocket":
      return [{ angle: 0, offset: 0, length: L * 0.98, width: W * 1.0, style: "rocket", group: 0 }];
    case "laser":
      return [{ angle: 0, offset: 0, length: L * 1.05, width: clamp(W * 1.4, 0.3, 0.6), style: "laser", group: 0 }];
    case "multicannon": {
      const n = s.count >= 5 ? 5 : 3;
      const fan = n === 5 ? 0.32 : 0.42;
      const out: BarrelSpec[] = [];
      for (let i = 0; i < n; i++) {
        const k = i - (n - 1) / 2;
        const center = Math.abs(k) < 0.01;
        out.push({ angle: k * fan, offset: 0, length: L * (center ? 1.0 : 0.82), width: W * 0.8, style: "rect", group: 0 });
      }
      return out;
    }
    case "twin":
      return [
        { angle: 0, offset: -0.27, length: L * 0.95, width: W * 0.8, style: "rect", group: 0 },
        { angle: 0, offset: 0.27, length: L * 0.95, width: W * 0.8, style: "rect", group: 1 },
      ];
    case "burst":
      return [{ angle: 0, offset: 0, length: L * 1.05, width: W * 0.82, style: "burst", group: 0 }];
    case "flak":
      return [
        { angle: -0.38, offset: 0, length: L * 0.66, width: W * 0.55, style: "rect", group: 1 },
        { angle: 0.38, offset: 0, length: L * 0.66, width: W * 0.55, style: "rect", group: 1 },
        { angle: 0, offset: 0, length: L * 0.92, width: W * 1.15, tipWidth: W * 1.35, style: "trap", group: 0 },
      ];
    case "cannon":
    default:
      return [{ angle: 0, offset: 0, length: L * 0.96, width: W * 1.25, style: "cannon", group: 0 }];
  }
}

export function computeDps(stats: WeaponStats, arch: Archetype, effects: WeaponEffect[]) {
  const shots = stats.rpm / 60;
  const perShot = stats.damage * (arch === "shotgun" || arch === "multicannon" ? stats.count : 1);
  let dps = perShot * shots;
  dps *= 1 + Math.min(stats.pierce - 1, 4) * 0.08;
  for (const e of effects) {
    if (e.kind === "burn") dps *= 1 + 0.15 * e.power;
    if (e.kind === "explosive") dps *= 1 + 0.25 * e.power;
    if (e.kind === "fragment") dps *= 1 + 0.2 * e.power;
    if (e.kind === "chain") dps *= 1 + 0.2 * e.power;
  }
  return dps;
}

function finalize(stats: WeaponStats, arch: Archetype) {
  for (const k of Object.keys(stats) as WeaponStatKey[]) {
    const [lo, hi] = STAT_LIMITS[k];
    stats[k] = clamp(stats[k], lo, hi);
  }
  stats.pierce = Math.round(stats.pierce);
  stats.count = Math.round(stats.count);
  if (arch === "multicannon") stats.count = stats.count >= 5 ? 5 : 3;
  if (arch === "shotgun") stats.count = clamp(stats.count, 4, 10);
  if (arch === "laser") stats.count = 1;
  if (arch === "sniper" || arch === "rocket") stats.count = Math.min(stats.count, 2);
  stats.damage = Math.round(stats.damage * 10) / 10;
  stats.rpm = Math.round(stats.rpm);
  stats.bulletSpeed = Math.round(stats.bulletSpeed * 10) / 10;
  stats.spread = Math.round(stats.spread * 10) / 10;
  stats.bulletSize = Math.round(stats.bulletSize * 100) / 100;
  stats.range = Math.round(stats.range * 10) / 10;
}

// ── Arma inicial ─────────────────────────────────────────────
export function createDefaultWeapon(): Weapon {
  const stats: WeaponStats = { ...BASE_STATS, damage: 13, rpm: 140, bulletSize: 0.24 };
  const arch: Archetype = "cannon";
  return {
    id: "default",
    name: "Canhão Básico",
    model: "MK-0000",
    archetype: arch,
    tier: 1,
    color: "#60a5fa",
    stats,
    effects: [],
    recipe: [],
    isBeam: false,
    burst: 1,
    barrels: [{ angle: 0, offset: 0, length: 0.95, width: 0.42, style: "rect", group: 0 }],
    dps: computeDps(stats, arch, []),
    recoil: 0.5,
  };
}

// ── Fundição procedural ──────────────────────────────────────
/**
 * Gera uma arma única e determinística a partir de 3–5 materiais.
 * A mesma receita sempre produz a mesma arma (permitindo "descobrir" receitas),
 * e as combinações possíveis ultrapassam facilmente 1.000 variações.
 */
export function forgeWeapon(materialIds: string[]): Weapon {
  const recipe = [...materialIds].sort();
  const mats = recipe.map((id) => MATERIALS[id]).filter(Boolean);
  const n = mats.length;
  const seed = hashString(recipe.join("|"));
  const rng = mulberry32(seed);

  // Potência das matérias-primas
  let power = 0;
  const archScore: Record<string, number> = {};
  const effScore: Record<string, number> = {};
  const stats: WeaponStats = { ...BASE_STATS };

  for (const m of mats) {
    const p = RARITY_META[m.rarity].power;
    power += p;
    for (const [k, v] of Object.entries(m.affinity) as [WeaponStatKey, number][]) {
      stats[k] *= 1 + v * p;
    }
    for (const [a, b] of Object.entries(m.bias)) archScore[a] = (archScore[a] ?? 0) + (b ?? 0) * p;
    if (m.effect) effScore[m.effect] = (effScore[m.effect] ?? 0) + p;
  }

  // Arquétipo: viés dos materiais + ruído determinístico
  let bestArch: Archetype = "cannon";
  let bestScore = -Infinity;
  for (const a of ARCHETYPE_LIST) {
    const sc = (archScore[a] ?? 0) + rng() * 1.6;
    if (sc > bestScore) {
      bestScore = sc;
      bestArch = a;
    }
  }
  const tpl = ARCHETYPE_META[bestArch];
  for (const [k, v] of Object.entries(tpl.mult) as [WeaponStatKey, number][]) stats[k] *= v;
  if (tpl.add) for (const [k, v] of Object.entries(tpl.add) as [WeaponStatKey, number][]) stats[k] += v;

  // Qualidade e tier
  const avg = power / n;
  const quality = avg * (1 + (n - 3) * 0.15);
  const tier = quality < 1.15 ? 1 : quality < 1.45 ? 2 : quality < 1.85 ? 3 : quality < 2.3 ? 4 : 5;
  stats.damage *= 0.85 + quality * 0.4;
  stats.range *= 1 + (quality - 1) * 0.08;

  // Variância determinística leve (±8%)
  for (const k of ["damage", "rpm", "bulletSpeed", "range"] as WeaponStatKey[]) stats[k] *= 0.92 + rng() * 0.16;
  stats.pierce += Math.floor(rng() * (tier >= 4 ? 2 : 1));

  finalize(stats, bestArch);

  // Efeitos especiais
  const effects: WeaponEffect[] = [];
  const sortedEff = EFFECT_LIST.filter((e) => (effScore[e] ?? 0) >= 1.3).sort((a, b) => effScore[b] - effScore[a]);
  for (const e of sortedEff.slice(0, 2)) effects.push({ kind: e, power: clamp(effScore[e] / 1.45, 0.6, 1.6) });
  if (tpl.builtIn && !effects.some((e) => e.kind === tpl.builtIn)) effects.push({ kind: tpl.builtIn, power: 0.8 });

  // Material dominante → epíteto e cor
  const dominant = [...mats].sort((a, b) => {
    const d = RARITY_META[b.rarity].order - RARITY_META[a.rarity].order;
    if (d !== 0) return d;
    return recipe.filter((id) => id === b.id).length - recipe.filter((id) => id === a.id).length;
  })[0];
  const secondary = mats.find((m) => m.id !== dominant.id) ?? dominant;
  const color = mix(dominant.color, secondary.color, 0.3);

  const g = tpl.gender;
  const effEp = effects.find((e) => e.kind !== tpl.builtIn);
  let name = `${tpl.name} ${dominant.epithet[g]}`;
  if (effEp) name += ` ${EFFECT_META[effEp.kind].epithet[g]}`;

  const model = `MK-${seed.toString(16).toUpperCase().padStart(8, "0").slice(0, 4)}`;

  return {
    id: `${seed.toString(36)}-${recipe.join(".")}`,
    name,
    model,
    archetype: bestArch,
    tier,
    color,
    stats,
    effects,
    recipe,
    isBeam: tpl.isBeam,
    burst: tpl.burst,
    barrels: buildBarrels(bestArch, stats),
    dps: computeDps(stats, bestArch, effects),
    recoil: tpl.recoil,
  };
}
