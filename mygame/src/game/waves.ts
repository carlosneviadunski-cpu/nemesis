import { ENEMY_BY_ID, ENEMY_DEFS } from "./enemies";
import type { EnemyDef } from "./types";
import { weightedPick } from "./utils";

export interface WaveSpec {
  number: number;
  enemies: EnemyDef[];
  hpMul: number;
  dmgMul: number;
  speedMul: number;
  boss: boolean;
  budget: number;
}

export const BOSS_EVERY = 5;

/** Monta a composição de uma onda com base em um "orçamento" crescente. */
export function buildWave(n: number): WaveSpec {
  const budget = 8 + n * 5 + n * n * 0.15;
  const maxCount = Math.min(7 + n * 2, 42);
  const pool = ENEMY_DEFS.filter((d) => !d.boss && d.minWave <= n);
  const list: EnemyDef[] = [];
  const boss = n % BOSS_EVERY === 0;
  let remaining = budget;

  if (boss) {
    list.push(ENEMY_BY_ID.colossus);
    remaining *= 0.55;
  }

  let guard = 0;
  while (remaining > 0 && list.length < maxCount && guard++ < 200) {
    const affordable = pool.filter((d) => d.cost <= remaining);
    if (!affordable.length) break;
    // Inimigos recém-desbloqueados recebem um bônus de destaque
    const def = weightedPick(affordable, (d) => d.weight * (1 + Math.max(0, 3 - (n - d.minWave)) * 0.5));
    list.push(def);
    remaining -= def.cost;
  }

  // Embaralha os não-chefes para variar a ordem de spawn
  const head = boss ? list.slice(0, 1) : [];
  const rest = boss ? list.slice(1) : list;
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return {
    number: n,
    enemies: [...head, ...rest],
    hpMul: 1 + 0.07 * (n - 1),
    dmgMul: 1 + 0.03 * (n - 1),
    speedMul: 1 + Math.min(0.3, 0.012 * (n - 1)),
    boss,
    budget,
  };
}

/** Pesos de raridade para recompensas de onda, deslocando-se para raridades maiores com o tempo. */
export function rarityWeightsForWave(n: number): Record<string, number> {
  return {
    common: Math.max(10, 60 - n * 2),
    uncommon: 25 + n,
    rare: 8 + n * 1.2,
    epic: 2 + n * 0.6,
    legendary: 0.3 + n * 0.15,
  };
}
